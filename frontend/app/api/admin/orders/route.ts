import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCachePattern } from '@/lib/redis';

// 1. GET: Ambil seluruh daftar pesanan masuk untuk Admin Koperasi
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
    const statusParam = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const cacheKey = `admin:orders:p=${page}:l=${limit}:s=${statusParam || 'all'}:q=${search || ''}`;
    const cachedResponse = await getCache<any>(cacheKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const whereCondition: Record<string, any> = {};

    if (
      statusParam &&
      statusParam !== 'ALL' &&
      ['MENUNGGU_PEMBAYARAN', 'DIPROSES', 'SIAP_DIAMBIL', 'SELESAI', 'DIBATALKAN'].includes(
        statusParam
      )
    ) {
      whereCondition.status = statusParam;
    }

    if (search) {
      whereCondition.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { catatan: { contains: search, mode: 'insensitive' } },
        { alamatKirim: { contains: search, mode: 'insensitive' } },
        {
          pembeli: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          items: {
            some: {
              namaProduk: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // Ambil data pesanan, total count, dan ringkasan metrik statistik secara paralel
    const [totalCount, orders, allOrdersStats] = await Promise.all([
      prisma.order.count({ where: whereCondition }),
      prisma.order.findMany({
        where: whereCondition,
        include: {
          pembeli: {
            select: { id: true, name: true, email: true, phone: true, avatarUrl: true, address: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, nama: true, imageUrl: true, satuan: true },
              },
              petani: {
                select: { id: true, name: true, phone: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.findMany({
        select: {
          status: true,
          totalAmount: true,
          isPaid: true,
        },
      }),
    ]);

    // Hitung ringkasan statistik
    let totalOmset = 0;
    let pendingCount = 0;
    let diprosesCount = 0;
    let selesaiCount = 0;

    for (const ord of allOrdersStats) {
      if (ord.status !== 'DIBATALKAN') {
        totalOmset += Number(ord.totalAmount);
      }
      if (ord.status === 'MENUNGGU_PEMBAYARAN') pendingCount++;
      if (ord.status === 'DIPROSES' || ord.status === 'SIAP_DIAMBIL') diprosesCount++;
      if (ord.status === 'SELESAI') selesaiCount++;
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const responseData = {
      success: true,
      orders: orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        paidAt: o.paidAt?.toISOString() || null,
        items: o.items.map((i) => ({
          ...i,
          hargaPerSatuan: Number(i.hargaPerSatuan),
          subtotal: Number(i.subtotal),
        })),
      })),
      stats: {
        totalOrders: allOrdersStats.length,
        totalOmset,
        pendingCount,
        diprosesCount,
        selesaiCount,
      },
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    };

    // Cache for 30 seconds
    await setCache(cacheKey, responseData, 30);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error saat mengambil pesanan admin:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pesanan' }, { status: 500 });
  }
}

// 2. DELETE: Hapus banyak pesanan sekaligus (Bulk Delete)
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { orderIds } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Daftar ID pesanan tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Ambil order beserta item komoditas untuk mengembalikan stok jika pesanan belum selesai/dibatalkan
    const ordersToDelete = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { items: true },
    });

    if (ordersToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data pesanan yang cocok untuk dihapus' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Kembalikan stok untuk pesanan aktif
      for (const ord of ordersToDelete) {
        if (ord.status !== 'DIBATALKAN' && ord.status !== 'SELESAI') {
          for (const item of ord.items) {
            await tx.product
              .update({
                where: { id: item.productId },
                data: {
                  stok: {
                    increment: item.quantity,
                  },
                },
              })
              .catch(() => {});
          }
        }
      }

      // Hapus seluruh pesanan (cascade ke order_items)
      await tx.order.deleteMany({
        where: { id: { in: orderIds } },
      });
    });

    // Invalidate Redis caches
    await Promise.all([
      delCachePattern('admin:orders:*'),
      delCachePattern('user:orders:*'),
      delCachePattern('products:*'),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `${ordersToDelete.length} pesanan berhasil dihapus dari sistem.`,
    });
  } catch (error: any) {
    console.error('Error saat menghapus pesanan admin:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus pesanan' },
      { status: 500 }
    );
  }
}
