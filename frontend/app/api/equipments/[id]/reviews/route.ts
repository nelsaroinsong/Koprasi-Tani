import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  getEquipmentReviews,
  hasCompletedRental,
  calculateEquipmentStats,
} from '@/lib/equipment-reviews';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar ulasan & statistik untuk satu alat
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID alat diperlukan' }, { status: 400 });
    }

    const reviews = await getEquipmentReviews(id);
    return NextResponse.json({ success: true, reviews, stats: calculateEquipmentStats(reviews) });
  } catch (error: any) {
    console.error('Error fetching equipment reviews:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat ulasan alat' },
      { status: 500 }
    );
  }
}

// POST: Tulis ulasan baru untuk alat
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID alat diperlukan' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk memberikan ulasan.' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
      select: { id: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Hanya penyewa yang transaksinya sudah SELESAI yang boleh memberikan ulasan
    if (!(await hasCompletedRental(dbUser.id, id))) {
      return NextResponse.json(
        {
          error:
            'Ulasan hanya dapat diberikan setelah Anda berhasil menyewa dan masa sewa unit alsintan ini berstatus Selesai.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
    const komentar = typeof body.komentar === 'string' ? body.komentar.trim() : '';

    if (!komentar) {
      return NextResponse.json({ error: 'Komentar ulasan tidak boleh kosong.' }, { status: 400 });
    }

    const created = await prisma.equipmentReview.create({
      data: { equipmentId: id, userId: dbUser.id, rating, komentar },
    });

    const reviews = await getEquipmentReviews(id);
    return NextResponse.json({
      success: true,
      review: reviews.find((r) => r.id === created.id),
      reviews,
      stats: calculateEquipmentStats(reviews),
    });
  } catch (error: any) {
    console.error('Error submitting equipment review:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menyimpan ulasan' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus ulasan alat milik penyewa sendiri (atau oleh admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID alat diperlukan' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk menghapus ulasan.' },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
      select: { id: true, role: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const reviewId = new URL(request.url).searchParams.get('reviewId');
    if (!reviewId) {
      return NextResponse.json({ error: 'ID ulasan diperlukan.' }, { status: 400 });
    }

    const review = await prisma.equipmentReview.findFirst({ where: { id: reviewId, equipmentId: id } });
    if (!review) {
      return NextResponse.json({ error: 'Ulasan tidak ditemukan.' }, { status: 404 });
    }

    if (review.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Anda hanya dapat menghapus ulasan milik akun Anda sendiri.' },
        { status: 403 }
      );
    }

    await prisma.equipmentReview.delete({ where: { id: reviewId } });

    const reviews = await getEquipmentReviews(id);
    return NextResponse.json({
      success: true,
      message: 'Ulasan berhasil dihapus.',
      reviews,
      stats: calculateEquipmentStats(reviews),
    });
  } catch (error: any) {
    console.error('Error deleting equipment review:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menghapus ulasan' },
      { status: 500 }
    );
  }
}
