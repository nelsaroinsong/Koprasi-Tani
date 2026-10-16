import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

// Batas waktu pembayaran (72 jam)
const AUTO_CANCEL_HOURS = 72;
const AUTO_CANCEL_MS = AUTO_CANCEL_HOURS * 60 * 60 * 1000;

// Helper: Batalkan pesanan kedaluwarsa secara otomatis dan kembalikan stok fisik
async function checkAndAutoCancelExpiredOrder(order: any) {
  if (order.status !== 'MENUNGGU_PEMBAYARAN') return order;

  const createdAt = new Date(order.createdAt).getTime();
  const now = Date.now();
  const elapsed = now - createdAt;

  if (elapsed >= AUTO_CANCEL_MS) {
    try {
      const canceled = await prisma.$transaction(async (tx) => {
        // Kembalikan stok produk
        for (const item of order.items) {
          if (item.productId && item.quantity > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stok: { increment: item.quantity },
              },
            });
          }
        }

        // Update status order
        return await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'DIBATALKAN',
            catatan: order.catatan
              ? `${order.catatan} (Otomatis dibatalkan sistem: Melewati batas pembayaran 72 jam)`
              : '(Otomatis dibatalkan sistem: Melewati batas pembayaran 72 jam)',
          },
          include: {
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
            pembeli: {
              select: { id: true, name: true, phone: true, address: true, email: true },
            },
          },
        });
      });

      await delCachePattern('user:orders:*');
      await delCachePattern('products:*');
      return canceled;
    } catch (err) {
      console.error('Error auto-canceling order:', err);
      return order;
    }
  }

  return order;
}

// 1. GET: Ambil detail 1 pesanan
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const targetId = decodeURIComponent(id);

    // Cari pesanan berdasarkan ID atau OrderNumber dengan AND kondisi otorisasi
    let order = await prisma.order.findFirst({
      where: {
        AND: [
          {
            OR: [{ id: targetId }, { orderNumber: targetId }],
          },
          ...(currentUser.role !== 'ADMIN'
            ? [
                {
                  OR: [
                    { pembeliId: currentUser.id },
                    { items: { some: { petaniId: currentUser.id } } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
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
        pembeli: {
          select: { id: true, name: true, phone: true, address: true, email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Periksa apakah sudah melewati batas 72 jam
    order = await checkAndAutoCancelExpiredOrder(order);

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        totalAmount: Number(order.totalAmount),
        items: (order.items || []).map((i: any) => ({
          ...i,
          hargaPerSatuan: Number(i.hargaPerSatuan),
          subtotal: Number(i.subtotal),
        })),
      },
    });
  } catch (error) {
    console.error('Error saat mengambil detail pesanan:', error);
    return NextResponse.json({ error: 'Gagal mengambil detail pesanan' }, { status: 500 });
  }
}

// 2. PATCH: Batalkan pesanan oleh Pembeli (Hanya jika belum bayar / MENUNGGU_PEMBAYARAN)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const targetId = decodeURIComponent(id);
    const body = await request.json().catch(() => ({}));
    const { action, alasanBatal } = body;

    if (action !== 'CANCEL') {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    // Cari pesanan
    const order = await prisma.order.findFirst({
      where: {
        AND: [
          { OR: [{ id: targetId }, { orderNumber: targetId }] },
          ...(currentUser.role !== 'ADMIN' ? [{ pembeliId: currentUser.id }] : []),
        ],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Validasi status: HANYA bisa dibatalkan jika belum bayar / MENUNGGU_PEMBAYARAN
    if (order.status !== 'MENUNGGU_PEMBAYARAN') {
      return NextResponse.json(
        {
          error:
            'Pesanan tidak dapat dibatalkan karena sudah diproses atau telah dibayar di kasir koperasi.',
        },
        { status: 400 }
      );
    }

    // Jalankan transaksi pembatalan dan kembalikan stok fisik
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Kembalikan stok produk
      for (const item of order.items) {
        if (item.productId && item.quantity > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stok: { increment: item.quantity },
            },
          });
        }
      }

      const noteSuffix = alasanBatal
        ? ` (Dibatalkan pembeli: ${alasanBatal})`
        : ' (Dibatalkan oleh pembeli)';

      return await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DIBATALKAN',
          catatan: order.catatan ? `${order.catatan}${noteSuffix}` : noteSuffix.trim(),
        },
        include: {
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
          pembeli: {
            select: { id: true, name: true, phone: true, address: true, email: true },
          },
        },
      });
    });

    await delCachePattern('user:orders:*');
    await delCachePattern('products:*');

    return NextResponse.json({
      success: true,
      message: 'Pesanan berhasil dibatalkan. Stok komoditas telah dikembalikan ke katalog.',
      order: {
        ...updatedOrder,
        totalAmount: Number(updatedOrder.totalAmount),
        items: updatedOrder.items.map((i: any) => ({
          ...i,
          hargaPerSatuan: Number(i.hargaPerSatuan),
          subtotal: Number(i.subtotal),
        })),
      },
    });
  } catch (error) {
    console.error('Error saat membatalkan pesanan:', error);
    return NextResponse.json({ error: 'Gagal membatalkan pesanan' }, { status: 500 });
  }
}
