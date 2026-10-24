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

    const currentRental = rentals[targetIdx];

    // Guard: status final (SELESAI, DITOLAK, DIBATALKAN) tidak boleh diubah lagi
    if (currentRental.status === 'SELESAI') {
      return NextResponse.json(
        { error: 'Sewa alat telah selesai dan unit telah dikembalikan. Status tidak dapat diubah lagi.' },
        { status: 400 }
      );
    }
    if (currentRental.status === 'DITOLAK' || currentRental.status === 'DIBATALKAN') {
      return NextResponse.json(
        { error: 'Pengajuan sewa telah ditolak/dibatalkan. Status tidak dapat diubah lagi.' },
        { status: 400 }
      );
    }

    const updated = { ...currentRental };
    updated.status = status as EquipmentRentalStatus;
    updated.updatedAt = new Date().toISOString();

    if (status === 'DISETUJUI') {
      updated.approvedAt = new Date().toISOString();
    }
    if (status === 'SELESAI') {
      updated.isPaid = true;
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

// DELETE: Hapus banyak data sewa alat sekaligus (Bulk Delete) atau hapus tunggal
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { rentalIds, id } = body;

    const idsToDelete: string[] = Array.isArray(rentalIds)
      ? rentalIds
      : id
      ? [id]
      : [];

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Daftar ID sewa alat tidak boleh kosong' },
        { status: 400 }
      );
    }

    const rentals = readEquipmentRentals();
    const initialCount = rentals.length;
    const remainingRentals = rentals.filter(
      (r) => !idsToDelete.includes(r.id) && !idsToDelete.includes(r.rentalCode)
    );
    const deletedCount = initialCount - remainingRentals.length;

    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data pengajuan sewa yang cocok untuk dihapus' },
        { status: 404 }
      );
    }

    writeEquipmentRentals(remainingRentals);

    // Invalidate Redis caches
    try {
      const { delCache } = await import('@/lib/redis');
      await delCache('equipments:list:public');
    } catch {}

    return NextResponse.json({
      success: true,
      message: `${deletedCount} data sewa alat berhasil dihapus dari sistem.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus data sewa alat' },
      { status: 500 }
    );
  }
}
