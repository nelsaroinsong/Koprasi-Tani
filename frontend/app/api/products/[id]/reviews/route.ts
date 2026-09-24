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

    if (completedPurchaseCount === 0 && currentUser.role !== 'ADMIN') {
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
    if ((prisma as any).review) {
      review = await (prisma as any).review.create({
        data: {
          rating: parsedRating,
          komentar: komentar?.trim() || null,
          fotoUrl: fotoUrl?.trim() || null,
          productId,
          userId: currentUser.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
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

    // Invalidate review cache, product cache, and farmer profile cache
    await Promise.all([
      delCache(`reviews:product:${productId}`),
      delCache(`products:${productId}`),
      delCachePattern(`petani:*`),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Terima kasih atas ulasan Anda!',
      review,
    });
  } catch (error: any) {
    console.error('Error submit review:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengirim ulasan' }, { status: 500 });
  }
}
