import { NextResponse } from 'next/server';
import { actorFromSession, logAudit, rpAudit } from '@/lib/audit-log';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

// 1. READ: Ambil daftar seluruh produk untuk admin dengan pagination, search, dan filter
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
    const search = searchParams.get('q')?.trim();
    const kategori = searchParams.get('kategori');
    const statusParam = searchParams.get('status');

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '8', 10)));
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, any> = {};

    if (kategori && kategori !== 'SEMUA') {
      whereCondition.kategori = { equals: kategori, mode: 'insensitive' };
    }

    if (statusParam === 'AVAILABLE') {
      whereCondition.isTersedia = true;
    } else if (statusParam === 'UNAVAILABLE') {
      whereCondition.isTersedia = false;
    }

    if (search) {
      whereCondition.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } },
        { kategori: { contains: search, mode: 'insensitive' } },
        {
          petani: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Query data produk, total count, stats, dan opsi petani secara paralel
    const [totalCount, totalAll, activeCount, inactiveCount, totalStockAgg, products, petaniUsers] = await Promise.all([
      prisma.product.count({ where: whereCondition }),
      prisma.product.count(),
      prisma.product.count({ where: { isTersedia: true, stok: { gt: 0 } } }),
      prisma.product.count({ where: { OR: [{ isTersedia: false }, { stok: { lte: 0 } }] } }),
      prisma.product.aggregate({
        _sum: { stok: true },
      }),
      prisma.product.findMany({
        where: whereCondition,
        include: {
          petani: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.findMany({
        where: {
          role: 'PETANI',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      stats: {
        total: totalAll,
        active: activeCount,
        inactive: inactiveCount,
        totalStok: totalStockAgg._sum.stok ?? 0,
      },
      products: products.map((p) => ({
        id: p.id,
        nama: p.nama,
        deskripsi: p.deskripsi,
        kategori: p.kategori,
        hargaPerSatuan: Number(p.hargaPerSatuan),
        satuan: p.satuan,
        stok: p.stok,
        imageUrl: p.imageUrl,
        isTersedia: p.isTersedia,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        petaniId: p.petaniId,
        petani: p.petani,
      })),
      petaniOptions: petaniUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error saat mengambil data produk admin:', error);
    return NextResponse.json({ error: 'Gagal mengambil data produk' }, { status: 500 });
  }
}

// 2. CREATE: Tambah komoditas baru oleh Admin
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
      nama,
      deskripsi,
      kategori,
      hargaPerSatuan,
      satuan,
      stok,
      imageUrl,
      petaniId,
      isTersedia = true,
    } = body;

    if (!nama || !kategori || !hargaPerSatuan) {
      return NextResponse.json(
        { error: 'Nama, kategori, dan harga per satuan wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi Wajib Mitra Petani (Hanya akun role PETANI, admin & pembeli tidak diizinkan)
    if (!petaniId || !String(petaniId).trim()) {
      return NextResponse.json(
        { error: 'Mitra petani wajib dipilih. Komoditas harus terhubung ke akun Petani Mitra terdaftar.' },
        { status: 400 }
      );
    }

    const farmer = await prisma.user.findUnique({
      where: { id: String(petaniId).trim() },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!farmer) {
      return NextResponse.json(
        { error: 'Akun mitra petani tidak ditemukan di database koperasi.' },
        { status: 404 }
      );
    }

    if (farmer.role !== 'PETANI') {
      return NextResponse.json(
        {
          error: `Akun "${farmer.email}" terdaftar sebagai "${farmer.role}". Komoditas wajib dimiliki oleh akun dengan role PETANI (bukan akun Admin atau Pembeli).`,
        },
        { status: 400 }
      );
    }

    const targetPetaniId = farmer.id;

    const newProduct = await prisma.product.create({
      data: {
        nama: nama.trim(),
        deskripsi: deskripsi?.trim() || null,
        kategori: kategori.trim(),
        hargaPerSatuan: parseFloat(hargaPerSatuan),
        satuan: satuan?.trim() || 'kg',
        stok: parseInt(stok, 10) || 0,
        imageUrl: imageUrl?.trim() || null,
        isTersedia: Boolean(isTersedia),
        petaniId: targetPetaniId,
      },
      include: {
        petani: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Invalidate product catalog and farmer caches
    await Promise.all([
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

    await logAudit({
      actor: actorFromSession(session),
      action: 'PRODUCT_CREATE',
      entityType: 'PRODUCT',
      entityId: newProduct.id,
      entityLabel: newProduct.nama,
      summary: `Menambah produk "${newProduct.nama}" — ${rpAudit(newProduct.hargaPerSatuan)}/${newProduct.satuan}, stok ${newProduct.stok}`,
    });

    return NextResponse.json({
      success: true,
      product: {
        ...newProduct,
        hargaPerSatuan: Number(newProduct.hargaPerSatuan),
      },
    });
  } catch (error) {
    console.error('Error create product by admin:', error);
    return NextResponse.json({ error: 'Gagal menambahkan komoditas baru' }, { status: 500 });
  }
}

// 3. DELETE: Hapus komoditas tunggal atau massal oleh Admin
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
    const idsQuery = searchParams.get('ids');
    const singleId = searchParams.get('id');

    let idsToDelete: string[] = [];

    if (idsQuery) {
      idsToDelete = idsQuery.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (singleId) {
      idsToDelete = [singleId];
    } else {
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids;
        } else if (body?.id) {
          idsToDelete = [body.id];
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'ID produk tidak diberikan' }, { status: 400 });
    }

    // Produk yang sudah pernah terjual tidak boleh dihapus (riwayat penjualan & bagi hasil akan hilang)
    const soldRows = await prisma.orderItem.findMany({
      where: { productId: { in: idsToDelete } },
      select: { productId: true },
      distinct: ['productId'],
    });
    const soldIds = new Set(soldRows.map((r) => r.productId));
    const requestedCount = idsToDelete.length;
    idsToDelete = idsToDelete.filter((pid) => !soldIds.has(pid));
    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { error: requestedCount > 1 ? 'Semua produk terpilih sudah pernah terjual sehingga tidak bisa dihapus. Matikan "Tersedia" agar tidak tampil di toko.' : 'Produk ini sudah pernah terjual, jadi tidak bisa dihapus (riwayat penjualan & bagi hasil petani akan hilang). Matikan "Tersedia" agar tidak tampil di toko.', code: 'HAS_SALES' },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hapus reviews terkait produk
      await tx.review.deleteMany({
        where: { productId: { in: idsToDelete } },
      });

      // 2. Ambil list order yang memuat item produk ini
      const relatedItems = await tx.orderItem.findMany({
        where: { productId: { in: idsToDelete } },
        select: { orderId: true },
      });
      const orderIds = Array.from(new Set(relatedItems.map((item) => item.orderId)));

      // 3. Hapus order_items terkait produk
      await tx.orderItem.deleteMany({
        where: { productId: { in: idsToDelete } },
      });

      // 4. Bersihkan data pesanan yang kosong jika seluruh itemnya telah dihapus
      for (const orderId of orderIds) {
        const remainingCount = await tx.orderItem.count({
          where: { orderId },
        });
        if (remainingCount === 0) {
          await tx.order.delete({
            where: { id: orderId },
          });
        }
      }

      // 5. Hapus produk
      await tx.product.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    });

    // Invalidate caches
    await Promise.all([
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
      delCachePattern('petani:*'),
      delCachePattern('admin:orders:*'),
      delCachePattern('admin:payouts:*'),
      delCachePattern('user:orders:*'),
    ]).catch(() => {});

    await logAudit({
      actor: actorFromSession(session),
      action: 'PRODUCT_DELETE',
      entityType: 'PRODUCT',
      entityId: idsToDelete.length === 1 ? idsToDelete[0] : null,
      summary: `Menghapus ${idsToDelete.length} produk yang belum pernah terjual${soldIds.size ? ` (${soldIds.size} dilewati karena sudah terjual)` : ''}`,
      details: { deleted: idsToDelete, skipped: [...soldIds] },
    });

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length} produk berhasil dihapus${soldIds.size ? `; ${soldIds.size} produk dilewati karena sudah pernah terjual` : ''}`,
    });
  } catch (error) {
    console.error('Error delete products by admin:', error);
    return NextResponse.json({ error: 'Gagal menghapus produk' }, { status: 500 });
  }
}
