/**
 * Keamanan Berkas & Pencegahan RCE / Webshell / MIME Sniffing
 * Koperasi Sinar Pagi Sejahtera
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedExt?: string;
  contentType?: string;
}

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validasi Magic Bytes (File Signature) untuk memastikan berkas benar-benar gambar
 * dan bukan skrip eksekusi / webshell (.php, .sh, .html, .exe) yang menyamar.
 */
export function verifyImageMagicBytes(buffer: Buffer): { valid: boolean; format?: string } {
  if (buffer.length < 12) {
    return { valid: false };
  }

  // 1. JPEG Signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: 'jpg' };
  }

  // 2. PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, format: 'png' };
  }

  // 3. WebP Signature: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, format: 'webp' };
  }

  return { valid: false };
}

/**
 * Validasi komprehensif berkas upload sebelum disimpan ke storage:
 * - Ukuran maksimal 5MB
 * - Ekstensi resmi (jpg, png, webp)
 * - MIME-Type resmi (image/jpeg, image/png, image/webp)
 * - Verifikasi Magic Bytes header biner
 */
export function validateImageUpload(
  file: File,
  buffer: Buffer
): ValidationResult {
  // 1. Validasi Ukuran File (mencegah DoS / Out-of-Memory)
  if (file.size > MAX_FILE_SIZE || buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Ukuran berkas melebihi batas maksimal 5 MB.',
    };
  }

  if (buffer.length === 0) {
    return {
      valid: false,
      error: 'Berkas kosong tidak dapat diunggah.',
    };
  }

  // 2. Validasi Ekstensi Berkas
  const rawExt = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(rawExt)) {
    return {
      valid: false,
      error: 'Format berkas tidak diizinkan. Hanya menerima JPG, PNG, atau WebP.',
    };
  }

  // 3. Validasi MIME Type dari Header HTTP
  const rawType = (file.type || '').toLowerCase();
  if (rawType && !ALLOWED_MIME_TYPES.has(rawType)) {
    return {
      valid: false,
      error: 'Tipe MIME berkas tidak valid untuk gambar.',
    };
  }

  // 4. Verifikasi Biner Magic Bytes (Deep Header Check)
  const magicCheck = verifyImageMagicBytes(buffer);
  if (!magicCheck.valid) {
    return {
      valid: false,
      error: 'Integritas berkas gagal diverifikasi. Berkas bukan gambar valid.',
    };
  }

  const finalExt = magicCheck.format || (rawExt === 'jpeg' ? 'jpg' : rawExt);
  const finalContentType =
    finalExt === 'png'
      ? 'image/png'
      : finalExt === 'webp'
      ? 'image/webp'
      : 'image/jpeg';

  return {
    valid: true,
    sanitizedExt: finalExt,
    contentType: finalContentType,
  };
}

/**
 * Validasi dan sanitasi kunci penyimpanan untuk mencegah Path Traversal (e.g. ../../)
 */
export function isSafeStorageKey(key: string, allowedPrefixes: string[] = ['products/', 'sewa-alat/', 'profiles/', 'logos/']): boolean {
  if (!key || typeof key !== 'string') return false;

  // Larang karakter berbahaya / directory traversal
  if (key.includes('..') || key.includes('\0') || key.startsWith('/') || key.startsWith('\\')) {
    return false;
  }

  // Pastikan berada di dalam folder yang diizinkan
  return allowedPrefixes.some((prefix) => key.startsWith(prefix));
}
