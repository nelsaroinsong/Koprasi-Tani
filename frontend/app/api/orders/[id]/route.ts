import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

import {
  effectivePickupDeadline,
  expireOverduePickupOrders,
  PICKUP_WINDOW_HOURS,
} from '@/lib/order-lifecycle';

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
    const findOrder = () => prisma.order.findFirst({
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

    let order = await findOrder();

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Lewat batas ambil & bayar -> batalkan otomatis lalu ambil ulang data terbaru
    if (order.status === 'SIAP_DIAMBIL' && !order.isPaid) {
      const expired = await expireOverduePickupOrders({ orderId: order.id });
      if (expired > 0) order = (await findOrder()) ?? order;
    }

    // Kode ambil hanya untuk pemilik pesanan (pembeli), bukan admin/petani
    const isOwner = order.pembeliId === currentUser.id;
    const { pickupCode, ...orderWithoutCode } = order;

    return NextResponse.json({
      success: true,
      order: {
        ...orderWithoutCode,
        pickupCode: isOwner && order.status === 'SIAP_DIAMBIL' ? pickupCode : null,
        pickupDeadline: effectivePickupDeadline(order)?.toISOString() ?? null,
        pickupWindowHours: PICKUP_WINDOW_HOURS,
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
              `Pesanan sudah siap di kasir. Tidak dapat dibatalkan manual. Pesanan akan otomatis dibatalkan sistem jika belum diambil & dibayar dalam ${PICKUP_WINDOW_HOURS} jam.`,
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

      return await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DIBATALKAN',
          isPaid: false,
          paidAt: null,
          cancelledAt: new Date(),
          cancelReason:
            currentUser.role === 'ADMIN'
              ? alasanBatal?.trim() || 'Dibatalkan oleh admin koperasi'
              : alasanBatal?.trim()
                ? `Dibatalkan pembeli: ${alasanBatal.trim()}`
                : 'Dibatalkan oleh pembeli',
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
    await delCachePattern('product:detail:*');

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
