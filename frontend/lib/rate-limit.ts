import { NextResponse } from 'next/server';
import { incrementWithTtl, peekCounter } from '@/lib/redis';

/**
 * Pembatasan jumlah request (rate limit) per pengguna / IP.
 * Memakai Redis bila tersedia; bila Redis mati, memakai memori proses (tetap melindungi 1 server).
 */

export interface RateLimitRule {
  /** nama aturan, mis. 'checkout' */
  name: string;
  /** maksimal request dalam satu jendela waktu */
  limit: number;
  /** panjang jendela waktu (detik) */
  windowSec: number;
}

export const RATE_LIMITS = {
  checkout: { name: 'checkout', limit: 10, windowSec: 10 * 60 },
  rentalRequest: { name: 'rental-request', limit: 10, windowSec: 10 * 60 },
  review: { name: 'review', limit: 10, windowSec: 60 * 60 },
  follow: { name: 'follow', limit: 30, windowSec: 60 },
  upload: { name: 'upload', limit: 30, windowSec: 10 * 60 },
  otpSend: { name: 'otp-send', limit: 5, windowSec: 10 * 60 },
  otpVerify: { name: 'otp-verify', limit: 10, windowSec: 10 * 60 },
  /** gagal login admin (dihitung hanya saat gagal) */
  adminLoginFail: { name: 'admin-login-fail', limit: 5, windowSec: 15 * 60 },
} satisfies Record<string, RateLimitRule>;

// Cadangan bila Redis tidak tersedia
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryIncrement(key: string, windowSec: number) {
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return { count: 1, ttl: windowSec };
  }
  cur.count += 1;
  return { count: cur.count, ttl: Math.ceil((cur.resetAt - now) / 1000) };
}

function memoryPeek(key: string) {
  const cur = memory.get(key);
  if (!cur || cur.resetAt <= Date.now()) return { count: 0, ttl: 0 };
  return { count: cur.count, ttl: Math.ceil((cur.resetAt - Date.now()) / 1000) };
}

const keyOf = (rule: RateLimitRule, identity: string) => `ratelimit:${rule.name}:${identity.toLowerCase()}`;

/** Tambah hitungan & cek apakah masih diizinkan */
export async function hitRateLimit(rule: RateLimitRule, identity: string) {
  const key = keyOf(rule, identity);
  const res = (await incrementWithTtl(key, rule.windowSec)) ?? memoryIncrement(key, rule.windowSec);
  return { allowed: res.count <= rule.limit, remaining: Math.max(0, rule.limit - res.count), retryAfter: res.ttl };
}

/** Cek tanpa menambah hitungan (mis. untuk gagal login yang baru dihitung saat gagal) */
export async function checkRateLimit(rule: RateLimitRule, identity: string) {
  const key = keyOf(rule, identity);
  const res = (await peekCounter(key)) ?? memoryPeek(key);
  return { allowed: res.count < rule.limit, retryAfter: res.ttl };
}

/** IP klien dari header proxy (Nginx / Docker); 'unknown' bila tidak ada */
export function clientIp(request: Request) {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

export function formatRetry(seconds: number) {
  if (seconds >= 120) return `${Math.ceil(seconds / 60)} menit`;
  return `${Math.max(1, seconds)} detik`;
}

/**
 * Pakai di route: `const limited = await enforceRateLimit(request, RATE_LIMITS.checkout, userId); if (limited) return limited;`
 * Identitas = id/email pengguna bila login, selain itu IP.
 */
export async function enforceRateLimit(request: Request, rule: RateLimitRule, identity?: string | null) {
  const id = identity || `ip:${clientIp(request)}`;
  const res = await hitRateLimit(rule, id);
  if (res.allowed) return null;
  return NextResponse.json(
    { error: `Terlalu banyak percobaan. Coba lagi dalam ${formatRetry(res.retryAfter)}.`, code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(res.retryAfter) } }
  );
}
