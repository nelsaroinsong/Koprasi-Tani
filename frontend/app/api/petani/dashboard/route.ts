import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const cacheKey = `petani:dashboard:v2:${currentUser.id}`;
    const cachedData = await getCache<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Ambil semua komoditas fisik milik petani di gudang koperasi
    const products = await prisma.product.findMany({
      where: { petaniId: currentUser.id },
      select: { id: true, nama: true, stok: true, satuan: true, hargaPerSatuan: true, isTersedia: true },
    });

    // Ambil semua riwayat penjualan panen petani ini
    const soldItems = await prisma.orderItem.findMany({
      where: {
        petaniId: currentUser.id,
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
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalStokFisik = 0;
    for (const p of products) {
      totalStokFisik += p.stok;
    }

    let totalKuantitasTerjual = 0;
    let cashSiapDiambil = 0;
    let cashSudahDiterima = 0;
    let cashMenungguPembeli = 0;

    for (const item of soldItems) {
      const subtotalNum = Number(item.subtotal);
      const isOrderCompleted = item.order.status === 'SELESAI' && item.order.isPaid;
      // "Terjual" hanya dari pesanan yang benar-benar selesai (pesanan aktif masih bisa batal)
      if (isOrderCompleted) totalKuantitasTerjual += item.quantity;
      if (item.payoutStatus === 'MENUNGGU_PENCAIRAN' && !isOrderCompleted) {
        // Pembeli belum menyelesaikan pembayaran/pengambilan: belum bisa dicairkan
        cashMenungguPembeli += subtotalNum;
      } else if (item.payoutStatus === 'MENUNGGU_PENCAIRAN') {
        cashSiapDiambil += subtotalNum;
      } else {
        cashSudahDiterima += subtotalNum;
      }
    }

    const responseData = {
      success: true,
      stats: {
        totalKomoditasDidaftarkan: products.length,
        totalStokGudang: totalStokFisik,
        totalKuantitasTerjual,
        cashSiapDiambil,
        cashSudahDiterima,
        cashMenungguPembeli,
      },
      recentSales: soldItems.slice(0, 10).map((i) => ({
        id: i.id,
        orderNumber: i.order.orderNumber,
        namaProduk: i.namaProduk,
        quantity: i.quantity,
        satuan: i.satuan,
        subtotal: Number(i.subtotal),
        payoutStatus: i.payoutStatus,
        payoutAt: i.payoutAt?.toISOString() || null,
        orderDate: i.order.createdAt.toISOString(),
        // Untuk membedakan "siap diambil" vs "menunggu pesanan pembeli selesai"
        orderStatus: i.order.status,
        orderPaid: i.order.isPaid,
      })),
    };

    // Cache for 3 minutes (180 seconds)
    await setCache(cacheKey, responseData, 180);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error saat mengambil dashboard petani:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dashboard petani' }, { status: 500 });
  }
}
