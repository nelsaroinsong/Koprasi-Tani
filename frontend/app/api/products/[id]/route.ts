import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    let currentUserId: string | null = null;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (user) currentUserId = user.id;
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        petani: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            avatarUrl: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Komoditas tidak ditemukan' }, { status: 404 });
    }

    // 1. Hitung total terjual produk ini
    const soldItems = await prisma.orderItem.findMany({
      where: {
        productId: id,
        order: {
          status: { not: 'DIBATALKAN' },
        },
      },
      select: { quantity: true },
    });
    const totalSold = soldItems.reduce((acc, item) => acc + item.quantity, 0);

    // 2. Ambil ulasan produk
    let reviews: any[] = [];
    try {
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
    } catch (revErr) {
      console.warn('Error reading reviews:', revErr);
    }

    const totalReviews = reviews.length;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumRating = 0;
    let satisfiedCount = 0;

    reviews.forEach((r: any) => {
      const rating = Math.min(5, Math.max(1, r.rating || 5));
      if (rating in breakdown) {
        breakdown[rating as keyof typeof breakdown] += 1;
      }
      sumRating += rating;
      if (rating >= 4) {
        satisfiedCount += 1;
      }
    });

    const avgRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : null;
    const satisfiedPercentage = totalReviews > 0 ? Math.round((satisfiedCount / totalReviews) * 100) : null;

    // 3. Hitung statistik Petani
    const petaniId = product.petaniId;
    const [petaniProductsCount, petaniSoldItems] = await Promise.all([
      prisma.product.count({
        where: { petaniId, isTersedia: true },
      }),
      prisma.orderItem.findMany({
        where: {
          petaniId,
          order: { status: { not: 'DIBATALKAN' } },
        },
        select: { quantity: true },
      }),
    ]);

    let petaniFollowersCount = 0;
    let petaniReviews: any[] = [];
    try {
      if ((prisma as any).follow) {
        petaniFollowersCount = await (prisma as any).follow.count({ where: { petaniId } });
      } else {
        const fRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM follows WHERE "petaniId" = $1`,
          petaniId
        );
        petaniFollowersCount = fRows[0]?.count || 0;
      }

      if ((prisma as any).review) {
        petaniReviews = await (prisma as any).review.findMany({
          where: { product: { petaniId } },
          select: { rating: true },
        });
      } else {
        petaniReviews = await prisma.$queryRawUnsafe(
          `SELECT r.rating FROM reviews r
           JOIN products p ON r."productId" = p.id
           WHERE p."petaniId" = $1`,
          petaniId
        );
      }
    } catch (pErr) {
      console.warn('Error reading farmer reviews/followers:', pErr);
    }

    const petaniTotalTerjual = petaniSoldItems.reduce((acc, item) => acc + item.quantity, 0);
    const petaniTotalReviews = petaniReviews.length;
    const petaniSumRating = petaniReviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0);
    const petaniAvgRating = petaniTotalReviews > 0 ? Number((petaniSumRating / petaniTotalReviews).toFixed(1)) : null;

    // Cek apakah user saat ini mengikuti petani ini
    let isFollowed = false;
    let hasPurchased = false;

    if (currentUserId) {
      try {
        if ((prisma as any).follow) {
          const followRecord = await (prisma as any).follow.findUnique({
            where: {
              followerId_petaniId: {
                followerId: currentUserId,
                petaniId,
              },
            },
          });
          isFollowed = Boolean(followRecord);
        } else {
          const followRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM follows WHERE "followerId" = $1 AND "petaniId" = $2`,
            currentUserId,
            petaniId
          );
          isFollowed = followRows.length > 0;
        }
      } catch (fCheckErr) {
        console.warn('Error checking follow status:', fCheckErr);
      }

      // Cek apakah pembeli sudah berhasil membeli produk ini (status pesanan SELESAI)
      const orderCount = await prisma.orderItem.count({
        where: {
          productId: id,
          order: {
            pembeliId: currentUserId,
            status: 'SELESAI',
          },
        },
      });
      hasPurchased = orderCount > 0;
    }

    return NextResponse.json({
      product: {
        ...product,
        totalSold,
      },
      stats: {
        totalReviews,
        avgRating,
        satisfiedPercentage,
        breakdown,
      },
      reviews,
      petani: {
        ...product.petani,
        totalBarang: petaniProductsCount,
        totalTerjual: petaniTotalTerjual,
        followersCount: petaniFollowersCount,
        avgRating: petaniAvgRating,
        totalReviews: petaniTotalReviews,
        isFollowed,
      },
      userState: {
        isAuthenticated: Boolean(currentUserId),
        hasPurchased,
        isOwner: currentUserId === petaniId,
      },
    });
  } catch (error: any) {
    console.error('Error saat fetch detail produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat detail produk' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Pastikan produk ada
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Hanya pemilik produk atau admin yang berhak mengedit
    if (existingProduct.petaniId !== dbUser.id && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki hak untuk mengubah produk ini.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nama, deskripsi, kategori, hargaPerSatuan, satuan, stok, imageUrl, isTersedia } = body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(nama && { nama: nama.trim() }),
        ...(deskripsi !== undefined && { deskripsi: deskripsi ? deskripsi.trim() : null }),
        ...(kategori && { kategori: kategori.trim() }),
        ...(hargaPerSatuan !== undefined && { hargaPerSatuan: parseFloat(hargaPerSatuan) }),
        ...(satuan && { satuan: satuan.trim() }),
        ...(stok !== undefined && { stok: parseInt(stok, 10) }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(isTersedia !== undefined && { isTersedia: Boolean(isTersedia) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui!',
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Error saat update produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui produk' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Hanya pemilik produk atau admin yang berhak menghapus
    if (existingProduct.petaniId !== dbUser.id && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki hak untuk menghapus produk ini.' },
        { status: 403 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus dari katalog.',
    });
  } catch (error: any) {
    console.error('Error saat menghapus produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus produk' }, { status: 500 });
  }
}
