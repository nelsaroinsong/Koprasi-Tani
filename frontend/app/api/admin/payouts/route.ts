import { NextResponse } from 'next/server';
import { actorFromSession, logAudit, rpAudit } from '@/lib/audit-log';
import { notifyPayoutPaid } from '@/lib/user-notifications';
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
    let totalKeseluruhanMenungguPembeli = 0;

    for (const item of soldItems) {
      const pId = item.petaniId;
      if (!petaniMap.has(pId)) {
        petaniMap.set(pId, {
          petani: item.petani,
          siapDicairkanCash: 0,
          sudahDiserahkanCash: 0,
          totalQtyTerjual: 0,
          menungguPembeliCash: 0,
          pendingItems: [],
          awaitingItems: [],
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

      // Hak petani baru boleh dicairkan setelah pesanan SELESAI (lunas & barang diserahkan)
      const isOrderCompleted = item.order.status === 'SELESAI' && item.order.isPaid;

      if (item.payoutStatus === 'MENUNGGU_PENCAIRAN' && !isOrderCompleted) {
        pData.menungguPembeliCash += subtotalNum;
        totalKeseluruhanMenungguPembeli += subtotalNum;
        pData.awaitingItems.push(formattedItem);
      } else if (item.payoutStatus === 'MENUNGGU_PENCAIRAN') {
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
        totalMenungguPembeliCash: totalKeseluruhanMenungguPembeli,
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
      // Hanya item dari pesanan yang sudah SELESAI & lunas yang boleh dicairkan
      order: { status: 'SELESAI', isPaid: true },
    };

    // Cairkan persis item yang dilihat admin di dialog konfirmasi (itemIds),
    // agar jumlah uang yang diserahkan sama dengan yang tercatat.
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      whereClause.id = { in: itemIds.map(String) };
    }
    if (petaniId) {
      whereClause.petaniId = petaniId;
    }

    // Ambil & tandai dalam satu transaksi; tolak jika sebagian sudah diproses permintaan lain (klik ganda)
    let targetItems;
    try {
      targetItems = await prisma.$transaction(async (tx) => {
        const items = await tx.orderItem.findMany({ where: whereClause, include: { petani: true } });
        if (items.length === 0) return items;
        if (Array.isArray(itemIds) && itemIds.length > 0 && items.length !== itemIds.length) {
          throw new Error('STALE');
        }
        const updated = await tx.orderItem.updateMany({
          where: { id: { in: items.map((i) => i.id) }, payoutStatus: 'MENUNGGU_PENCAIRAN' },
          data: { payoutStatus: 'SUDAH_DICAIRKAN_CASH', payoutAt: new Date() },
        });
        if (updated.count !== items.length) throw new Error('STALE');
        return items;
      });
    } catch (err: any) {
      if (err?.message === 'STALE') {
        return NextResponse.json(
          { error: 'Data bagi hasil berubah (mungkin sudah dicairkan dari perangkat lain). Muat ulang lalu cek kembali jumlahnya.' },
          { status: 409 }
        );
      }
      throw err;
    }

    if (targetItems.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada saldo yang siap dicairkan. Hak petani baru bisa dicairkan setelah pesanan pembeli selesai dan lunas.' },
        { status: 400 }
      );
    }

    const totalCashHanded = targetItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const petaniName = targetItems[0]?.petani?.name || 'Petani';

    // Beri tahu petani bahwa uang tunai sudah diserahkan (dikelompokkan per petani)
    const perPetani = new Map<string, { total: number; count: number; ids: string[] }>();
    for (const it of targetItems) {
      if (!it.petaniId) continue;
      const cur = perPetani.get(it.petaniId) || { total: 0, count: 0, ids: [] };
      cur.total += Number(it.subtotal);
      cur.count += 1;
      cur.ids.push(it.id);
      perPetani.set(it.petaniId, cur);
    }
    for (const [pid, info] of perPetani) {
      notifyPayoutPaid(pid, info.total, info.count, info.ids.sort().join(',').slice(0, 180));
      await logAudit({
        actor: actorFromSession(session),
        action: 'PAYOUT_CASH',
        entityType: 'PAYOUT',
        entityId: pid,
        entityLabel: targetItems.find((t) => t.petaniId === pid)?.petani?.name || 'Petani',
        summary: `Menyerahkan tunai ${rpAudit(info.total)} ke ${targetItems.find((t) => t.petaniId === pid)?.petani?.name || 'petani'} (${info.count} item)`,
        details: { total: info.total, orderItemIds: info.ids },
      });
    }

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
