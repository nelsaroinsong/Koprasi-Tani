import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCachePattern } from '@/lib/redis';
import {
  RENTAL_INCLUDE,
  RentalConflictError,
  assertAvailability,
  expireOverdueRentals,
  toRentalDTO,
} from '@/lib/equipment-rentals';
import {
  addDays,
  computePaymentDeadline,
  itemDateRange,
  parseDateOnly,
  toDateOnly,
  todayWita,
} from '@/lib/rental-schedule';
import { validateMinahasaUtaraAddress } from '@/lib/address-validation';
import { BATAS_BATAL_HARI, DENDA_PER_HARI, DP_PERSEN, dpDikembalikanJikaBatal, hitungDp } from '@/lib/rental-policy';

export const dynamic = 'force-dynamic';

/** Pemesanan paling jauh 90 hari ke depan */
const MAX_ADVANCE_DAYS = 90;

function formatWita(d: Date): string {
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// GET: Riwayat pengajuan sewa alat milik pengguna saat ini
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();
    const cacheKey = `user:rentals:${email}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    if ((await expireOverdueRentals()) > 0) {
      await delCachePattern('equipments:*').catch(() => {});
    }

    const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const rows = dbUser
      ? await prisma.equipmentRental.findMany({
          where: { userId: dbUser.id },
          include: RENTAL_INCLUDE,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const responsePayload = { success: true, rentals: rows.map(toRentalDTO) };
    await setCache(cacheKey, responsePayload, 60);
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error fetching user rentals:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat daftar pengajuan sewa' },
      { status: 500 }
    );
  }
}

// POST: Buat pengajuan sewa alat baru (status MENUNGGU_PERSETUJUAN_ADMIN)
export async function POST(request: Request) {
  try {
    const session = await auth();
    // Batasi frekuensi request (anti spam / tebak-tebakan)
    const limited = await enforceRateLimit(request, RATE_LIMITS.rentalRequest, session?.user?.email);
    if (limited) return limited;
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk mengajukan sewa alat' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
      select: { id: true, name: true, phone: true, role: true, email: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'Akun pengguna tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const {
      startDate,
      lokasiLahan,
      farmLocationGps,
      catatan,
      items,
      // Payload lama (satu alat)
      equipmentId,
      durasi = 1,
      jumlahUnit = 1,
      includeOperator = false,
    } = body;

    // 1. Validasi tanggal mulai: tidak boleh lampau, maksimal 90 hari ke depan
    const today = todayWita();
    if (!startDate || !parseDateOnly(String(startDate))) {
      return NextResponse.json({ error: 'Tentukan tanggal mulai pemakaian sewa alat' }, { status: 400 });
    }
    if (startDate < today) {
      return NextResponse.json(
        { error: 'Tanggal mulai sewa tidak boleh sebelum hari ini.' },
        { status: 400 }
      );
    }
    if (startDate > addDays(today, MAX_ADVANCE_DAYS)) {
      return NextResponse.json(
        { error: `Pemesanan sewa paling jauh ${MAX_ADVANCE_DAYS} hari ke depan.` },
        { status: 400 }
      );
    }

    const addressValidation = validateMinahasaUtaraAddress(lokasiLahan, true);
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: addressValidation.error }, { status: 400 });
    }

    // 2. Normalisasi daftar alat yang diminta
    const rawItems: any[] =
      Array.isArray(items) && items.length > 0
        ? items
        : equipmentId
        ? [{ equipmentId, durasi, jumlahUnit, includeOperator }]
        : [];

    const ids = [...new Set(rawItems.map((it) => String(it.equipmentId || it.id)))];
    const equipments = await prisma.equipment.findMany({ where: { id: { in: ids } } });
    const eqMap = new Map(equipments.map((e) => [e.id, e]));

    const processedItems = rawItems
      .map((it) => {
        const eq = eqMap.get(String(it.equipmentId || it.id));
        if (!eq) return null;
        const dur = Math.max(1, Math.floor(Number(it.durasi) || 1));
        const qty = Math.max(1, Math.floor(Number(it.jumlahUnit) || 1));
        const withOp = Boolean(it.includeOperator);
        const harga = Number(eq.hargaSewa);
        const biayaOp = eq.biayaOperator !== null ? Number(eq.biayaOperator) : null;
        const range = itemDateRange(startDate, eq.satuanSewa, dur);
        return {
          equipmentId: eq.id,
          nama: eq.nama,
          kategori: eq.kategori,
          hargaSewa: harga,
          satuanSewa: eq.satuanSewa,
          jumlahUnit: qty,
          durasi: dur,
          includeOperator: withOp,
          biayaOperator: biayaOp,
          subtotal: harga * dur * qty + (withOp && biayaOp ? biayaOp * dur * qty : 0),
          imageUrl: eq.imageUrl,
          ...range,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (processedItems.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal satu unit alat pertanian yang tersedia' },
        { status: 400 }
      );
    }

    const totalEstimasi = processedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    const endDate = processedItems.reduce((m, it) => (it.endDate > m ? it.endDate : m), startDate);
    const rentalCode = `SEWA-${Date.now().toString(36).toUpperCase()}`;

    // 3. Cek jadwal: unit harus cukup pada SETIAP tanggal pemakaian.
    //    Pengajuan ini sendiri belum mengunci unit sampai disetujui admin.
    await expireOverdueRentals();
    const created = await prisma.$transaction(async (tx) => {
      await assertAvailability(tx, processedItems);
      return tx.equipmentRental.create({
        data: {
          rentalCode,
          userId: dbUser.id,
          userName: dbUser.name || session.user?.name || 'Anggota Koperasi',
          userEmail: dbUser.email,
          userPhone: dbUser.phone || '',
          userRole: dbUser.role,
          status: 'MENUNGGU_PERSETUJUAN_ADMIN',
          startDate: parseDateOnly(startDate)!,
          endDate: parseDateOnly(endDate)!,
          lokasiLahan: lokasiLahan || '',
          farmLat: typeof farmLocationGps?.lat === 'number' ? farmLocationGps.lat : null,
          farmLng: typeof farmLocationGps?.lng === 'number' ? farmLocationGps.lng : null,
          catatan: catatan || '',
          totalEstimasi,
          paymentMethod: 'CASH_KOPERASI',
          items: {
            create: processedItems.map((it) => ({
              equipmentId: it.equipmentId,
              nama: it.nama,
              kategori: it.kategori,
              hargaSewa: it.hargaSewa,
              satuanSewa: it.satuanSewa,
              jumlahUnit: it.jumlahUnit,
              durasi: it.durasi,
              includeOperator: it.includeOperator,
              biayaOperator: it.biayaOperator,
              subtotal: it.subtotal,
              imageUrl: it.imageUrl,
              startDate: parseDateOnly(it.startDate)!,
              endDate: parseDateOnly(it.endDate)!,
            })),
          },
        },
        include: RENTAL_INCLUDE,
      });
    });
    const newRentalOrder = toRentalDTO(created);

    // 4. Pesan WhatsApp ke PJ koperasi
    const pjContact = equipments.find((it) => it.kontakPj)?.kontakPj || '081944078924';
    const cleanPhone = pjContact.replace(/\D/g, '').replace(/^0/, '62');
    const estimatedDeadline = computePaymentDeadline(startDate, 'H_MINUS_1');

    const itemLines = processedItems
      .map((it, idx) => {
        const opInfo = it.includeOperator
          ? `+ Operator Koperasi (Rp ${Number(it.biayaOperator || 0).toLocaleString('id-ID')}/${it.satuanSewa})`
          : 'Operator Mandiri';
        return `${idx + 1}. *${it.nama}*
   • Jumlah: ${it.jumlahUnit} unit
   • Durasi: ${it.durasi} ${it.satuanSewa} (${it.startDate} s/d ${it.endDate})
   • Tarif: Rp ${it.hargaSewa.toLocaleString('id-ID')}/${it.satuanSewa}
   • Layanan Operator: ${opInfo}
   • Subtotal: Rp ${it.subtotal.toLocaleString('id-ID')}`;
      })
      .join('\n\n');

    const waMessage = `Halo Pengurus/PJ Sewa Alat Koperasi Sinar Pagi Sejahtera,
Saya telah membuat *Pengajuan Sewa Alat Pertanian* melalui website koperasi:

*No. Pengajuan:* #${rentalCode}
*Status:* ⏳ Menunggu Persetujuan Admin Koperasi
*Nama Pemohon:* ${newRentalOrder.userName}
*Email:* ${newRentalOrder.userEmail}
*No. HP:* ${newRentalOrder.userPhone || '-'}
*Jadwal Pemakaian:* ${startDate} s/d ${endDate}
*Lokasi Lahan Kebun:* ${lokasiLahan || '-'}
*Catatan Tambahan:* ${catatan || '-'}

📋 *Daftar Alat yang Diajukan (${processedItems.length} jenis alat):*
${itemLines}

💰 *TOTAL ESTIMASI TAGIHAN:* Rp ${totalEstimasi.toLocaleString('id-ID')}
*Metode Pembayaran:* Tunai di Kasir Kantor Koperasi (Kolongan)
*Pembayaran (tunai di kasir):*
• DP ${DP_PERSEN}%: Rp ${hitungDp(totalEstimasi).toLocaleString('id-ID')} paling lambat ${formatWita(estimatedDeadline)} WITA setelah disetujui, untuk mengunci jadwal
• Sisa Rp ${(totalEstimasi - hitungDp(totalEstimasi)).toLocaleString('id-ID')} dilunasi saat mengambil alat
• Batal paling lambat H-${BATAS_BATAL_HARI}: DP kembali penuh
• Denda keterlambatan Rp ${DENDA_PER_HARI.toLocaleString('id-ID')}/unit/hari
Terima kasih.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    await Promise.all([delCachePattern('user:rentals:*'), delCachePattern('equipments:*')]).catch(() => {});

    return NextResponse.json({
      success: true,
      rentalCode,
      rentalOrder: newRentalOrder,
      totalEstimasi,
      itemsCount: processedItems.length,
      waUrl,
      message: 'Pengajuan sewa alat berhasil dikirim dan menunggu persetujuan admin koperasi.',
    });
  } catch (error: any) {
    if (error instanceof RentalConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error saat pengajuan sewa alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses pengajuan sewa alat' },
      { status: 500 }
    );
  }
}

// PATCH: Batalkan pengajuan sewa oleh pengguna
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const { rentalId, action, alasanBatal } = await request.json();
    if (action !== 'CANCEL') {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
      select: { id: true },
    });
    const rental = dbUser
      ? await prisma.equipmentRental.findFirst({
          where: { userId: dbUser.id, OR: [{ id: rentalId }, { rentalCode: rentalId }] },
        })
      : null;

    if (!rental) {
      return NextResponse.json({ error: 'Pengajuan sewa tidak ditemukan' }, { status: 404 });
    }

    // Boleh batal sebelum alat diserahkan & selama belum lunas penuh
    const cancellable =
      rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' ||
      rental.status === 'DIKONFIRMASI' ||
      (rental.status === 'DISETUJUI' && !rental.isPaid);
    if (!cancellable) {
      return NextResponse.json(
        {
          error:
            'Pengajuan sewa tidak dapat dibatalkan karena sudah lunas atau sedang berjalan. Hubungi pengurus koperasi.',
        },
        { status: 400 }
      );
    }

    // Aturan DP: batal paling lambat H-2 -> DP kembali penuh; lebih mepet -> DP hangus
    const dpPaid = Boolean(rental.dpPaidAt);
    const refundable = dpPaid && dpDikembalikanJikaBatal(toDateOnly(rental.startDate));
    const reason = alasanBatal ? `(Dibatalkan pemohon: ${alasanBatal})` : '(Dibatalkan oleh pemohon)';
    const updated = await prisma.equipmentRental.update({
      where: { id: rental.id },
      data: {
        status: 'DIBATALKAN',
        catatan: rental.catatan ? `${rental.catatan} ${reason}` : reason,
        dpForfeited: dpPaid && !refundable,
      },
      include: RENTAL_INCLUDE,
    });

    await Promise.all([delCachePattern('user:rentals:*'), delCachePattern('equipments:*')]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: !dpPaid
        ? 'Pengajuan sewa alat berhasil dibatalkan.'
        : refundable
        ? 'Sewa dibatalkan. DP Anda akan dikembalikan penuh, silakan ambil di kasir koperasi.'
        : `Sewa dibatalkan. Karena kurang dari H-${BATAS_BATAL_HARI}, DP tidak dapat dikembalikan.`,
      rental: toRentalDTO(updated),
    });
  } catch (err: any) {
    console.error('Error canceling rental:', err);
    return NextResponse.json(
      { error: err?.message || 'Gagal membatalkan pengajuan sewa' },
      { status: 500 }
    );
  }
}
