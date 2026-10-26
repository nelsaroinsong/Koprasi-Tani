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
