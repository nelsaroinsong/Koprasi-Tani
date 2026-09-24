import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

// 1. READ: Ambil daftar pengguna dengan server-side pagination, search, dan filter
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
    const statusParam = searchParams.get('status');

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '8', 10)));
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, any> = {};

    if (roleParam && (roleParam === 'PETANI' || roleParam === 'PEMBELI' || roleParam === 'ADMIN')) {
      whereCondition.role = roleParam;
    }

    if (statusParam === 'VERIFIED') {
      whereCondition.isVerified = true;
    } else if (statusParam === 'PENDING') {
      whereCondition.isVerified = false;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Query data dan total count secara paralel
    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where: whereCondition }),
      prisma.user.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        address: u.address,
        role: u.role,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        isOnboarded: u.isOnboarded,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error saat mengambil data pengguna:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengguna' }, { status: 500 });
  }
}

// 2. CREATE: Tambah pengguna baru (Petani / Pembeli) secara manual oleh Admin
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
    const { name, email, phone, address, role, isVerified, avatarUrl } = body;

    // Validasi input wajib
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama pengguna wajib diisi' }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email pengguna wajib diisi' }, { status: 400 });
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
        address: address ? String(address).trim() : null,
        role,
        isVerified: typeof isVerified === 'boolean' ? isVerified : (role === 'PEMBELI'),
        isOnboarded: true,
        isActive: true,
        avatarUrl: avatarUrl ? String(avatarUrl).trim() : null,
      },
    });

    // Invalidate user and farmer caches
    await Promise.all([
      delCachePattern('user:profile:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

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
    const { id, name, email, phone, address, isVerified, isActive, avatarUrl } = body;

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

    if (typeof address === 'string') {
      updateData.address = address.trim() || null;
    }

    if (typeof isVerified === 'boolean') {
      updateData.isVerified = isVerified;
    }

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
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
    });

    // Invalidate user and farmer caches
    await Promise.all([
      delCachePattern('user:profile:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

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

// 4. VERIFY TOGGLE: Verifikasi langsung akun petani
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
    const { id, isVerified } = body;

    if (!id || typeof isVerified !== 'boolean') {
      return NextResponse.json({ error: 'ID dan status verifikasi wajib disertakan' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isVerified },
    });

    // Invalidate user and farmer caches
    await Promise.all([
      delCachePattern('user:profile:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: isVerified
        ? 'Akun Petani berhasil diverifikasi resmi.'
        : 'Status verifikasi akun Petani telah dibatalkan.',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error saat mengubah status verifikasi:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengubah status verifikasi' }, { status: 500 });
  }
}

// 5. DELETE: Hapus data pengguna
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
      return NextResponse.json({ error: 'ID pengguna wajib disertakan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: 'Akun administrator tidak dapat dihapus' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id },
    });

    // Invalidate user and farmer caches
    await Promise.all([
      delCachePattern('user:profile:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Akun ${targetUser.name} berhasil dihapus permanen.`,
    });
  } catch (error: any) {
    console.error('Error saat menghapus pengguna:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus pengguna' }, { status: 500 });
  }
}
