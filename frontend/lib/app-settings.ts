import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Kunci pengaturan aplikasi yang disimpan di tabel `app_settings` */
export const SETTING_KEYS = {
  warehouseLocation: 'warehouse_location',
  partnerLogos: 'partner_logos',
  popularSearches: 'popular_searches',
} as const;

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? (row.value as T) : null;
}

export async function setSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
