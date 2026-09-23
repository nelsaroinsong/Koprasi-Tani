import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// 1. READ: Ambil daftar pengguna berdasarkan role
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');
    const search = searchParams.get('q')?.trim().toLowerCase();

    const whereCondition: Record<string, any> = {};

    if (roleParam && (roleParam === 'PETANI' || roleParam === 'PEMBELI' || roleParam === 'ADMIN')) {
      whereCondition.role = roleParam;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      include: {
        kelompokTani: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        isActive: u.isActive,
        createdAt: u.createdAt,
        kelompokTani: u.kelompokTani
          ? {
              id: u.kelompokTani.id,
              nama: u.kelompokTani.nama,
              desa: u.kelompokTani.desa,
              kecamatan: u.kelompokTani.kecamatan,
              komoditasUtama: u.kelompokTani.komoditasUtama,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Error saat mengambil data pengguna:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengguna' }, { status: 500 });
  }
}

// 2. CREATE: Tambah pengguna baru (Petani / Pembeli)
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
    const { name, email, phone, role, kelompokTaniId, isVerified } = body;

    // Validasi input wajib
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    if (!role || (role !== 'PETANI' && role !== 'PEMBELI')) {
      return NextResponse.json({ error: 'Peran pengguna harus Petani atau Pembeli' }, { status: 400 });
    }

    // Cek apakah email sudah terdaftar
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email tersebut sudah terdaftar di sistem' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        role,
        isVerified: typeof isVerified === 'boolean' ? isVerified : (role === 'PEMBELI'),
        isActive: true,
        kelompokTaniId: role === 'PETANI' && kelompokTaniId ? kelompokTaniId : null,
      },
      include: {
        kelompokTani: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan data ${role === 'PETANI' ? 'Petani' : 'Pembeli'}.`,
      user: newUser,
    });
  } catch (error: any) {
    console.error('Error saat menambah pengguna:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan pengguna' }, { status: 500 });
  }
}

// 3. UPDATE: Edit data pengguna
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, phone, kelompokTaniId, isVerified, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna wajib disertakan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    if (typeof phone === 'string') {
      updateData.phone = phone.trim() || null;
    }

    if (typeof isVerified === 'boolean') {
      updateData.isVerified = isVerified;
    }

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (targetUser.role === 'PETANI') {
      updateData.kelompokTaniId = kelompokTaniId || null;
    }

    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== targetUser.email) {
        const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existingEmail) {
          return NextResponse.json({ error: 'Email baru sudah digunakan akun lain' }, { status: 409 });
        }
        updateData.email = cleanEmail;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { kelompokTani: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error saat memperbarui data pengguna:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui data pengguna' }, { status: 500 });
  }
}

// 4. PATCH: Cepat toggle status verifikasi / status aktif
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { id, isVerified, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna harus disertakan' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { kelompokTani: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Status pengguna berhasil diperbarui.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error saat memperbarui status pengguna:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status pengguna' }, { status: 500 });
  }
}

// 5. DELETE: Hapus pengguna
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna harus disertakan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Jangan izinkan admin menghapus akunnya sendiri
    if (targetUser.email === session.user.email || targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: 'Akun administrator tidak dapat dihapus.' }, { status: 403 });
    }

    // Hapus relasi produk jika petani memiliki produk
    await prisma.product.deleteMany({ where: { petaniId: id } });

    // Hapus pengguna
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${targetUser.name} (${targetUser.email}) berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error saat menghapus pengguna:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus pengguna' }, { status: 500 });
  }
}
