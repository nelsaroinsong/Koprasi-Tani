import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  hasWarned: boolean | undefined;
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      // Reconnect otomatis dengan backoff (maksimal 3 detik)
      // Jangan pernah return null agar koneksi tidak mati permanen saat container restart
      return Math.min(times * 150, 3000);
    },
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 4000,
  });

  client.on('error', (err) => {
    // Cetak peringatan satu kali jika Redis sedang offline agar terminal tidak spam
    if (!globalForRedis.hasWarned) {
      console.warn('[Redis] Connection warning (aplikasi tetap berjalan via database):', err.message);
      globalForRedis.hasWarned = true;
    }
  });

  client.on('connect', () => {
    console.log('[Redis] Berhasil terhubung ke Redis server.');
    globalForRedis.hasWarned = false;
  });

  return client;
}

export function getRedisClient(): Redis {
  // Jika client belum dibuat atau statusnya sudah mati ('end'), buat client baru
  if (!globalForRedis.redis || globalForRedis.redis.status === 'end') {
    if (globalForRedis.redis) {
      try {
        globalForRedis.redis.disconnect();
      } catch {}
    }
    globalForRedis.redis = createRedisClient();
  }
  return globalForRedis.redis;
}

export const redis = getRedisClient();

if (process.env.NODE_ENV !== 'production' && redis) {
  globalForRedis.redis = redis;
}

/**
 * Memastikan koneksi Redis dalam kondisi ready sebelum mengeksekusi perintah.
 * Mencegah error 'Connection is closed' jika Redis baru dinyalakan/direstart.
 */
async function getReadyClient(): Promise<Redis | null> {
  try {
    const client = getRedisClient();

    if (client.status === 'ready') {
      return client;
    }

    if (client.status === 'wait' || client.status === 'close') {
      await client.connect();
      return client;
    }

    if (client.status === 'connecting' || client.status === 'connect' || client.status === 'reconnecting') {
      // Tunggu hingga status ready (maksimal 500ms)
      await new Promise<void>((resolve) => {
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          resolve();
        };
        const cleanup = () => {
          client.off('ready', onReady);
          client.off('error', onError);
        };
        client.once('ready', onReady);
        client.once('error', onError);
        setTimeout(() => {
          cleanup();
          resolve();
        }, 500);
      });

      return (client.status as string) === 'ready' ? client : null;
    }

    return null;
  } catch {
    // Jika Redis tidak dapat dihubungi, fallback secara aman ke database tanpa crash
    return null;
  }
}

/**
 * Get cached data by key
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getReadyClient();
    if (!client) return null;

    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Set cache with TTL in seconds (default 300s = 5 minutes)
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const client = await getReadyClient();
    if (!client) return;

    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch {
    // Graceful fallback jika Redis gagal menyimpan cache
  }
}

/**
 * Delete one or more specific keys
 */
export async function delCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const client = await getReadyClient();
    if (!client) return;

    await client.del(...keys);
  } catch {
    // Silently continue
  }
}

/**
 * Invalidate all keys matching pattern (e.g., 'products:*')
 */
export async function delCachePattern(pattern: string): Promise<void> {
  try {
    const client = await getReadyClient();
    if (!client) return;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // Silently continue
  }
}

/**
 * Acquire a distributed lock using Redis SET NX PX
 * Mencegah race condition ketika multi-user checkout produk yang sama di detik yang sama
 */
export async function acquireLock(
  key: string,
  ttlMs: number = 5000
): Promise<string | null> {
  try {
    const client = await getReadyClient();
    if (!client) return 'fallback-lock';

    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const result = await client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  } catch {
    return 'fallback-lock';
  }
}

/**
 * Release distributed lock safely using Lua script
 */
export async function releaseLock(key: string, token: string): Promise<boolean> {
  if (token === 'fallback-lock') return true;
  try {
    const client = await getReadyClient();
    if (!client) return true;

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await client.eval(luaScript, 1, key, token);
    return result === 1;
  } catch {
    return false;
  }
}
