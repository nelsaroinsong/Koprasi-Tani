import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { role, kelompokTaniId } = body;

    if (!role || (role !== 'PETANI' && role !== 'PEMBELI')) {
      return NextResponse.json({ error: 'Peran tidak valid' }, { status: 400 });
    }

    // Pembeli langsung aktif, Petani menunggu verifikasi admin
    const isVerified = role === 'PEMBELI';

    const updated = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        role,
        isVerified,
        kelompokTaniId: role === 'PETANI' ? kelompokTaniId || null : null,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Error saat menyimpan peran user:', error);
    return NextResponse.json({ error: 'Gagal memperbarui peran' }, { status: 500 });
  }
}
