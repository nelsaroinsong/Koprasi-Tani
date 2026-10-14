import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  readEquipmentRentals,
  writeEquipmentRentals,
  type EquipmentRentalOrder,
  type EquipmentRentalStatus,
} from '@/lib/equipment-rentals';

export const dynamic = 'force-dynamic';

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

// GET: Ambil semua pengajuan sewa alat untuk Admin
export async function GET(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const q = searchParams.get('q')?.toLowerCase().trim();

    let rentals = readEquipmentRentals();

    if (statusParam && statusParam !== 'ALL') {
      rentals = rentals.filter((r) => r.status === statusParam);
    }

    if (q) {
      rentals = rentals.filter(
        (r) =>
          r.rentalCode.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q) ||
          r.userEmail.toLowerCase().includes(q) ||
          (r.lokasiLahan && r.lokasiLahan.toLowerCase().includes(q)) ||
          r.items.some((it) => it.nama.toLowerCase().includes(q))
      );
    }

    rentals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      rentals,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat data sewa alat' }, { status: 500 });
  }
}

// PATCH: Admin menyetujui (Approve), mengubah status, atau menolak sewa alat
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, isPaid, rejectedReason } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status wajib disertakan' }, { status: 400 });
    }

    const rentals = readEquipmentRentals();
    const targetIdx = rentals.findIndex((r) => r.id === id || r.rentalCode === id);

    if (targetIdx === -1) {
      return NextResponse.json({ error: 'Data pengajuan sewa tidak ditemukan' }, { status: 404 });
    }

    const updated = { ...rentals[targetIdx] };
    updated.status = status as EquipmentRentalStatus;
    updated.updatedAt = new Date().toISOString();

    if (status === 'DISETUJUI') {
      updated.approvedAt = new Date().toISOString();
    }
    if (isPaid !== undefined) {
      updated.isPaid = Boolean(isPaid);
    }
    if (rejectedReason) {
      updated.rejectedReason = rejectedReason;
    }

    rentals[targetIdx] = updated;
    writeEquipmentRentals(rentals);

    // Hapus cache katalog sewa alat agar ketersediaan stok langsung sinkron
    try {
      const { delCache } = await import('@/lib/redis');
      await delCache('equipments:list:public');
    } catch {}

    return NextResponse.json({
      success: true,
      rental: updated,
      message: `Status pengajuan sewa #${updated.rentalCode} berhasil diubah menjadi ${status}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui status sewa' }, { status: 500 });
  }
}
