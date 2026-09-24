import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache, delCachePattern } from '@/lib/redis';

// 1. GET: Ambil Rekap Dana Cash & Penyerahan Keuntungan Petani
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const cacheKey = 'admin:payouts:summary';
    const cachedData = await getCache<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Ambil semua order item yang tidak dibatalkan
    const soldItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: {
            not: 'DIBATALKAN',
          },
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            isPaid: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
        product: {
          select: {
            id: true,
            nama: true,
            imageUrl: true,
            satuan: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
    });

    // Kelompokkan data berdasarkan masing-masing Petani
    const petaniMap = new Map<string, any>();

    let totalKeseluruhanSiapCash = 0;
    let totalKeseluruhanSudahCash = 0;

    for (const item of soldItems) {
      const pId = item.petaniId;
      if (!petaniMap.has(pId)) {
        petaniMap.set(pId, {
          petani: item.petani,
          siapDicairkanCash: 0,
          sudahDiserahkanCash: 0,
          totalQtyTerjual: 0,
          pendingItems: [],
          completedItems: [],
        });
      }

      const pData = petaniMap.get(pId);
      const subtotalNum = Number(item.subtotal);
      pData.totalQtyTerjual += item.quantity;

      const formattedItem = {
        id: item.id,
        orderNumber: item.order.orderNumber,
        namaProduk: item.namaProduk,
        hargaPerSatuan: Number(item.hargaPerSatuan),
        satuan: item.satuan,
        quantity: item.quantity,
        subtotal: subtotalNum,
        payoutStatus: item.payoutStatus,
        payoutAt: item.payoutAt?.toISOString() || null,
        orderDate: item.order.createdAt.toISOString(),
        orderStatus: item.order.status,
        isPaid: item.order.isPaid,
      };

      if (item.payoutStatus === 'MENUNGGU_PENCAIRAN') {
        pData.siapDicairkanCash += subtotalNum;
        totalKeseluruhanSiapCash += subtotalNum;
        pData.pendingItems.push(formattedItem);
      } else {
        pData.sudahDiserahkanCash += subtotalNum;
        totalKeseluruhanSudahCash += subtotalNum;
        pData.completedItems.push(formattedItem);
      }
    }

    const petaniPayoutList = Array.from(petaniMap.values()).sort(
      (a, b) => b.siapDicairkanCash - a.siapDicairkanCash
    );

    const responseData = {
      success: true,
      petaniPayouts: petaniPayoutList,
      summary: {
        totalSiapDiserahkanCash: totalKeseluruhanSiapCash,
        totalSudahDiserahkanCash: totalKeseluruhanSudahCash,
        totalPetaniAktif: petaniPayoutList.length,
      },
    };

    // Cache for 60 seconds
    await setCache(cacheKey, responseData, 60);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error saat mengambil data pencairan cash petani:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pencairan cash petani' }, { status: 500 });
  }
}

// 2. POST: Admin Menyerahkan Uang Cash Fisik ke Petani (Tandai Lunas)
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
    const { petaniId, itemIds } = body;

    if (!petaniId && (!itemIds || itemIds.length === 0)) {
      return NextResponse.json({ error: 'ID Petani atau ID Item wajib ditentukan.' }, { status: 400 });
    }

    const whereClause: Record<string, any> = {
      payoutStatus: 'MENUNGGU_PENCAIRAN',
    };

    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      whereClause.id = { in: itemIds };
    } else if (petaniId) {
      whereClause.petaniId = petaniId;
    }

    // Ambil item yang akan dicairkan untuk menghitung total cash
    const targetItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: { petani: true },
    });

    if (targetItems.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada saldo tunai yang menunggu dicairkan untuk petani ini.' },
        { status: 400 }
      );
    }

    const totalCashHanded = targetItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const petaniName = targetItems[0]?.petani?.name || 'Petani';

    // Update status menjadi SUDAH_DICAIRKAN_CASH
    await prisma.orderItem.updateMany({
      where: whereClause,
      data: {
        payoutStatus: 'SUDAH_DICAIRKAN_CASH',
        payoutAt: new Date(),
      },
    });

    // Invalidate payout summary and petani dashboard caches
    await Promise.all([
      delCache('admin:payouts:summary'),
      delCachePattern('petani:dashboard:*'),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Uang tunai sebesar Rp ${totalCashHanded.toLocaleString('id-ID')} telah berhasil diserahkan ke ${petaniName}.`,
      totalCash: totalCashHanded,
      petaniName,
    });
  } catch (error: any) {
    console.error('Error penyerahan cash ke petani:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses penyerahan uang cash ke petani.' },
      { status: 500 }
    );
  }
}
