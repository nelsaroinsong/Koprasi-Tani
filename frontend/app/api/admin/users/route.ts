import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';
import { validateIndonesianPhone } from '@/lib/phone-validation';
import { isEmailVerified } from '@/lib/otp-store';

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

    const baseRoleCondition: Record<string, any> =
      roleParam && (roleParam === 'PETANI' || roleParam === 'PEMBELI' || roleParam === 'ADMIN')
        ? { role: roleParam as any }
        : {};

    // Query data, total count, dan stats secara paralel
    const [totalCount, users, totalRoleCount, verifiedCount, pendingCount] = await Promise.all([
      prisma.user.count({ where: whereCondition }),
      prisma.user.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: baseRoleCondition }),
      prisma.user.count({ where: { ...baseRoleCondition, isVerified: true } }),
      prisma.user.count({ where: { ...baseRoleCondition, isVerified: false } }),
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
      stats: {
        total: totalRoleCount,
        verified: verifiedCount,
        pending: pendingCount,
      },
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

    // Validasi Nomor Telepon / WhatsApp
    let validatedPhone: string | null = null;
    if (phone) {
      const phoneValidation = validateIndonesianPhone(String(phone), false);
      if (!phoneValidation.isValid) {
        return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
      }
      validatedPhone = phoneValidation.cleanPhone;
    }

    // Cek apakah email sudah terdaftar
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email tersebut sudah terdaftar di sistem' }, { status: 409 });
    }

    // Untuk pendaftaran akun pengguna baru secara manual (Petani maupun Pembeli), pastikan email telah diverifikasi via OTP
    const verified = await isEmailVerified(cleanEmail);
    if (!verified) {
      const roleLabel = role === 'PETANI' ? 'petani' : 'pembeli';
      return NextResponse.json(
        { error: `Email ${roleLabel} harus diverifikasi dengan kode OTP terlebih dahulu.` },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: validatedPhone,
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
      if (phone.trim()) {
        const phoneValidation = validateIndonesianPhone(phone, false);
        if (!phoneValidation.isValid) {
          return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
        }
        updateData.phone = phoneValidation.cleanPhone;
      } else {
        updateData.phone = null;
      }
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

// 5. DELETE: Hapus data pengguna (Tunggal & Massal)
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
    const queryId = searchParams.get('id');

    let idsToDelete: string[] = [];
    if (queryId) {
      idsToDelete = [queryId];
    } else {
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids.filter((item: any) => typeof item === 'string' && item.trim());
        } else if (body?.id && typeof body.id === 'string') {
          idsToDelete = [body.id];
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'ID pengguna wajib disertakan' }, { status: 400 });
    }

    // Ambil pengguna yang akan dihapus, pastikan bukan ADMIN
    const usersToDelete = await prisma.user.findMany({
      where: {
        id: { in: idsToDelete },
        role: { not: 'ADMIN' },
      },
      select: { id: true, name: true, role: true },
    });

    if (usersToDelete.length === 0) {
      return NextResponse.json({ error: 'Tidak ada pengguna valid yang dapat dihapus' }, { status: 404 });
    }

    const validIds = usersToDelete.map((u) => u.id);

    // Hapus seluruh data berelasi pengguna dalam satu transaksi aman (Cascade Cleanup)
    await prisma.$transaction(async (tx) => {
      // 1. Hapus ulasan (reviews) yang ditulis oleh pengguna ini
      await tx.review.deleteMany({
        where: { userId: { in: validIds } },
      });

      // 2. Hapus relasi pertemanan / follow (following & followers)
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: { in: validIds } },
            { petaniId: { in: validIds } },
          ],
        },
      });

      // 3. Tangani komoditas produk yang dimiliki petani ini jika ada
      const farmerProducts = await tx.product.findMany({
        where: { petaniId: { in: validIds } },
        select: { id: true },
      });
      const farmerProductIds = farmerProducts.map((p) => p.id);

      if (farmerProductIds.length > 0) {
        // Hapus ulasan pada produk petani ini
        await tx.review.deleteMany({
          where: { productId: { in: farmerProductIds } },
        });

        // Ambil ID pesanan yang memuat produk petani ini
        const relatedItems = await tx.orderItem.findMany({
          where: {
            OR: [
              { productId: { in: farmerProductIds } },
              { petaniId: { in: validIds } },
            ],
          },
          select: { orderId: true },
        });
        const orderIds = Array.from(new Set(relatedItems.map((i) => i.orderId)));

        // Hapus order items produk petani ini
        await tx.orderItem.deleteMany({
          where: {
            OR: [
              { productId: { in: farmerProductIds } },
              { petaniId: { in: validIds } },
            ],
          },
        });

        // Bersihkan pesanan yang menjadi kosong
        for (const orderId of orderIds) {
          const remaining = await tx.orderItem.count({ where: { orderId } });
          if (remaining === 0) {
            await tx.order.delete({ where: { id: orderId } });
          }
        }

        // Hapus produk milik petani ini
        await tx.product.deleteMany({
          where: { id: { in: farmerProductIds } },
        });
      }

      // 4. Hapus sisa item penjualan petani (soldItems) jika ada
      const leftoverSoldItems = await tx.orderItem.findMany({
        where: { petaniId: { in: validIds } },
        select: { orderId: true },
      });
      if (leftoverSoldItems.length > 0) {
        const leftoverOrderIds = Array.from(new Set(leftoverSoldItems.map((i) => i.orderId)));
        await tx.orderItem.deleteMany({
          where: { petaniId: { in: validIds } },
        });
        for (const orderId of leftoverOrderIds) {
          const remaining = await tx.orderItem.count({ where: { orderId } });
          if (remaining === 0) {
            await tx.order.delete({ where: { id: orderId } });
          }
        }
      }

      // 5. Tangani pesanan yang pernah dibeli oleh pengguna ini (jika peran pembeli)
      const userOrders = await tx.order.findMany({
        where: { pembeliId: { in: validIds } },
        select: { id: true },
      });
      const userOrderIds = userOrders.map((o) => o.id);

      if (userOrderIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: userOrderIds } },
        });
        await tx.order.deleteMany({
          where: { id: { in: userOrderIds } },
        });
      }

      // 6. Terakhir, hapus pengguna secara aman
      await tx.user.deleteMany({
        where: { id: { in: validIds } },
      });
    });

    // Invalidate seluruh cache terkait pengguna, petani, produk, dan pesanan
    await Promise.all([
      delCachePattern('user:profile:*'),
      delCachePattern('petani:*'),
      delCachePattern('products:*'),
      delCachePattern('admin:orders:*'),
      delCachePattern('admin:payouts:*'),
      delCachePattern('user:orders:*'),
    ]).catch(() => {});

    const msg =
      validIds.length === 1
        ? `Akun ${usersToDelete[0].name} berhasil dihapus permanen.`
        : `${validIds.length} akun pengguna berhasil dihapus permanen.`;

    return NextResponse.json({
      success: true,
      message: msg,
      deletedCount: validIds.length,
    });
  } catch (error: any) {
    console.error('Error saat menghapus pengguna:', error);
    let friendlyError = 'Terjadi kesalahan sistem saat menghapus data pengguna.';
    const errMsg = String(error?.message || '');
    if (error?.code === 'P2003' || errMsg.includes('Foreign key') || errMsg.includes('foreign key')) {
      friendlyError = 'Tidak dapat menghapus akun karena masih memiliki keterkaitan data transaksi aktif.';
    }
    return NextResponse.json({ error: friendlyError }, { status: 500 });
  }
}
