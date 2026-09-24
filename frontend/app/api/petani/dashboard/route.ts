import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

    for (const item of soldItems) {
      totalKuantitasTerjual += item.quantity;
      const subtotalNum = Number(item.subtotal);
      if (item.payoutStatus === 'MENUNGGU_PENCAIRAN') {
        cashSiapDiambil += subtotalNum;
      } else {
        cashSudahDiterima += subtotalNum;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalKomoditasDidaftarkan: products.length,
        totalStokGudang: totalStokFisik,
        totalKuantitasTerjual,
        cashSiapDiambil,
        cashSudahDiterima,
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
      })),
    });
  } catch (error) {
    console.error('Error saat mengambil dashboard petani:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dashboard petani' }, { status: 500 });
  }
}
