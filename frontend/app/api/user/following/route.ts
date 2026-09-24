import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

// GET: Ambil daftar petani yang diikuti oleh pengguna saat ini
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const cacheKey = `user:following:${currentUser.id}`;
    const cachedFollowing = await getCache<any>(cacheKey);
    if (cachedFollowing) {
      return NextResponse.json(cachedFollowing);
    }

    let followedPetaniList: any[] = [];

    if ((prisma as any).follow) {
      const follows = await (prisma as any).follow.findMany({
        where: { followerId: currentUser.id },
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
              _count: {
                select: {
                  products: { where: { isTersedia: true } },
                  followers: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      followedPetaniList = follows.map((f: any) => ({
        ...f.petani,
        totalBarang: f.petani?._count?.products || 0,
        followersCount: f.petani?._count?.followers || 0,
        followedAt: f.createdAt,
      }));
    } else {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT f."createdAt" as "followedAt",
                u.id, u.name, u.email, u.phone, u.address, u."avatarUrl", u."isVerified", u."createdAt"
         FROM follows f
         JOIN users u ON f."petaniId" = u.id
         WHERE f."followerId" = $1
         ORDER BY f."createdAt" DESC`,
        currentUser.id
      );

      // Hitung total barang untuk setiap petani
      const results = await Promise.all(
        rows.map(async (row) => {
          const productCount = await prisma.product.count({
            where: { petaniId: row.id, isTersedia: true },
          });
          const followerCountRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int as count FROM follows WHERE "petaniId" = $1`,
            row.id
          );

          return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            address: row.address,
            avatarUrl: row.avatarUrl,
            isVerified: row.isVerified,
            totalBarang: productCount,
            followersCount: followerCountRows[0]?.count || 0,
            followedAt: row.followedAt,
          };
        })
      );

      followedPetaniList = results;
    }

    const responseData = {
      success: true,
      following: followedPetaniList,
      totalCount: followedPetaniList.length,
    };

    // Cache for 2 minutes (120 seconds)
    await setCache(cacheKey, responseData, 120);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error fetching following list:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar petani yang diikuti' }, { status: 500 });
  }
}
