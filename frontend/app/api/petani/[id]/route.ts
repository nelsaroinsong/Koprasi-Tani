import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    let currentUserId: string | null = null;

    if (session?.user?.email) {
      const u = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (u) currentUserId = u.id;
    }

    const cacheKey = `petani:public:${id}`;
    let baseData = await getCache<any>(cacheKey);

    if (!baseData) {
      // Ambil data profil Petani
      const petani = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          avatarUrl: true,
          isVerified: true,
          createdAt: true,
          role: true,
        },
      });

      if (!petani) {
        return NextResponse.json({ error: 'Petani tidak ditemukan' }, { status: 404 });
      }

      // Ambil semua komoditas aktif milik petani ini
      const products = await prisma.product.findMany({
        where: {
          petaniId: id,
          isTersedia: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Hitung total terjual di seluruh komoditas petani ini
      const soldItems = await prisma.orderItem.findMany({
        where: {
          petaniId: id,
          order: { status: { not: 'DIBATALKAN' } },
        },
        select: { quantity: true },
      });
      const totalTerjual = soldItems.reduce((acc, item) => acc + item.quantity, 0);

      // Hitung followers
      let followersCount = 0;
      try {
        if ((prisma as any).follow) {
          followersCount = await (prisma as any).follow.count({
            where: { petaniId: id },
          });
        } else {
          const fRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int as count FROM follows WHERE "petaniId" = $1`,
            id
          );
          followersCount = fRows[0]?.count || 0;
        }
      } catch (fErr) {
        console.warn('Error counting followers:', fErr);
      }

      // Ambil semua ulasan untuk produk-produk petani ini
      let reviews: any[] = [];
      try {
        if ((prisma as any).review) {
          reviews = await (prisma as any).review.findMany({
            where: {
              product: { petaniId: id },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              product: {
                select: {
                  id: true,
                  nama: true,
                  satuan: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
        } else {
          const revRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT r.id, r.rating, r.komentar, r."createdAt",
                    u.id as "userId", u.name as "userName", u."avatarUrl" as "userAvatar",
                    p.id as "prodId", p.nama as "prodNama", p.satuan as "prodSatuan"
             FROM reviews r
             JOIN products p ON r."productId" = p.id
             LEFT JOIN users u ON r."userId" = u.id
             WHERE p."petaniId" = $1
             ORDER BY r."createdAt" DESC`,
            id
          );
          reviews = revRows.map((row) => ({
            id: row.id,
            rating: row.rating,
            komentar: row.komentar,
            createdAt: row.createdAt,
            user: {
              id: row.userId,
              name: row.userName,
              avatarUrl: row.userAvatar,
            },
            product: {
              id: row.prodId,
              nama: row.prodNama,
              satuan: row.prodSatuan,
            },
          }));
        }
      } catch (revErr) {
        console.warn('Error fetching farmer reviews:', revErr);
      }

      const totalReviews = reviews.length;
      const sumRating = reviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0);
      const avgRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : null;

      // Kategori etalase yang dimiliki petani
      const categoriesMap: { [cat: string]: number } = {};
      products.forEach((p) => {
        categoriesMap[p.kategori] = (categoriesMap[p.kategori] || 0) + 1;
      });

      const etalase = Object.entries(categoriesMap).map(([nama, count]) => ({
        nama,
        count,
      }));

      baseData = {
        petani: {
          ...petani,
          totalBarang: products.length,
          totalTerjual,
          followersCount,
          avgRating,
          totalReviews,
        },
        products,
        reviews,
        etalase,
      };

      // Cache for 3 minutes (180s)
      await setCache(cacheKey, baseData, 180);
    }

    // Cek apakah user saat ini follow petani ini
    let isFollowed = false;
    if (currentUserId) {
      try {
        if ((prisma as any).follow) {
          const followRec = await (prisma as any).follow.findUnique({
            where: {
              followerId_petaniId: {
                followerId: currentUserId,
                petaniId: id,
              },
            },
          });
          isFollowed = Boolean(followRec);
        } else {
          const followRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM follows WHERE "followerId" = $1 AND "petaniId" = $2`,
            currentUserId,
            id
          );
          isFollowed = followRows.length > 0;
        }
      } catch (fCheckErr) {
        console.warn('Error checking follow status:', fCheckErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        petani: {
          ...baseData.petani,
          isFollowed,
        },
        products: baseData.products,
        reviews: baseData.reviews,
        etalase: baseData.etalase,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching farmer profile:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat profil petani' }, { status: 500 });
  }
}
