import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        address: dbUser.address,
        role: dbUser.role,
        isVerified: dbUser.isVerified,
        isOnboarded: dbUser.isOnboarded,
        avatarUrl: dbUser.avatarUrl,
        createdAt: dbUser.createdAt,
      },
      adminContact: {
        phone: adminUser?.phone || null,
      },
    });
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

    const updated = await prisma.user.update({
      where: { email: targetEmail },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

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
