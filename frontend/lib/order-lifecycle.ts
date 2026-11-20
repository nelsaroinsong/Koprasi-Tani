import { randomInt } from 'crypto';
import { notifyOrderStatus } from '@/lib/user-notifications';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

/**
 * Aturan serah terima pesanan toko di kasir koperasi.
 *
 * Alur: MENUNGGU_PEMBAYARAN -> DIPROSES -> SIAP_DIAMBIL -> SELESAI
 * - Saat SIAP_DIAMBIL: sistem membuat kode ambil 6 digit (hanya terlihat oleh pembeli)
 *   dan batas waktu ambil & bayar (PICKUP_WINDOW_HOURS).
 * - Lewat batas & belum lunas -> pesanan dibatalkan otomatis dan stok dikembalikan.
 * - Admin hanya bisa menandai SELESAI setelah memasukkan kode ambil dari pembeli.
 */
export const PICKUP_WINDOW_HOURS = 24;
const PICKUP_WINDOW_MS = PICKUP_WINDOW_HOURS * 60 * 60 * 1000;

export const AUTO_CANCEL_REASON = `Otomatis dibatalkan sistem: tidak diambil & dibayar dalam ${PICKUP_WINDOW_HOURS} jam sejak siap diambil.`;

export function generatePickupCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function computePickupDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + PICKUP_WINDOW_MS);
}

/** Perpanjang batas: dihitung dari batas lama atau sekarang (mana yang lebih akhir). */
export function extendPickupDeadline(current: Date | null | undefined, now: Date = new Date()): Date {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + PICKUP_WINDOW_MS);
}

/** Batas efektif; pesanan lama (sebelum kolom ada) memakai updatedAt + 24 jam seperti perilaku sebelumnya. */
export function effectivePickupDeadline(order: {
  status: string;
  pickupDeadline?: Date | string | null;
  readyAt?: Date | string | null;
  updatedAt?: Date | string | null;
}): Date | null {
  if (order.status !== 'SIAP_DIAMBIL') return null;
  if (order.pickupDeadline) return new Date(order.pickupDeadline);
  const base = order.readyAt || order.updatedAt;
  return base ? new Date(new Date(base).getTime() + PICKUP_WINDOW_MS) : null;
}

export function normalizePickupCode(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6);
}

/**
 * Batalkan semua pesanan SIAP_DIAMBIL yang belum lunas dan sudah lewat batas.
 * Aman dipanggil berkali-kali (idempotent) — dipanggil saat admin/pembeli membuka daftar pesanan.
 * @returns jumlah pesanan yang dibatalkan
 */
export async function expireOverduePickupOrders(filter?: { pembeliId?: string; orderId?: string }): Promise<number> {
  const now = new Date();
  const legacyCutoff = new Date(now.getTime() - PICKUP_WINDOW_MS);

  const candidates = await prisma.order.findMany({
    where: {
      status: 'SIAP_DIAMBIL',
      isPaid: false,
      ...(filter?.pembeliId ? { pembeliId: filter.pembeliId } : {}),
      ...(filter?.orderId ? { id: filter.orderId } : {}),
      OR: [
        { pickupDeadline: { lte: now } },
        { pickupDeadline: null, updatedAt: { lte: legacyCutoff } },
      ],
    },
    select: { id: true },
  });

  if (candidates.length === 0) return 0;

  let cancelled = 0;
  for (const { id } of candidates) {
    const done = await prisma.$transaction(async (tx) => {
      // Klaim pesanan secara atomik agar stok tidak dikembalikan dua kali bila ada request paralel
      const claim = await tx.order.updateMany({
        where: { id, status: 'SIAP_DIAMBIL', isPaid: false },
        data: {
          status: 'DIBATALKAN',
          isPaid: false,
          paidAt: null,
          cancelledAt: now,
          cancelReason: AUTO_CANCEL_REASON,
        },
      });
      if (claim.count === 0) return false;

      const items = await tx.orderItem.findMany({ where: { orderId: id }, select: { productId: true, quantity: true } });
      for (const item of items) {
        if (item.productId && item.quantity > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stok: { increment: item.quantity } },
          });
        }
      }
      return true;
    });
    if (done) {
      cancelled++;
      const order = await prisma.order.findUnique({ where: { id } });
      if (order) notifyOrderStatus(order);
    }
  }

  if (cancelled > 0) {
    await Promise.all([
      delCachePattern('admin:orders:*'),
      delCachePattern('user:orders:*'),
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
    ]).catch(() => {});
  }

  return cancelled;
}

/** Hapus kode ambil dari objek pesanan untuk respons admin (admin harus menanyakannya ke pembeli). */
export function stripPickupCode<T extends { pickupCode?: string | null }>(order: T): Omit<T, 'pickupCode'> & { hasPickupCode: boolean } {
  const { pickupCode, ...rest } = order;
  return { ...rest, hasPickupCode: Boolean(pickupCode) };
}
