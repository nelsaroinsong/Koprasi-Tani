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
    const { role } = body;

    if (!role || (role !== 'PETANI' && role !== 'PEMBELI')) {
      return NextResponse.json({ error: 'Peran tidak valid' }, { status: 400 });
    }

    // Pastikan akun admin tidak bisa beralih menjadi pembeli atau petani
    const existing = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (existing?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Akun Administrator tidak dapat diubah menjadi Pembeli atau Petani.' },
        { status: 403 }
      );
    }

    // Pembeli langsung aktif, Petani menunggu verifikasi admin
    const isVerified = role === 'PEMBELI';

    const updated = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        role,
        isVerified,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Error saat menyimpan peran user:', error);
    return NextResponse.json({ error: 'Gagal memperbarui peran' }, { status: 500 });
  }
}
