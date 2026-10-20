import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { readEquipmentRentals } from '@/lib/equipment-rentals';
import {
  readEquipmentReviewsFromFile,
  saveEquipmentReviewToFile,
  calculateEquipmentStats,
  type EquipmentReviewItem,
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

    const allReviews = readEquipmentReviewsFromFile();
    const reviews = allReviews.filter((r) => r.equipmentId === id);
    const stats = calculateEquipmentStats(reviews);

    return NextResponse.json({
      success: true,
      reviews,
      stats,
    });
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
    let userId = 'user-tamu';
    let userName = 'Penyewa Terverifikasi';
    let userAvatar: string | null = null;

    if (session?.user?.email) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, name: true, avatarUrl: true },
        });
        if (dbUser) {
          userId = dbUser.id;
          userName = dbUser.name || 'Penyewa Koperasi';
          userAvatar = dbUser.avatarUrl || null;
        }
      } catch {}
    } else {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk memberikan ulasan.' },
        { status: 401 }
      );
    }

    // Validasi ketat: Hanya penyewa yang transaksinya sudah SELESAI yang boleh memberikan ulasan
    const allRentals = readEquipmentRentals();
    const userEmailLower = session.user.email.trim().toLowerCase();
    const hasCompletedRental = allRentals.some(
      (r) =>
        ((userId && r.userId === userId) ||
          (r.userEmail && r.userEmail.trim().toLowerCase() === userEmailLower)) &&
        r.status === 'SELESAI' &&
        r.items?.some((item) => item.equipmentId === id)
    );

    if (!hasCompletedRental) {
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
      return NextResponse.json(
        { error: 'Komentar ulasan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const newReview: EquipmentReviewItem = {
      id: `rev-eq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      equipmentId: id,
      userId,
      userName,
      userAvatar,
      rating,
      komentar,
      createdAt: new Date().toISOString(),
    };

    saveEquipmentReviewToFile(newReview);

    const allReviews = readEquipmentReviewsFromFile();
    const reviews = allReviews.filter((r) => r.equipmentId === id);
    const stats = calculateEquipmentStats(reviews);

    return NextResponse.json({
      success: true,
      review: newReview,
      reviews,
      stats,
    });
  } catch (error: any) {
    console.error('Error submitting equipment review:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menyimpan ulasan' },
      { status: 500 }
    );
  }
}
