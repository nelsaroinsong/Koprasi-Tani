import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';
import { RentalConflictError, assertAvailability } from '@/lib/equipment-rentals';
import { parseDateOnly, toDateOnly, todayWita } from '@/lib/rental-schedule';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  if ((session.user as any).role === 'ADMIN') return session;
  const u = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { role: true },
  });
  return u?.role === 'ADMIN' ? session : null;
}

function toDTO(m: any) {
  return {
    id: m.id,
    equipmentId: m.equipmentId,
    startDate: toDateOnly(m.startDate),
    endDate: toDateOnly(m.endDate),
    jumlahUnit: m.jumlahUnit,
    alasan: m.alasan,
    createdBy: m.createdBy,
    createdAt: m.createdAt.toISOString(),
  };
}

// GET ?equipmentId= : jadwal servis yang belum lewat
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
  }
  const equipmentId = new URL(request.url).searchParams.get('equipmentId');
  const rows = await prisma.equipmentMaintenance.findMany({
    where: {
      ...(equipmentId ? { equipmentId } : {}),
      endDate: { gte: parseDateOnly(todayWita())! },
    },
    orderBy: { startDate: 'asc' },
  });
  return NextResponse.json({ success: true, maintenance: rows.map(toDTO) });
}

// POST: blokir jadwal unit untuk servis
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
  }
  try {
    const { equipmentId, startDate, endDate, jumlahUnit, alasan } = await request.json();
    const start = String(startDate || '');
    const end = String(endDate || startDate || '');
    if (!equipmentId || !parseDateOnly(start) || !parseDateOnly(end)) {
      return NextResponse.json({ error: 'Alat dan tanggal servis wajib diisi' }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json({ error: 'Tanggal selesai servis tidak boleh sebelum tanggal mulai' }, { status: 400 });
    }
    if (start < todayWita()) {
      return NextResponse.json({ error: 'Tanggal servis tidak boleh di masa lalu' }, { status: 400 });
    }
    if (!alasan || !String(alasan).trim()) {
      return NextResponse.json({ error: 'Alasan servis wajib diisi' }, { status: 400 });
    }

    const eq = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { nama: true, stokUnit: true } });
    if (!eq) return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 });
    const units = Math.min(eq.stokUnit, Math.max(1, Math.floor(Number(jumlahUnit) || 1)));

    // Servis tidak boleh mengambil unit yang sudah terkunci untuk penyewa
    const created = await prisma.$transaction(async (tx) => {
      await assertAvailability(
        tx,
        [{ equipmentId, nama: eq.nama, jumlahUnit: units, startDate: start, endDate: end }],
        undefined,
        { withJeda: false }
      );
      return tx.equipmentMaintenance.create({
        data: {
          equipmentId,
          startDate: parseDateOnly(start)!,
          endDate: parseDateOnly(end)!,
          jumlahUnit: units,
          alasan: String(alasan).trim(),
          createdBy: session.user?.name || 'Admin',
        },
      });
    });

    await delCachePattern('equipments:*').catch(() => {});
    return NextResponse.json({ success: true, maintenance: toDTO(created), message: 'Jadwal servis disimpan.' });
  } catch (error: any) {
    if (error instanceof RentalConflictError) {
      return NextResponse.json(
        { error: `Tidak bisa memblokir jadwal servis: ${error.message.replace(' Pilih tanggal lain atau kurangi jumlah unit.', '')}. Jadwalkan ulang servis atau sewa tersebut.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan jadwal servis' }, { status: 500 });
  }
}

// DELETE ?id= : hapus jadwal servis
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID jadwal servis wajib disertakan' }, { status: 400 });
  await prisma.equipmentMaintenance.deleteMany({ where: { id } });
  await delCachePattern('equipments:*').catch(() => {});
  return NextResponse.json({ success: true, message: 'Jadwal servis dihapus.' });
}
