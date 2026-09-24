import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth-passwords';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        hasPassword: true,
        createdAt: true,
      } as any,
    });

    if (!admin) {
      return NextResponse.json({ error: 'Data admin tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: admin,
    });
  } catch (error) {
    console.error('Error saat mengambil data profil admin:', error);
    return NextResponse.json({ error: 'Gagal mengambil data profil' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      address,
      avatarUrl,
      currentPassword,
      newPassword,
      confirmPassword,
    } = body;

    const currentAdmin = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentAdmin) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    // 1. Validasi & Update Nama
    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    // 2. Validasi & Update Nomor Telepon
    if (phone !== undefined) {
      updateData.phone = typeof phone === 'string' ? phone.trim() : null;
    }

    // 2b. Validasi & Update Alamat Kantor & Gudang Koperasi
    if (address !== undefined) {
      updateData.address = typeof address === 'string' ? address.trim() : null;
    }

    // 3. Validasi & Update Foto Profil
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    // 4. Validasi & Update Kata Sandi jika ada permintaan ganti kata sandi
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Kata sandi baru minimal 6 karakter.' },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: 'Konfirmasi kata sandi baru tidak cocok.' },
          { status: 400 }
        );
      }

      // Jika admin sudah memiliki kata sandi sebelumnya di database, cek kecocokannya
      if (currentAdmin.password) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Silakan masukkan kata sandi saat ini untuk konfirmasi.' },
            { status: 400 }
          );
        }

        const isMatch = verifyPassword(currentPassword, currentAdmin.password);
        if (!isMatch) {
          return NextResponse.json(
            { error: 'Kata sandi saat ini salah.' },
            { status: 400 }
          );
        }
      }

      // Hash kata sandi baru
      updateData.password = hashPassword(newPassword);
    }

    // Lakukan pembaruan di database PostgreSQL
    const updated = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Profil administrator berhasil diperbarui.',
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error('Error saat memperbarui profil admin:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memperbarui profil.' },
      { status: 500 }
    );
  }
}
