import { NextResponse } from 'next/server';
import { actorFromSession, logAudit, rpAudit } from '@/lib/audit-log';
import { archiveMessage, archiveOrders } from '@/lib/archive';
import { notifyOrderStatus } from '@/lib/user-notifications';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';
import {
  computePickupDeadline,
  effectivePickupDeadline,
  expireOverduePickupOrders,
  extendPickupDeadline,
  generatePickupCode,
  normalizePickupCode,
  PICKUP_WINDOW_HOURS,
  stripPickupCode,
} from '@/lib/order-lifecycle';

const VALID_TRANSITIONS: Record<string, string[]> = {
  MENUNGGU_PEMBAYARAN: ['DIPROSES', 'DIBATALKAN'],
  DIPROSES: ['SIAP_DIAMBIL', 'DIBATALKAN'],
  SIAP_DIAMBIL: ['SELESAI', 'DIBATALKAN'],
};

/**
 * PATCH body (admin):
 * - { status }                         ubah status (alur maju / batal)
 * - { status: 'SELESAI', pickupCode }  serah terima: wajib kode ambil 6 digit dari pembeli
 * - { status: 'DIBATALKAN', cancelReason? }
 * - { action: 'EXTEND_PICKUP' }        perpanjang batas ambil +24 jam
 * - { isPaid }                         tandai lunas / belum
 */
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
    const body = await request.json().catch(() => ({}));
    const { status, isPaid, action, cancelReason } = body;

    // Pastikan pesanan yang sudah lewat batas tidak bisa "diselamatkan" diam-diam
    await expireOverduePickupOrders({ orderId: id });

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const isExtend = action === 'EXTEND_PICKUP';
    const isStatusChange = status !== undefined && status !== existingOrder.status;

    if (isExtend && existingOrder.status !== 'SIAP_DIAMBIL') {
      return NextResponse.json(
        {
          error:
            existingOrder.status === 'DIBATALKAN'
              ? 'Pesanan sudah dibatalkan (kemungkinan lewat batas ambil), batas waktu tidak bisa diperpanjang.'
              : 'Batas waktu hanya bisa diperpanjang untuk pesanan yang siap diambil.',
        },
        { status: 400 }
      );
    }

    if (isStatusChange) {
      // 1. Guard pesanan final: Selesai atau Dibatalkan tidak boleh diubah lagi
      if (existingOrder.status === 'SELESAI') {
        return NextResponse.json(
          { error: 'Pesanan telah selesai dan lunas. Status tidak dapat diubah lagi.' },
          { status: 400 }
        );
      }

      if (existingOrder.status === 'DIBATALKAN') {
        return NextResponse.json(
          {
            error: existingOrder.cancelReason
              ? `Pesanan telah dibatalkan (${existingOrder.cancelReason}). Status tidak dapat diubah kembali.`
              : 'Pesanan telah dibatalkan. Status tidak dapat diubah kembali.',
          },
          { status: 400 }
        );
      }

      // 2. Guard transisi status yang sah (Forward-only & Batal)
      const allowedNext = VALID_TRANSITIONS[existingOrder.status] || [];
      if (!allowedNext.includes(status)) {
        return NextResponse.json(
          { error: `Transisi status tidak sah dari ${existingOrder.status} ke ${status}.` },
          { status: 400 }
        );
      }

      // 3. Serah terima wajib kode ambil dari pembeli (pesanan lama tanpa kode tetap bisa diselesaikan)
      if (status === 'SELESAI' && existingOrder.pickupCode) {
        const code = normalizePickupCode(body.pickupCode);
        if (code.length !== 6) {
          return NextResponse.json(
            { error: 'Masukkan 6 digit kode ambil yang ditunjukkan pembeli.', code: 'PICKUP_CODE_REQUIRED' },
            { status: 400 }
          );
        }
        if (code !== existingOrder.pickupCode) {
          return NextResponse.json(
            { error: 'Kode ambil tidak cocok. Periksa kembali kode di HP pembeli.', code: 'PICKUP_CODE_INVALID' },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date();

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, any> = {};

      if (isExtend) {
        updateData.pickupDeadline = extendPickupDeadline(effectivePickupDeadline(existingOrder), now);
      }

      if (isStatusChange) {
        updateData.status = status;

        if (status === 'SIAP_DIAMBIL') {
          updateData.readyAt = now;
          updateData.pickupDeadline = computePickupDeadline(now);
          updateData.pickupCode = generatePickupCode();
        }

        // Pembayaran lunas diterima saat pesanan selesai / serah terima fisik di kasir
        if (status === 'SELESAI') {
          updateData.isPaid = true;
          updateData.completedAt = now;
          if (!existingOrder.paidAt) {
            updateData.paidAt = now;
          }
        }

        // Jika status DIBATALKAN, pastikan status bayar false dan KEMBALIKAN STOK FISIK KE GUDANG KOPERASI!
        if (status === 'DIBATALKAN') {
          updateData.isPaid = false;
          updateData.paidAt = null;
          updateData.cancelledAt = now;
          updateData.cancelReason =
            typeof cancelReason === 'string' && cancelReason.trim()
              ? cancelReason.trim().slice(0, 300)
              : 'Dibatalkan oleh admin koperasi';

          for (const item of existingOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stok: { increment: item.quantity } },
            });
          }
        }
      }

      if (isPaid !== undefined && status !== 'DIBATALKAN' && existingOrder.status !== 'DIBATALKAN') {
        updateData.isPaid = Boolean(isPaid);
        if (Boolean(isPaid) && !existingOrder.paidAt) {
          updateData.paidAt = now;
        } else if (!Boolean(isPaid)) {
          updateData.paidAt = null;
        }
      }

      return tx.order.update({
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
    });

    // Invalidate Redis caches
    await Promise.all([
      delCachePattern('admin:orders:*'),
      delCachePattern('user:orders:*'),
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

    // Beri tahu pembeli (dan petani saat selesai) tentang perubahan ini
    if (isExtend) notifyOrderStatus(updatedOrder, { extended: true });
    else if (isStatusChange) notifyOrderStatus(updatedOrder);

    // Log aktivitas admin
    const actor = actorFromSession(session);
    const label = `#${updatedOrder.orderNumber}`;
    if (isExtend) {
      await logAudit({
        actor, action: 'ORDER_EXTEND_PICKUP', entityType: 'ORDER', entityId: id, entityLabel: label,
        summary: `Memperpanjang batas ambil pesanan ${label}`,
        details: { pickupDeadline: updatedOrder.pickupDeadline },
      });
    } else if (isStatusChange) {
      await logAudit({
        actor, action: 'ORDER_STATUS', entityType: 'ORDER', entityId: id, entityLabel: label,
        summary: `Status pesanan ${label} (${updatedOrder.pembeli?.name || 'pembeli'}): ${existingOrder.status} → ${status}${
          status === 'SELESAI' ? ` · terima tunai ${rpAudit(updatedOrder.totalAmount)}` : ''
        }`,
        details: {
          from: existingOrder.status,
          to: status,
          totalAmount: Number(updatedOrder.totalAmount),
          pickupCodeVerified: status === 'SELESAI' ? Boolean(existingOrder.pickupCode) : undefined,
          cancelReason: status === 'DIBATALKAN' ? updatedOrder.cancelReason : undefined,
        },
      });
    } else if (isPaid !== undefined) {
      await logAudit({
        actor, action: 'ORDER_PAYMENT_FLAG', entityType: 'ORDER', entityId: id, entityLabel: label,
        summary: `Menandai pesanan ${label} ${isPaid ? 'LUNAS' : 'BELUM LUNAS'}`,
      });
    }

    const message = isExtend
      ? `Batas ambil diperpanjang ${PICKUP_WINDOW_HOURS} jam.`
      : status === 'SIAP_DIAMBIL'
        ? 'Pesanan siap diambil. Kode ambil sudah dikirim ke halaman pesanan pembeli.'
        : status === 'SELESAI'
          ? 'Kode ambil cocok. Pesanan selesai & lunas.'
          : 'Status pesanan berhasil diperbarui.';

    return NextResponse.json({
      success: true,
      message,
      order: {
        ...stripPickupCode(updatedOrder),
        totalAmount: Number(updatedOrder.totalAmount),
        createdAt: updatedOrder.createdAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
        paidAt: updatedOrder.paidAt?.toISOString() || null,
        readyAt: updatedOrder.readyAt?.toISOString() || null,
        completedAt: updatedOrder.completedAt?.toISOString() || null,
        cancelledAt: updatedOrder.cancelledAt?.toISOString() || null,
        pickupDeadline: effectivePickupDeadline(updatedOrder)?.toISOString() ?? null,
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

    // Tidak pernah hapus permanen: arsipkan (hanya pesanan yang sudah Selesai / Dibatalkan)
    const result = await archiveOrders([id], actorFromSession(session));
    if (result.archived.length === 0) {
      return NextResponse.json(
        {
          error: result.skipped.length
            ? `Pesanan ${result.skipped[0].label} ${result.skipped[0].reason}.`
            : 'Pesanan tidak ditemukan atau sudah diarsipkan.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, message: `Pesanan ${result.archived[0]} diarsipkan.` });
  } catch (error: any) {
    console.error('Error saat menghapus pesanan admin:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus pesanan' },
      { status: 500 }
    );
  }
}
