import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const list = await prisma.kelompokTani.findMany({
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({
      success: true,
      kelompokTani: list,
    });
  } catch (error) {
    console.error('Error saat mengambil daftar kelompok tani:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kelompok tani' }, { status: 500 });
  }
}
