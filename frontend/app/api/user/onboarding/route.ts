import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCache } from '@/lib/redis';
import { validateIndonesianPhone } from '@/lib/phone-validation';
import { validateMinahasaUtaraAddress } from '@/lib/address-validation';

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

    const phoneValidation = validateIndonesianPhone(phone, true);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
    }

    const addressValidation = validateMinahasaUtaraAddress(address, true);
    if (!addressValidation.isValid) {
      return NextResponse.json({ error: addressValidation.error }, { status: 400 });
    }

    if (role !== 'PEMBELI' && role !== 'PETANI') {
      return NextResponse.json({ error: 'Pilihan peran tidak valid.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanPhone = phoneValidation.cleanPhone;
    const cleanAddress = address.trim();

    // Tentukan status verifikasi berdasarkan peran:
    // - PEMBELI: Langsung terverifikasi (true)
    // - PETANI: Menunggu verifikasi admin (false)
    const isVerified = role === 'PEMBELI';

    const userEmail = session.user.email.trim().toLowerCase();

    const updatedUser = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        avatarUrl: avatarUrl || session.user.image || null,
        role,
        isVerified,
        isOnboarded: true,
      },
      create: {
        email: userEmail,
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        avatarUrl: avatarUrl || session.user.image || null,
        role,
        isVerified,
        isOnboarded: true,
        isActive: true,
      },
    });

    // Invalidate user profile cache
    await delCache(`user:profile:${userEmail}`).catch(() => {});

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
