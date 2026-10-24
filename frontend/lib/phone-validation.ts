/**
 * Helper validasi nomor telepon & WhatsApp Indonesia:
 * - Wajib dimulai dengan 08
 * - Minimal 10 digit angka
 * - Maksimal 15 digit angka
 */
export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  cleanPhone: string;
}

export function validateIndonesianPhone(
  phone: string | null | undefined,
  isRequired = false
): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    if (isRequired) {
      return {
        isValid: false,
        error: 'Nomor telepon/WhatsApp wajib diisi.',
        cleanPhone: '',
      };
    }
    return { isValid: true, cleanPhone: '' };
  }

  // Bersihkan spasi, tanda strip, titik, dan tanda kurung
  let digits = phone.trim().replace(/[\s\-\.\(\)]/g, '');

  if (!digits) {
    if (isRequired) {
      return {
        isValid: false,
        error: 'Nomor telepon/WhatsApp wajib diisi.',
        cleanPhone: '',
      };
    }
    return { isValid: true, cleanPhone: '' };
  }

  // Konversi otomatis awalan internasional ke format lokal 08 jika ada
  if (digits.startsWith('+628')) {
    digits = '08' + digits.slice(4);
  } else if (digits.startsWith('628')) {
    digits = '08' + digits.slice(3);
  }

  // Cek karakter hanya angka
  if (!/^\d+$/.test(digits)) {
    return {
      isValid: false,
      error: 'Nomor telepon/WhatsApp hanya boleh berisi angka (tanpa huruf atau simbol).',
      cleanPhone: digits,
    };
  }

  // Cek wajib dimulai dengan 08
  if (!digits.startsWith('08')) {
    return {
      isValid: false,
      error: 'Nomor telepon/WhatsApp wajib dimulai dengan 08 (contoh: 08123456789).',
      cleanPhone: digits,
    };
  }

  // Cek minimal 10 digit
  if (digits.length < 10) {
    return {
      isValid: false,
      error: 'Nomor telepon/WhatsApp minimal 10 digit angka (contoh: 08123456789).',
      cleanPhone: digits,
    };
  }

  // Cek maksimal 15 digit
  if (digits.length > 15) {
    return {
      isValid: false,
      error: 'Nomor telepon/WhatsApp maksimal 15 digit angka.',
      cleanPhone: digits,
    };
  }

  return {
    isValid: true,
    cleanPhone: digits,
  };
}
