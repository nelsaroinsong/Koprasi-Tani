import { getRedisClient } from '@/lib/redis';
import { getSetting, setSetting, SETTING_KEYS } from '@/lib/app-settings';

/**
 * Mencatat frekuensi kata kunci pencarian secara riil
 */
export async function recordSearchTerm(term: string): Promise<void> {
  const cleanTerm = term.trim();
  if (!cleanTerm || cleanTerm.length < 2) return;

  // Normalisasi kapitalisasi huruf awal (misal: "jagung" -> "Jagung")
  const formattedTerm = cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1);
  const lowerKey = cleanTerm.toLowerCase();

  // 1. Simpan/tingkatkan frekuensi di Redis jika tersedia
  try {
    const redis = getRedisClient();
    if (redis && (redis.status === 'ready' || redis.status === 'connecting')) {
      await redis.zincrby('search:popular:counts', 1, formattedTerm);
    }
  } catch {}

  // 2. Simpan juga ke database sebagai penyimpanan persisten
  try {
    const data = (await getSetting<Record<string, number>>(SETTING_KEYS.popularSearches)) || {};
    data[formattedTerm] = (data[formattedTerm] || 0) + 1;
    await setSetting(SETTING_KEYS.popularSearches, data);
  } catch (err) {
    console.error('Error mencatat kata kunci pencarian:', err);
  }
}

/**
 * Mengambil daftar pencarian populer berdasarkan seberapa banyak pengguna mencari kata kunci tersebut
 */
export async function getPopularSearchTerms(limit = 7): Promise<string[]> {
  // 1. Ambil dari Redis jika ada data
  try {
    const redis = getRedisClient();
    if (redis && (redis.status === 'ready' || redis.status === 'connecting')) {
      const results = await redis.zrevrange('search:popular:counts', 0, limit - 1);
      if (Array.isArray(results) && results.length > 0) {
        return results;
      }
    }
  } catch {}

  // 2. Fallback dari database
  try {
    const data = await getSetting<Record<string, number>>(SETTING_KEYS.popularSearches);
    if (data) {
      return Object.entries(data)
        .filter(([term, count]) => count > 0 && term.length >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([term]) => term);
    }
  } catch {}

  return [];
}
