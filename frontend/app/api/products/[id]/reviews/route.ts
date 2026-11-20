import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache, delCachePattern } from '@/lib/redis';

// GET: Ambil daftar ulasan untuk suatu produk
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cacheKey = `reviews:product:${id}`;
    const cachedReviews = await getCache<any>(cacheKey);
    if (cachedReviews) {
      return NextResponse.json(cachedReviews);
    }

    let reviews: any[] = [];

    if ((prisma as any).review) {
      reviews = await (prisma as any).review.findMany({
        where: { productId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT r.id, r.rating, r.komentar, r."fotoUrl", r."createdAt",
                u.id as "userId", u.name as "userName", u."avatarUrl" as "userAvatar"
         FROM reviews r
         LEFT JOIN users u ON r."userId" = u.id
         WHERE r."productId" = $1
         ORDER BY r."createdAt" DESC`,
        id
      );
      reviews = rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        komentar: row.komentar,
        fotoUrl: row.fotoUrl,
        createdAt: row.createdAt,
        user: {
          id: row.userId,
          name: row.userName,
          avatarUrl: row.userAvatar,
        },
      }));
    }

    const responseData = {
      success: true,
      reviews,
    };

    // Cache for 3 minutes (180s)
    await setCache(cacheKey, responseData, 180);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error fetch reviews:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat ulasan' }, { status: 500 });
  }
}

// POST: Tulis ulasan baru untuk produk
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await auth();
    // Batasi frekuensi request (anti spam / tebak-tebakan)
    const limited = await enforceRateLimit(request, RATE_LIMITS.review, session?.user?.email);
    if (limited) return limited;

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk memberikan ulasan.' },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Pastikan produk ada
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Komoditas tidak ditemukan.' }, { status: 404 });
    }

    // Pastikan pengguna sudah berhasil membeli komoditas ini (status pesanan SELESAI)
    const completedPurchaseCount = await prisma.orderItem.count({
      where: {
        productId,
        order: {
          pembeliId: currentUser.id,
          status: 'SELESAI',
        },
      },
    });

    if (completedPurchaseCount === 0) {
      return NextResponse.json(
        {
          error:
            'Ulasan hanya dapat diberikan setelah Anda berhasil membeli dan pesanan komoditas ini berstatus Selesai.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rating, komentar, fotoUrl } = body;

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json(
        { error: 'Rating harus berupa angka antara 1 sampai 5 bintang.' },
        { status: 400 }
      );
    }

    let review: any;
    let isUpdate = false;
    if ((prisma as any).review) {
      // Satu pembeli = satu ulasan per komoditas. Kirim ulang = memperbarui ulasan lama
      // (mencegah rating digelembungkan dengan ulasan berulang).
      const existing = await prisma.review.findFirst({
        where: { productId, userId: currentUser.id },
        select: { id: true },
      });
      const reviewData = {
        rating: parsedRating,
        komentar: komentar?.trim() || null,
        fotoUrl: fotoUrl?.trim() || null,
      };
      const include = { user: { select: { id: true, name: true, avatarUrl: true } } };
      isUpdate = Boolean(existing);
      review = existing
        ? await prisma.review.update({ where: { id: existing.id }, data: reviewData, include })
        : await prisma.review.create({ data: { ...reviewData, productId, userId: currentUser.id }, include });
    } else {
      const reviewId = crypto.randomUUID();
      const now = new Date();
      await prisma.$executeRawUnsafe(
        `INSERT INTO reviews (id, rating, komentar, "fotoUrl", "productId", "userId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        reviewId,
        parsedRating,
        komentar?.trim() || null,
        fotoUrl?.trim() || null,
        productId,
        currentUser.id,
        now,
        now
      );

      review = {
        id: reviewId,
        rating: parsedRating,
        komentar: komentar?.trim() || null,
        fotoUrl: fotoUrl?.trim() || null,
        productId,
        userId: currentUser.id,
        createdAt: now,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
        },
      };
    }

    // Invalidate review cache, product detail cache, and farmer profile cache
    await Promise.all([
      delCache(`reviews:product:${productId}`),
      delCache(`product:detail:${productId}:public`),
      delCachePattern('products:*'),
      delCachePattern(`petani:*`),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Ulasan Anda berhasil diperbarui.' : 'Terima kasih atas ulasan Anda!',
      updated: isUpdate,
      review,
    });
  } catch (error: any) {
    console.error('Error submit review:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengirim ulasan' }, { status: 500 });
  }
}

// DELETE: Hapus ulasan milik pengguna sendiri
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk menghapus ulasan.' },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json({ error: 'ID ulasan diperlukan.' }, { status: 400 });
    }

    let review: any;
    if ((prisma as any).review) {
      review = await (prisma as any).review.findUnique({
        where: { id: reviewId },
      });
    } else {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, "userId", "productId" FROM reviews WHERE id = $1`,
        reviewId
      );
      review = rows[0] || null;
    }

    if (!review) {
      return NextResponse.json({ error: 'Ulasan tidak ditemukan.' }, { status: 404 });
    }

    if (review.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Anda hanya dapat menghapus ulasan milik akun Anda sendiri.' },
        { status: 403 }
      );
    }

    if ((prisma as any).review) {
      await (prisma as any).review.delete({
        where: { id: reviewId },
      });
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM reviews WHERE id = $1`, reviewId);
    }

    // Invalidate review cache, product detail cache, and farmer profile cache
    await Promise.all([
      delCache(`reviews:product:${productId}`),
      delCache(`product:detail:${productId}:public`),
      delCachePattern('products:*'),
      delCachePattern(`petani:*`),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Ulasan berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Error delete review:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus ulasan' }, { status: 500 });
  }
}
