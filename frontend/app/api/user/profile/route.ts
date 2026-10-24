import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache, delCachePattern } from '@/lib/redis';
import { validateIndonesianPhone } from '@/lib/phone-validation';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const normalizedEmail = session.user.email.trim().toLowerCase();
    const cacheKey = `user:profile:${normalizedEmail}`;
    const cachedProfile = await getCache<any>(cacheKey);
    if (cachedProfile) {
      return NextResponse.json(cachedProfile);
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Ambil nomor HP kontak pengurus/admin aktif dari database
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { phone: true },
      orderBy: { createdAt: 'asc' },
    });

    // Hitung jumlah mengikuti & diikuti
    let followingCount = 0;
    let followersCount = 0;

    try {
      if ((prisma as any).follow) {
        [followingCount, followersCount] = await Promise.all([
          (prisma as any).follow.count({ where: { followerId: dbUser.id } }),
          (prisma as any).follow.count({ where: { petaniId: dbUser.id } }),
        ]);
      } else {
        const [followingRows, followerRows]: any[] = await Promise.all([
          prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM follows WHERE "followerId" = $1`, dbUser.id),
          prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM follows WHERE "petaniId" = $1`, dbUser.id),
        ]);
        followingCount = followingRows[0]?.count || 0;
        followersCount = followerRows[0]?.count || 0;
      }
    } catch (e) {
      console.warn('Error reading follow stats for user:', e);
    }

    const responseData = {
      success: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        address: dbUser.address,
        role: dbUser.role,
        isVerified: dbUser.role === 'PEMBELI' ? true : dbUser.isVerified,
        isOnboarded: dbUser.isOnboarded,
        avatarUrl: dbUser.avatarUrl,
        createdAt: dbUser.createdAt,
        followingCount,
        followersCount,
      },
      adminContact: {
        phone: adminUser?.phone || null,
      },
    };

    // Cache user profile for 120 seconds
    await setCache(cacheKey, responseData, 120);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error saat mengambil profil pengguna:', error);
    return NextResponse.json({ error: 'Gagal mengambil profil' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    const body = await request.json();
    const { name, phone, address, avatarUrl, email: bodyEmail } = body;
    const targetEmail = session?.user?.email || bodyEmail;

    if (!targetEmail) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    let cleanPhone: string | null | undefined = undefined;
    if (phone !== undefined) {
      if (typeof phone === 'string' && phone.trim()) {
        const phoneValidation = validateIndonesianPhone(phone, false);
        if (!phoneValidation.isValid) {
          return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
        }
        cleanPhone = phoneValidation.cleanPhone;
      } else {
        cleanPhone = null;
      }
    }

    const updated = await prisma.user.update({
      where: { email: targetEmail },
      data: {
        ...(name && { name: name.trim() }),
        ...(cleanPhone !== undefined && { phone: cleanPhone }),
        ...(address !== undefined && { address }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    // Invalidate user cache and any farmer public cache
    await delCache(`user:profile:${targetEmail}`);
    await delCachePattern('petani:*');

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        role: updated.role,
        isVerified: updated.isVerified,
        isOnboarded: updated.isOnboarded,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Error saat memperbarui profil pengguna di database:', error);
    return NextResponse.json({ error: 'Gagal memperbarui profil' }, { status: 500 });
  }
}
