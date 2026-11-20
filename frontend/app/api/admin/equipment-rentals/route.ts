import { NextResponse } from 'next/server';
import { actorFromSession, logAudit, rpAudit } from '@/lib/audit-log';
import { archiveMessage, archiveRentals } from '@/lib/archive';
import { notifyRentalStatus } from '@/lib/user-notifications';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCache, delCachePattern } from '@/lib/redis';
import {
  RENTAL_INCLUDE,
  RENTAL_TRANSITIONS,
  RentalConflictError,
  assertAvailability,
  expireOverdueRentals,
  getPendingConflicts,
  toRentalDTO,
  type EquipmentRentalStatus,
} from '@/lib/equipment-rentals';
import { computePaymentDeadline, toDateOnly, todayWita, type PaymentDeadlineMode } from '@/lib/rental-schedule';
import { hitungDenda, hitungDp, hitungHariTerlambat } from '@/lib/rental-policy';

export const dynamic = 'force-dynamic';

const STATUS_LIST: EquipmentRentalStatus[] = [
  'MENUNGGU_PERSETUJUAN_ADMIN',
  'DISETUJUI',
  'DIKONFIRMASI',
  'SIAP_DIAMBIL',
  'SEDANG_DISEWA',
  'SELESAI',
  'DITOLAK',
  'DIBATALKAN',
  'KADALUARSA',
];
const DEADLINE_MODES: PaymentDeadlineMode[] = ['H_MINUS_1', 'HARI_H', 'DUA_JAM', 'CUSTOM'];

async function checkIsAdmin(session: any): Promise<boolean> {
  if (session?.user?.role === 'ADMIN') return true;
  if (!session?.user?.email) return false;
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  } catch {
    return false;
  }
}

async function invalidateRentalCaches() {
  await Promise.all([
    delCache('equipments:list:public'),
    delCachePattern('user:rentals:*'),
    delCachePattern('equipments:*'),
  ]).catch(() => {});
}

// GET: Semua pengajuan sewa alat untuk admin
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!(await checkIsAdmin(session))) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    if ((await expireOverdueRentals()) > 0) await invalidateRentalCaches();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') as EquipmentRentalStatus | 'ALL' | null;
    const q = searchParams.get('q')?.trim();
    const showArchived = searchParams.get('archived') === 'true';

    const where: Prisma.EquipmentRentalWhereInput = {
      // Arsip disembunyikan dari daftar admin kecuali diminta
      archivedAt: showArchived ? { not: null } : null,
      ...(statusParam && statusParam !== 'ALL' && STATUS_LIST.includes(statusParam)
        ? { status: statusParam }
        : {}),
      ...(q
        ? {
            OR: [
              { rentalCode: { contains: q, mode: 'insensitive' } },
              { userName: { contains: q, mode: 'insensitive' } },
              { userEmail: { contains: q, mode: 'insensitive' } },
              { lokasiLahan: { contains: q, mode: 'insensitive' } },
              { items: { some: { nama: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const rows = await prisma.equipmentRental.findMany({
      where,
      include: RENTAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    // Peringatan bentrok jadwal untuk pengajuan yang masih menunggu persetujuan
    const rentals = rows.map(toRentalDTO);
    const conflicts = await getPendingConflicts(rentals);
    for (const r of rentals) r.conflict = conflicts[r.id] || null;

    return NextResponse.json({ success: true, rentals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat data sewa alat' }, { status: 500 });
  }
}

// PATCH: Admin mengubah status pengajuan sewa / mencatat transaksi kasir
//
// Alur: MENUNGGU_PERSETUJUAN_ADMIN -> DISETUJUI (bayar DP sampai batas) -> DIKONFIRMASI (DP lunas)
//       -> SEDANG_DISEWA (serah terima: pelunasan + cek kondisi) -> SELESAI (pengembalian: cek kondisi + denda)
// Aksi tanpa ganti status: { action: 'DP_REFUNDED' } menandai DP sudah dikembalikan tunai.
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!(await checkIsAdmin(session))) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      action,
      isPaid,
      rejectedReason,
      paymentDeadline,
      deadlineMode,
      cashierNotes,
      inspection,
      damageFee,
      damageNotes,
    } = body;
    const status = body.status as EquipmentRentalStatus | undefined;

    await expireOverdueRentals();

    const current = id
      ? await prisma.equipmentRental.findFirst({
          where: { OR: [{ id }, { rentalCode: id }] },
          include: RENTAL_INCLUDE,
        })
      : null;
    if (!current) {
      return NextResponse.json({ error: 'Data pengajuan sewa tidak ditemukan' }, { status: 404 });
    }

    const cashier = session?.user?.name || 'Kasir Koperasi';
    const now = new Date();

    // Aksi: DP sudah dikembalikan ke penyewa (setelah pembatalan yang berhak refund)
    if (action === 'DP_REFUNDED') {
      if (!current.dpPaidAt || current.dpForfeited || current.dpRefundedAt) {
        return NextResponse.json({ error: 'Tidak ada DP yang perlu dikembalikan untuk sewa ini.' }, { status: 400 });
      }
      if (!['DIBATALKAN', 'DITOLAK'].includes(current.status)) {
        return NextResponse.json({ error: 'DP hanya dikembalikan untuk sewa yang dibatalkan.' }, { status: 400 });
      }
      const updated = await prisma.equipmentRental.update({
        where: { id: current.id },
        data: { dpRefundedAt: now, cashierNotes: `DP dikembalikan tunai oleh ${cashier}` },
        include: RENTAL_INCLUDE,
      });
      await invalidateRentalCaches();
      const refundedDto = toRentalDTO(updated);
      notifyRentalStatus(refundedDto, { dpRefunded: true });
      await logAudit({
        actor: actorFromSession(session),
        action: 'RENTAL_DP_REFUND',
        entityType: 'RENTAL',
        entityId: refundedDto.id,
        entityLabel: `#${refundedDto.rentalCode}`,
        summary: `Menandai DP ${rpAudit(refundedDto.dpAmount)} sewa #${refundedDto.rentalCode} sudah dikembalikan ke ${refundedDto.userName}`,
      });
      return NextResponse.json({ success: true, rental: refundedDto, message: 'DP ditandai sudah dikembalikan.' });
    }

    if (!status || !STATUS_LIST.includes(status)) {
      return NextResponse.json({ error: 'Status yang valid wajib disertakan' }, { status: 400 });
    }

    const from = current.status as EquipmentRentalStatus;
    const to = status;
    if (from !== to && !RENTAL_TRANSITIONS[from].includes(to)) {
      const reason =
        from === 'KADALUARSA'
          ? 'Pengajuan sudah kadaluarsa karena melewati batas bayar DP. Buka kembali pengajuan lalu setujui ulang.'
          : `Status tidak bisa diubah dari ${from} ke ${to}.`;
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    const total = Number(current.totalEstimasi);
    const data: Prisma.EquipmentRentalUpdateInput = { status: to };
    let inspectionType: 'SERAH_TERIMA' | 'PENGEMBALIAN' | null = null;

    if (to === 'DISETUJUI' && from !== 'DISETUJUI') {
      // Batas bayar DP mengikuti TANGGAL SEWA (default H-1 pukul 16:30 WITA)
      const mode: PaymentDeadlineMode = DEADLINE_MODES.includes(deadlineMode)
        ? deadlineMode
        : paymentDeadline
        ? 'CUSTOM'
        : 'H_MINUS_1';
      data.approvedAt = now;
      data.paymentDeadline = computePaymentDeadline(toDateOnly(current.startDate), mode, paymentDeadline, now);
      data.dpAmount = hitungDp(total);
      data.rejectedReason = null;
    }

    if (to === 'DIKONFIRMASI') {
      // Kasir menerima DP tunai
      data.dpAmount = current.dpAmount ?? hitungDp(total);
      data.dpPaidAt = now;
      data.cashierName = cashier;
    }

    if (to === 'SIAP_DIAMBIL') {
      // Kasir menerima pelunasan penuh sebelum hari H
      data.isPaid = true;
      data.paidAt = current.paidAt || now;
      data.cashierName = cashier;
    }

    if (to === 'SEDANG_DISEWA') {
      // Serah terima: lunasi sisa + catat kondisi unit
      if (!inspection?.kondisi) {
        return NextResponse.json({ error: 'Isi kondisi unit saat serah terima.' }, { status: 400 });
      }
      data.isPaid = true;
      data.paidAt = current.paidAt || now;
      data.cashierName = current.cashierName || cashier;
      data.pickedUpAt = now;
      inspectionType = 'SERAH_TERIMA';
    }

    if (to === 'SELESAI') {
      // Pengembalian: cek kondisi, hitung denda keterlambatan, catat biaya kerusakan
      if (!inspection?.kondisi) {
        return NextResponse.json({ error: 'Isi kondisi unit saat pengembalian.' }, { status: 400 });
      }
      const totalUnits = current.items.reduce((sum, it) => sum + it.jumlahUnit, 0);
      const lateDays = hitungHariTerlambat(toDateOnly(current.endDate), todayWita(now));
      data.returnedAt = now;
      data.lateDays = lateDays;
      data.lateFee = hitungDenda(lateDays, totalUnits);
      data.damageFee = Math.max(0, Number(damageFee) || 0);
      data.damageNotes = damageNotes ? String(damageNotes) : null;
      data.isPaid = true;
      inspectionType = 'PENGEMBALIAN';
    }

    if ((to === 'DIBATALKAN' || to === 'DITOLAK') && current.dpPaidAt) {
      // Dibatalkan/ditolak oleh koperasi: DP penyewa dikembalikan penuh
      data.dpForfeited = false;
    }

    if (to === 'MENUNGGU_PERSETUJUAN_ADMIN') {
      data.approvedAt = null;
      data.paymentDeadline = null;
      data.rejectedReason = null;
    }

    if (isPaid !== undefined && to !== 'DITOLAK' && to !== 'DIBATALKAN') {
      data.isPaid = Boolean(isPaid);
      data.paidAt = isPaid ? current.paidAt || now : null;
      if (isPaid && !current.cashierName) data.cashierName = cashier;
    }
    if (cashierNotes) data.cashierNotes = String(cashierNotes);
    if (rejectedReason) data.rejectedReason = String(rejectedReason);

    // Menyetujui = mengunci unit pada tanggal sewa -> cek bentrok jadwal di dalam transaksi
    const locksUnits = to === 'DISETUJUI' && from !== to;
    const updated = await prisma.$transaction(async (tx) => {
      if (locksUnits) {
        await assertAvailability(
          tx,
          current.items.map((it) => ({
            equipmentId: it.equipmentId,
            nama: it.nama,
            jumlahUnit: it.jumlahUnit,
            startDate: toDateOnly(it.startDate),
            endDate: toDateOnly(it.endDate),
          })),
          current.id
        );
      }
      if (inspectionType) {
        await tx.equipmentRentalInspection.create({
          data: {
            rentalId: current.id,
            type: inspectionType,
            kondisi: String(inspection.kondisi),
            jamMesin:
              inspection.jamMesin !== undefined && inspection.jamMesin !== '' && !isNaN(Number(inspection.jamMesin))
                ? Number(inspection.jamMesin)
                : null,
            bbmLevel: inspection.bbmLevel ? String(inspection.bbmLevel) : null,
            catatan: inspection.catatan ? String(inspection.catatan) : null,
            fotoUrls: Array.isArray(inspection.fotoUrls) ? inspection.fotoUrls.map(String).slice(0, 6) : [],
            petugas: cashier,
          },
        });
      }
      return tx.equipmentRental.update({ where: { id: current.id }, data, include: RENTAL_INCLUDE });
    });

    await invalidateRentalCaches();

    const dto = toRentalDTO(updated);
    // Beri tahu penyewa tentang perubahan status + catat di log aktivitas
    if (to !== current.status) {
      notifyRentalStatus(dto);
      await logAudit({
        actor: actorFromSession(session),
        action: 'RENTAL_STATUS',
        entityType: 'RENTAL',
        entityId: dto.id,
        entityLabel: `#${dto.rentalCode}`,
        summary: `Status sewa #${dto.rentalCode} (${dto.userName}): ${current.status} → ${to}`,
        details: {
          from: current.status,
          to,
          dpAmount: dto.dpAmount ?? null,
          totalEstimasi: dto.totalEstimasi,
          lateFee: dto.lateFee ?? 0,
          damageFee: dto.damageFee ?? 0,
          reason: dto.rejectedReason ?? null,
        },
      });
    }
    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const message =
      to === 'DISETUJUI'
        ? `Pengajuan #${dto.rentalCode} disetujui. DP ${rp(dto.dpAmount || 0)} dibayar paling lambat ${new Date(
            dto.paymentDeadline!
          ).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA.`
        : to === 'DIKONFIRMASI'
        ? `DP ${rp(dto.dpAmount || 0)} diterima. Jadwal #${dto.rentalCode} terkunci.`
        : to === 'SIAP_DIAMBIL'
        ? `Pelunasan #${dto.rentalCode} diterima. Unit siap diambil pada ${dto.startDate}.`
        : to === 'SEDANG_DISEWA'
        ? `Unit #${dto.rentalCode} diserahkan ke penyewa.`
        : to === 'SELESAI'
        ? `Unit #${dto.rentalCode} kembali.${
            (dto.lateFee || 0) + (dto.damageFee || 0) > 0
              ? ` Biaya tambahan ${rp((dto.lateFee || 0) + (dto.damageFee || 0))} (denda ${dto.lateDays} hari: ${rp(dto.lateFee || 0)}, kerusakan: ${rp(dto.damageFee || 0)}).`
              : ''
          }`
        : `Status pengajuan sewa #${dto.rentalCode} berhasil diubah menjadi ${to}.`;

    return NextResponse.json({ success: true, rental: dto, message });
  } catch (error: any) {
    if (error instanceof RentalConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Gagal memperbarui status sewa' }, { status: 500 });
  }
}

// DELETE: Hapus data sewa alat (tunggal atau banyak)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!(await checkIsAdmin(session))) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { rentalIds, id } = await request.json();
    const idsToDelete: string[] = Array.isArray(rentalIds) ? rentalIds : id ? [id] : [];
    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Daftar ID sewa alat tidak boleh kosong' }, { status: 400 });
    }

    // Tidak pernah hapus permanen: arsipkan (hanya sewa yang sudah final)
    const matched = await prisma.equipmentRental.findMany({
      where: { OR: [{ id: { in: idsToDelete } }, { rentalCode: { in: idsToDelete } }] },
      select: { id: true },
    });
    if (matched.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data pengajuan sewa yang cocok' }, { status: 404 });
    }
    const result = await archiveRentals(matched.map((m) => m.id), actorFromSession(session));
    await invalidateRentalCaches();

    if (result.archived.length === 0) {
      return NextResponse.json({ error: archiveMessage('sewa', result), ...result }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: archiveMessage('sewa', result), ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus data sewa alat' }, { status: 500 });
  }
}
