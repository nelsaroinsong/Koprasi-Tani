import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

// Batas waktu pembayaran (24 jam)
const AUTO_CANCEL_HOURS = 24;
const AUTO_CANCEL_MS = AUTO_CANCEL_HOURS * 60 * 60 * 1000;

// Helper: Batalkan pesanan kedaluwarsa secara otomatis dan kembalikan stok fisik (24 jam batas bayar di kasir)
async function checkAndAutoCancelExpiredOrder(order: any) {
  // Hitung mundur batas waktu pembayaran 24 jam HANYA berlaku ketika pesanan sudah di tahap SIAP_DIAMBIL
  if (order.status !== 'SIAP_DIAMBIL') {
    return order;
  }

  // Dihitung mundur sejak pesanan siap diambil (updatedAt), bukan dari awal checkout (createdAt)
  const readyAt = new Date(order.updatedAt || order.createdAt).getTime();
  const now = Date.now();
  const elapsed = now - readyAt;

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
            isPaid: false,
            paidAt: null,
            catatan: order.catatan
              ? `${order.catatan} (Otomatis dibatalkan sistem: Melewati batas waktu pembayaran 24 jam sejak siap diambil)`
              : '(Otomatis dibatalkan sistem: Melewati batas waktu pembayaran 24 jam sejak siap diambil)',
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

    // Validasi aturan pembatalan:
    // Pembeli HANYA bisa membatalkan saat masih sebagai Pesanan Masuk (MENUNGGU_PEMBAYARAN).
    // Jika sudah disiapkan gudang (DIPROSES) atau di kasir (SIAP_DIAMBIL), pembeli tidak bisa membatalkan manual.
    if (currentUser.role !== 'ADMIN') {
      if (order.status === 'DIPROSES') {
        return NextResponse.json(
          { error: 'Pesanan sudah sedang disiapkan di gudang dan tidak dapat dibatalkan.' },
          { status: 400 }
        );
      }
      if (order.status === 'SIAP_DIAMBIL') {
        return NextResponse.json(
          {
            error:
              'Pesanan sudah siap di kasir. Tidak dapat dibatalkan manual. Pesanan akan otomatis dibatalkan sistem jika belum dibayar dalam 24 jam.',
          },
          { status: 400 }
        );
      }
      if (order.status !== 'MENUNGGU_PEMBAYARAN') {
        return NextResponse.json(
          { error: 'Pesanan tidak dapat dibatalkan karena sudah selesai atau telah dibatalkan.' },
          { status: 400 }
        );
      }
    } else {
      // Admin tidak bisa membatalkan jika sudah selesai
      if (order.status === 'SELESAI' || order.status === 'DIBATALKAN') {
        return NextResponse.json(
          { error: 'Pesanan sudah selesai atau sudah dibatalkan sebelumnya.' },
          { status: 400 }
        );
      }
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
          isPaid: false,
          paidAt: null,
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
