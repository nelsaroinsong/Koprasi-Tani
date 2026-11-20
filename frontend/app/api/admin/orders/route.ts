import { NextResponse } from 'next/server';
import { actorFromSession, logAudit, rpAudit } from '@/lib/audit-log';
import { archiveMessage, archiveOrders } from '@/lib/archive';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCachePattern } from '@/lib/redis';
import { effectivePickupDeadline, expireOverduePickupOrders, stripPickupCode } from '@/lib/order-lifecycle';

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
    const methodParam = searchParams.get('method');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const isExport = searchParams.get('export') === 'true';
    const showArchived = searchParams.get('archived') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = isExport
      ? 1000
      : Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = isExport ? 0 : (page - 1) * limit;

    // Batalkan otomatis pesanan yang lewat batas ambil & bayar (sebelum membaca cache)
    await expireOverduePickupOrders();

    const cacheKey = `admin:orders:v5:a=${showArchived}:p=${page}:l=${limit}:s=${statusParam || 'all'}:m=${methodParam || 'all'}:sd=${startDateParam || ''}:ed=${endDateParam || ''}:q=${search || ''}:exp=${isExport}`;
    const cachedResponse = await getCache<any>(cacheKey);
    if (cachedResponse && !isExport) {
      return NextResponse.json(cachedResponse);
    }

    // Arsip disembunyikan dari daftar admin kecuali diminta (statistik tetap menghitung semua)
    const whereCondition: Record<string, any> = { archivedAt: showArchived ? { not: null } : null };

    if (
      statusParam &&
      statusParam !== 'ALL' &&
      ['MENUNGGU_PEMBAYARAN', 'DIPROSES', 'SIAP_DIAMBIL', 'SELESAI', 'DIBATALKAN'].includes(
        statusParam
      )
    ) {
      whereCondition.status = statusParam;
    }

    if (methodParam && ['CASH_KOPERASI', 'TRANSFER_KOPERASI'].includes(methodParam)) {
      whereCondition.paymentMethod = methodParam;
    }

    if (startDateParam || endDateParam) {
      whereCondition.createdAt = {};
      if (startDateParam) {
        whereCondition.createdAt.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        whereCondition.createdAt.lte = new Date(endDateParam);
      }
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
    const [
      totalCount,
      orders,
      allOrdersStats,
      totalProducts,
      totalEquipments,
      soldOrderItems,
    ] = await Promise.all([
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
          archivedAt: true,
        },
      }),
      prisma.product.count(),
      prisma.equipment.count(),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { not: 'DIBATALKAN' },
          },
        },
        select: {
          subtotal: true,
        },
      }),
    ]);

    // Hitung ringkasan statistik
    let totalOmset = 0;
    let pendingCount = 0;
    let diprosesCount = 0;
    let siapDiambilCount = 0;
    let selesaiCount = 0;
    let dibatalkanCount = 0;

    for (const ord of allOrdersStats) {
      if (ord.status !== 'DIBATALKAN') {
        totalOmset += Number(ord.totalAmount);
      }
      // Jumlah per tab mengikuti daftar yang tampil (arsip / non-arsip); omzet tetap menghitung semua
      if (Boolean(ord.archivedAt) !== showArchived) continue;
      if (ord.status === 'MENUNGGU_PEMBAYARAN') pendingCount++;
      if (ord.status === 'DIPROSES') diprosesCount++;
      if (ord.status === 'SIAP_DIAMBIL') siapDiambilCount++;
      if (ord.status === 'SELESAI') selesaiCount++;
      if (ord.status === 'DIBATALKAN') dibatalkanCount++;
    }

    // Hitung total kategori dari database
    let totalCategories = 0;
    try {
      const [productCats, equipmentCats] = await Promise.all([
        prisma.category.count(),
        prisma.equipmentCategory.count(),
      ]);
      totalCategories = productCats + equipmentCats;
    } catch {
      totalCategories = 0;
    }

    const totalHasilPetani = soldOrderItems.reduce((acc, it) => acc + Number(it.subtotal), 0);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const responseData = {
      success: true,
      orders: orders.map((o) => ({
        ...stripPickupCode(o),
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        paidAt: o.paidAt?.toISOString() || null,
        readyAt: o.readyAt?.toISOString() || null,
        completedAt: o.completedAt?.toISOString() || null,
        cancelledAt: o.cancelledAt?.toISOString() || null,
        pickupDeadline: effectivePickupDeadline(o)?.toISOString() ?? null,
        items: o.items.map((i) => ({
          ...i,
          hargaPerSatuan: Number(i.hargaPerSatuan),
          subtotal: Number(i.subtotal),
        })),
      })),
      stats: {
        totalProducts,
        totalEquipments,
        totalOrders: allOrdersStats.length,
        totalCategories,
        totalHasilPetani,
        totalOmset,
        pendingCount,
        diprosesCount,
        siapDiambilCount,
        selesaiCount,
        dibatalkanCount,
      },
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    };

    // Cache for 30 seconds (skip cache if export)
    if (!isExport) {
      await setCache(cacheKey, responseData, 30);
    }

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

    // Tidak pernah hapus permanen: arsipkan (hanya pesanan yang sudah Selesai / Dibatalkan)
    const result = await archiveOrders(orderIds.map(String), actorFromSession(session));
    if (result.archived.length === 0) {
      return NextResponse.json({ error: archiveMessage('pesanan', result), ...result }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: archiveMessage('pesanan', result), ...result });
  } catch (error: any) {
    console.error('Error saat menghapus pesanan admin:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus pesanan' },
      { status: 500 }
    );
  }
}
