import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { notifyOrderStatus } from '@/lib/user-notifications';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

/**
 * Aturan serah terima pesanan toko di kasir koperasi.
 *
 * Alur: MENUNGGU_PEMBAYARAN -> DIPROSES -> SIAP_DIAMBIL -> SELESAI
 * - Saat SIAP_DIAMBIL: sistem membuat seed kode ambil (hanya terlihat oleh pembeli)
 *   yang menghasilkan kode dinamis 6 digit berganti setiap 20 detik, serta
 *   batas waktu ambil & bayar (PICKUP_WINDOW_HOURS).
 * - Lewat batas & belum lunas -> pesanan dibatalkan otomatis dan stok dikembalikan.
 * - Admin hanya bisa menandai SELESAI setelah memasukkan kode ambil aktif dari pembeli.
 */
export const PICKUP_WINDOW_HOURS = 24;
const PICKUP_WINDOW_MS = PICKUP_WINDOW_HOURS * 60 * 60 * 1000;
export const PICKUP_CODE_STEP_SECONDS = 20;
export const PICKUP_CODE_STEP_MS = PICKUP_CODE_STEP_SECONDS * 1000;
export const PICKUP_CODE_DIGITS = 6;

export const AUTO_CANCEL_REASON = `Otomatis dibatalkan sistem: tidak diambil & dibayar dalam ${PICKUP_WINDOW_HOURS} jam sejak siap diambil.`;

function resolvePickupSecret(override?: string): string {
  if (override && override.length > 0) return override;
  return (
    process.env.PICKUP_CODE_SECRET ||
    process.env.PAYOUT_CODE_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'ksps-pickup-rolling-code-dev-secret'
  );
}

export function generatePickupCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function computeRollingPickupCodeForStep(
  orderId: string,
  pickupSeed: string | null | undefined,
  step: number,
  secretOverride?: string
): string {
  const secret = resolvePickupSecret(secretOverride);
  const hmac = createHmac('sha256', secret)
    .update(`ksps:pickup-v1:${orderId}:${pickupSeed || ''}:${step}`)
    .digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** PICKUP_CODE_DIGITS).padStart(PICKUP_CODE_DIGITS, '0');
}

export function generateRollingPickupCode(
  orderId: string,
  pickupSeed: string | null | undefined,
  nowMs: number = Date.now(),
  secretOverride?: string
) {
  const step = Math.floor(nowMs / PICKUP_CODE_STEP_MS);
  const validUntilMs = (step + 1) * PICKUP_CODE_STEP_MS;
  const remainingMs = Math.max(0, validUntilMs - nowMs);
  const code = computeRollingPickupCodeForStep(orderId, pickupSeed, step, secretOverride);

  return {
    code,
    step,
    stepSeconds: PICKUP_CODE_STEP_SECONDS,
    remainingMs,
    validUntilMs,
    serverTimeMs: nowMs,
  };
}

function safePickupEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyRollingPickupCode(
  orderId: string,
  pickupSeed: string | null | undefined,
  rawCode: unknown,
  nowMs: number = Date.now(),
  options?: { gracePastSteps?: number; secret?: string }
): boolean {
  if (!orderId || !pickupSeed) return false;
  const normalized = normalizePickupCode(rawCode);
  if (normalized.length !== PICKUP_CODE_DIGITS) return false;

  const gracePastSteps = options?.gracePastSteps ?? 1;
  const currentStep = Math.floor(nowMs / PICKUP_CODE_STEP_MS);

  for (let delta = 0; delta <= gracePastSteps; delta++) {
    const candidate = computeRollingPickupCodeForStep(
      orderId,
      pickupSeed,
      currentStep - delta,
      options?.secret
    );
    if (safePickupEquals(normalized, candidate)) {
      return true;
    }
  }
  return false;
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
