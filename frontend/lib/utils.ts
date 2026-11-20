import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mengambil URL gambar utama dari string imageUrl (mendukung format comma-separated untuk multi-foto)
 */
export function getPrimaryImage(imageUrl?: string | null, fallback = ''): string {
  if (!imageUrl) return fallback;
  const first = imageUrl.includes(',') ? imageUrl.split(',')[0].trim() : imageUrl.trim();
  return first || fallback;
}

/** Link chat WhatsApp dari nomor Indonesia: "0812-3456" / "+62 812..." -> https://wa.me/62812... */
export function waLink(phone: string | null | undefined): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '#';
  if (digits.startsWith('62')) return `https://wa.me/${digits}`;
  if (digits.startsWith('0')) return `https://wa.me/62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `https://wa.me/62${digits}`;
  return `https://wa.me/${digits}`;
}
