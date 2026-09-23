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
    const { name, phone, address, avatarUrl, role } = body;

    // Validasi input identitas wajib
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return NextResponse.json({ error: 'Nomor telepon/WhatsApp wajib diisi minimal 8 digit.' }, { status: 400 });
    }

    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ error: 'Alamat lengkap wajib diisi.' }, { status: 400 });
    }

    if (role !== 'PEMBELI' && role !== 'PETANI') {
      return NextResponse.json({ error: 'Pilihan peran tidak valid.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    // Tentukan status verifikasi berdasarkan peran:
    // - PEMBELI: Langsung terverifikasi (true)
    // - PETANI: Menunggu verifikasi admin (false)
    const isVerified = role === 'PEMBELI';

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        avatarUrl: avatarUrl || session.user.image || null,
        role,
        isVerified,
        isOnboarded: true,
      },
    });

    const redirectUrl = role === 'PETANI' ? '/verifikasi-petani' : '/toko';

    return NextResponse.json({
      success: true,
      message: role === 'PETANI'
        ? 'Pendaftaran permohonan kemitraan Petani berhasil dikirim. Menunggu verifikasi admin.'
        : 'Identitas berhasil dilengkapi. Selamat datang di Koperasi Sinar Pagi Sejahtera!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        isOnboarded: updatedUser.isOnboarded,
      },
      redirectUrl,
    });
  } catch (error: any) {
    console.error('Error saat menyimpan onboarding identitas:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan identitas pengguna.' }, { status: 500 });
  }
}
