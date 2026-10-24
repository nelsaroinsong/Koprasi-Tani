import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, isPaid } = body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    if (status !== undefined && status !== existingOrder.status) {
      // 1. Guard pesanan final: Selesai atau Dibatalkan tidak boleh diubah lagi
      if (existingOrder.status === 'SELESAI') {
        return NextResponse.json(
          { error: 'Pesanan telah selesai dan lunas. Status tidak dapat diubah lagi.' },
          { status: 400 }
        );
      }

      if (existingOrder.status === 'DIBATALKAN') {
        return NextResponse.json(
          { error: 'Pesanan telah dibatalkan. Status tidak dapat diubah kembali.' },
          { status: 400 }
        );
      }

      // 2. Guard transisi status yang sah (Forward-only & Batal)
      const VALID_TRANSITIONS: Record<string, string[]> = {
        MENUNGGU_PEMBAYARAN: ['DIPROSES', 'DIBATALKAN'],
        DIPROSES: ['SIAP_DIAMBIL', 'DIBATALKAN'],
        SIAP_DIAMBIL: ['SELESAI', 'DIBATALKAN'],
      };

      const allowedNext = VALID_TRANSITIONS[existingOrder.status] || [];
      if (!allowedNext.includes(status)) {
        return NextResponse.json(
          { error: `Transisi status tidak sah dari ${existingOrder.status} ke ${status}.` },
          { status: 400 }
        );
      }
    }

    // Jalankan transaksi database
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, any> = {};

      if (status !== undefined) {
        updateData.status = status;

        // Pembayaran lunas diterima saat pesanan selesai / serah terima fisik di kasir
        if (status === 'SELESAI') {
          updateData.isPaid = true;
          if (!existingOrder.paidAt) {
            updateData.paidAt = new Date();
          }
        }

        // Jika status DIBATALKAN dan sebelumnya belum dibatalkan, KEMBALIKAN STOK FISIK KE GUDANG KOPERASI!
        if (status === 'DIBATALKAN' && existingOrder.status !== 'DIBATALKAN') {
          for (const item of existingOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stok: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }

      if (isPaid !== undefined) {
        updateData.isPaid = Boolean(isPaid);
        if (Boolean(isPaid) && !existingOrder.paidAt) {
          updateData.paidAt = new Date();
        }
      }

      const orderResult = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          pembeli: true,
          items: {
            include: {
              product: true,
              petani: true,
            },
          },
        },
      });

      return orderResult;
    });

    // Invalidate Redis caches
    await Promise.all([
      delCachePattern('admin:orders:*'),
      delCachePattern('user:orders:*'),
      delCachePattern('products:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Status pesanan berhasil diperbarui.',
      order: {
        ...updatedOrder,
        totalAmount: Number(updatedOrder.totalAmount),
        createdAt: updatedOrder.createdAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
        paidAt: updatedOrder.paidAt?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error('Error saat update status pesanan admin:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui status pesanan.' },
      { status: 500 }
    );
  }
}

// 2. DELETE: Hapus 1 pesanan berdasarkan ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { id } = await params;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Kembalikan stok jika belum dibatalkan/selesai
      if (existingOrder.status !== 'DIBATALKAN' && existingOrder.status !== 'SELESAI') {
        for (const item of existingOrder.items) {
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

      await tx.order.delete({
        where: { id },
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
      message: `Pesanan #${existingOrder.orderNumber} berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error saat menghapus pesanan admin:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus pesanan' },
      { status: 500 }
    );
  }
}
