import fs from 'fs';
import path from 'path';
import { getRedisClient } from '@/lib/redis';

const FILE_PATH = path.join(process.cwd(), 'data', 'popular-searches.json');

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

  // 2. Simpan juga ke file JSON lokal sebagai penyimpanan persisten
  try {
    const dir = path.dirname(FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let data: Record<string, number> = {};
    if (fs.existsSync(FILE_PATH)) {
      try {
        data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
      } catch {}
    }

    data[formattedTerm] = (data[formattedTerm] || 0) + 1;
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
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

  // 2. Fallback ambil dari file data riil
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data: Record<string, number> = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
      const sorted = Object.entries(data)
        .filter(([term, count]) => count > 0 && term.length >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([term]) => term);
      return sorted;
    }
  } catch {}

  return [];
}
