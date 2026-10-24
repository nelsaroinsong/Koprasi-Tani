import { getCache, setCache, delCache } from '@/lib/redis';

// In-memory fallback jika Redis tidak tersedia
const memoryOtpStore = new Map<string, { otp: string; expiresAt: number }>();
const memoryVerifiedStore = new Map<string, number>();

/**
 * Menyimpan kode OTP untuk email tertentu dengan TTL detik (default 300s = 5 menit)
 */
export async function saveOtp(email: string, otp: string, ttlSeconds = 300): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const key = `otp:verify:${cleanEmail}`;

  // 1. Coba simpan ke Redis
  try {
    await setCache(key, otp, ttlSeconds);
  } catch (err) {
    console.warn('[OTP Store] Gagal menyimpan OTP ke Redis, fallback ke memory:', err);
  }

  // 2. Simpan juga ke memory fallback
  memoryOtpStore.set(cleanEmail, {
    otp,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Mengambil kode OTP yang tersimpan
 */
export async function getOtp(email: string): Promise<string | null> {
  const cleanEmail = email.trim().toLowerCase();
  const key = `otp:verify:${cleanEmail}`;

  // 1. Coba ambil dari Redis
  try {
    const redisOtp = await getCache<string>(key);
    if (redisOtp) return String(redisOtp);
  } catch {}

  // 2. Fallback ke memory
  const mem = memoryOtpStore.get(cleanEmail);
  if (mem) {
    if (Date.now() > mem.expiresAt) {
      memoryOtpStore.delete(cleanEmail);
      return null;
    }
    return mem.otp;
  }

  return null;
}

/**
 * Menghapus kode OTP setelah digunakan
 */
export async function clearOtp(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const key = `otp:verify:${cleanEmail}`;

  try {
    await delCache(key);
  } catch {}

  memoryOtpStore.delete(cleanEmail);
}

/**
 * Menandai email sebagai terverifikasi selama 15 menit
 */
export async function markEmailVerified(email: string, ttlSeconds = 900): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const key = `otp:verified:${cleanEmail}`;

  try {
    await setCache(key, 'VERIFIED', ttlSeconds);
  } catch {}

  memoryVerifiedStore.set(cleanEmail, Date.now() + ttlSeconds * 1000);
}

/**
 * Memeriksa apakah email sudah terverifikasi via OTP
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const key = `otp:verified:${cleanEmail}`;

  try {
    const val = await getCache<string>(key);
    if (val === 'VERIFIED') return true;
  } catch {}

  const expiresAt = memoryVerifiedStore.get(cleanEmail);
  if (expiresAt && Date.now() <= expiresAt) {
    return true;
  }

  return false;
}
