import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ACTIVE_ORDER = ['MENUNGGU_PEMBAYARAN', 'DIPROSES', 'SIAP_DIAMBIL'] as const;
const ACTIVE_RENTAL = ['MENUNGGU_PERSETUJUAN_ADMIN', 'DISETUJUI', 'DIKONFIRMASI', 'SIAP_DIAMBIL', 'SEDANG_DISEWA'] as const;

/**
 * GET: Ringkasan aktivitas 1 pengguna untuk dialog detail admin.
 * - PETANI : komoditas, penjualan, bagi hasil
 * - PEMBELI: pesanan toko & sewa alat
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    if (user.role === 'PETANI') {
      const [productCount, activeProductCount, soldItems, pendingPayout, paidPayout] = await Promise.all([
        prisma.product.count({ where: { petaniId: id } }),
        prisma.product.count({ where: { petaniId: id, isTersedia: true, stok: { gt: 0 } } }),
        prisma.orderItem.aggregate({
          where: { petaniId: id, order: { status: 'SELESAI' } },
          _sum: { subtotal: true, quantity: true },
          _count: true,
        }),
        prisma.orderItem.aggregate({
          where: { petaniId: id, payoutStatus: 'MENUNGGU_PENCAIRAN', order: { status: 'SELESAI', isPaid: true } },
          _sum: { subtotal: true },
        }),
        prisma.orderItem.aggregate({
          where: { petaniId: id, payoutStatus: 'SUDAH_DICAIRKAN_CASH' },
          _sum: { subtotal: true },
        }),
      ]);

      return NextResponse.json({
        success: true,
        role: 'PETANI',
        summary: {
          productCount,
          activeProductCount,
          soldTransactions: soldItems._count,
          soldAmount: Number(soldItems._sum.subtotal || 0),
          payoutPending: Number(pendingPayout._sum.subtotal || 0),
          payoutPaid: Number(paidPayout._sum.subtotal || 0),
        },
      });
    }

    const [orderTotal, orderActive, orderDone, orderCancelled, spent, rentalTotal, rentalActive, lastOrder] =
      await Promise.all([
        prisma.order.count({ where: { pembeliId: id } }),
        prisma.order.count({ where: { pembeliId: id, status: { in: [...ACTIVE_ORDER] } } }),
        prisma.order.count({ where: { pembeliId: id, status: 'SELESAI' } }),
        prisma.order.count({ where: { pembeliId: id, status: 'DIBATALKAN' } }),
        prisma.order.aggregate({ where: { pembeliId: id, status: 'SELESAI' }, _sum: { totalAmount: true } }),
        prisma.equipmentRental.count({ where: { userId: id } }),
        prisma.equipmentRental.count({ where: { userId: id, status: { in: [...ACTIVE_RENTAL] } } }),
        prisma.order.findFirst({
          where: { pembeliId: id },
          orderBy: { createdAt: 'desc' },
          select: { orderNumber: true, createdAt: true, status: true },
        }),
      ]);

    return NextResponse.json({
      success: true,
      role: user.role,
      summary: {
        orderTotal,
        orderActive,
        orderDone,
        orderCancelled,
        totalSpent: Number(spent._sum.totalAmount || 0),
        rentalTotal,
        rentalActive,
        lastOrder: lastOrder ? { ...lastOrder, createdAt: lastOrder.createdAt.toISOString() } : null,
      },
    });
  } catch (error: any) {
    console.error('Error ringkasan pengguna:', error);
    return NextResponse.json({ error: 'Gagal memuat ringkasan pengguna' }, { status: 500 });
  }
}
