/**
 * Token bypass pemeliharaan bertanda tangan HMAC-SHA256 untuk sesi Administrator.
 * Menggunakan Web Crypto API (`crypto.subtle`) agar berjalan mulus di Edge Middleware maupun Node.js.
 */

export const MAINTENANCE_BYPASS_COOKIE = 'ksps_maint_bypass';
const BYPASS_TTL_SECONDS = 12 * 60 * 60; // 12 jam

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'koperasi-sinar-pagi-sejahtera-maint-fallback'
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function signPayload(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bytesToHex(new Uint8Array(sig));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Terbitkan cookie bypass resmi untuk admin yang sudah terverifikasi */
export async function createAdminBypassToken(nowMs: number = Date.now()): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + BYPASS_TTL_SECONDS;
  const payload = `admin.${exp}`;
  const sig = await signPayload(payload);
  return `${payload}.${sig}`;
}

/** Verifikasi token bypass di Edge Middleware (mencegah pemalsuan cookie oleh pengguna biasa) */
export async function verifyAdminBypassToken(
  token: string | undefined | null,
  nowMs: number = Date.now()
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== 'admin') return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Math.floor(nowMs / 1000)) return false;

  try {
    const expected = await signPayload(`${role}.${expStr}`);
    return constantTimeEqual(sig, expected);
  } catch {
    return false;
  }
}

export const BYPASS_COOKIE_MAX_AGE = BYPASS_TTL_SECONDS;
