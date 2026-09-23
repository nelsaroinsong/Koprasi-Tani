import crypto from 'crypto';

/**
 * Hash password menggunakan scrypt dengan salt acak 16 byte.
 * Menghasilkan format: `${salt}:${hash}`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifikasi kecocokan password plaintext dengan salt:hash yang tersimpan di database.
 * Menggunakan crypto.timingSafeEqual untuk mencegah timing attacks.
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const parts = combinedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, storedHash] = parts;
    if (!salt || !storedHash) return false;

    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);

    if (storedHashBuffer.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedHashBuffer, derivedKey);
  } catch (error) {
    console.error('Error saat verifikasi password:', error);
    return false;
  }
}
