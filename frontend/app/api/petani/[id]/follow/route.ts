import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCache, delCachePattern } from '@/lib/redis';

// POST: Toggle follow/unfollow petani
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: petaniId } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk mengikuti petani.' },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (currentUser.id === petaniId) {
      return NextResponse.json(
        { error: 'Anda tidak dapat mengikuti akun toko Anda sendiri.' },
        { status: 400 }
      );
    }

    // Pastikan petani target ada
    const targetPetani = await prisma.user.findUnique({
      where: { id: petaniId },
    });

    if (!targetPetani) {
      return NextResponse.json({ error: 'Petani tidak ditemukan.' }, { status: 404 });
    }

    let isFollowed = false;
    if ((prisma as any).follow) {
      const existingFollow = await (prisma as any).follow.findUnique({
        where: {
          followerId_petaniId: {
            followerId: currentUser.id,
            petaniId,
          },
        },
      });

      if (existingFollow) {
        // Unfollow
        await (prisma as any).follow.delete({
          where: { id: existingFollow.id },
        });
        isFollowed = false;
      } else {
        // Follow
        await (prisma as any).follow.create({
          data: {
            followerId: currentUser.id,
            petaniId,
          },
        });
        isFollowed = true;
      }
    } else {
      const existing: any[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM follows WHERE "followerId" = $1 AND "petaniId" = $2`,
        currentUser.id,
        petaniId
      );

      if (existing.length > 0) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM follows WHERE id = $1`,
          existing[0].id
        );
        isFollowed = false;
      } else {
        const id = crypto.randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO follows (id, "followerId", "petaniId", "createdAt") VALUES ($1, $2, $3, $4)`,
          id,
          currentUser.id,
          petaniId,
          new Date()
        );
        isFollowed = true;
      }
    }

    let followersCount = 0;
    if ((prisma as any).follow) {
      followersCount = await (prisma as any).follow.count({
        where: { petaniId },
      });
    } else {
      const countRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM follows WHERE "petaniId" = $1`,
        petaniId
      );
      followersCount = countRows[0]?.count || 0;
    }

    // Invalidate Redis caches
    await Promise.all([
      delCache(`petani:public:${petaniId}`),
      delCache(`user:profile:${session.user.email}`),
      delCache(`user:following:${currentUser.id}`),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      isFollowed,
      followersCount,
      message: isFollowed
        ? `Berhasil mengikuti ${targetPetani.name}`
        : `Berhenti mengikuti ${targetPetani.name}`,
    });
  } catch (error: any) {
    console.error('Error toggling follow:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengubah status follow' }, { status: 500 });
  }
}
