import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Kode verifikasi penarikan tunai petani di kasir koperasi (rolling TOTP 20 detik).
 *
 * Cara kerja:
 * - Kode 6 digit diturunkan secara kriptografis (HMAC-SHA256) dari ID petani dan slot waktu 20 detik.
 * - Tidak butuh tabel/kolom baru dan tidak pernah mengirim secret ke browser.
 * - Verifikasi menerima slot saat ini + 1 slot sebelumnya (grace window 20 detik)
 *   agar tidak gagal saat kasir mengetik tepat di batas pergantian detik, namun
 *   screenshot lama otomatis kedaluwarsa dalam ~20–40 detik.
 */
export const PAYOUT_CODE_STEP_SECONDS = 20;
export const PAYOUT_CODE_STEP_MS = PAYOUT_CODE_STEP_SECONDS * 1000;
export const PAYOUT_CODE_DIGITS = 6;

function resolveSecret(override?: string): string {
  if (override && override.length > 0) return override;
  return (
    process.env.PAYOUT_CODE_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'ksps-payout-rolling-code-dev-secret'
  );
}

export function normalizePayoutCode(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, PAYOUT_CODE_DIGITS);
}

export function computePayoutCodeForStep(
  petaniId: string,
  step: number,
  secretOverride?: string
): string {
  const secret = resolveSecret(secretOverride);
  const hmac = createHmac('sha256', secret)
    .update(`ksps:payout-v1:${petaniId}:${step}`)
    .digest();

  // Dynamic truncation (RFC 4226 / RFC 6238)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** PAYOUT_CODE_DIGITS;
  return String(binary % mod).padStart(PAYOUT_CODE_DIGITS, '0');
}

export interface GeneratedPayoutCode {
  code: string;
  step: number;
  stepSeconds: number;
  remainingMs: number;
  validUntilMs: number;
  serverTimeMs: number;
}

export function generatePayoutCode(
  petaniId: string,
  nowMs: number = Date.now(),
  secretOverride?: string
): GeneratedPayoutCode {
  const step = Math.floor(nowMs / PAYOUT_CODE_STEP_MS);
  const validUntilMs = (step + 1) * PAYOUT_CODE_STEP_MS;
  const remainingMs = Math.max(0, validUntilMs - nowMs);
  const code = computePayoutCodeForStep(petaniId, step, secretOverride);

  return {
    code,
    step,
    stepSeconds: PAYOUT_CODE_STEP_SECONDS,
    remainingMs,
    validUntilMs,
    serverTimeMs: nowMs,
  };
}

function safeCodeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyPayoutCode(
  petaniId: string,
  rawCode: unknown,
  nowMs: number = Date.now(),
  options?: { gracePastSteps?: number; secret?: string }
): boolean {
  if (!petaniId) return false;
  const normalized = normalizePayoutCode(rawCode);
  if (normalized.length !== PAYOUT_CODE_DIGITS) return false;

  const gracePastSteps = options?.gracePastSteps ?? 1;
  const currentStep = Math.floor(nowMs / PAYOUT_CODE_STEP_MS);

  for (let delta = 0; delta <= gracePastSteps; delta++) {
    const candidate = computePayoutCodeForStep(petaniId, currentStep - delta, options?.secret);
    if (safeCodeEquals(normalized, candidate)) {
      return true;
    }
  }
  return false;
}
