import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createRedisClient(): Redis | null {
  try {
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 100, 2000);
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });

    client.on('error', (err) => {
      // Log error silently without crashing the app
      console.warn('[Redis] Connection warning:', err.message);
    });

    return client;
  } catch (err) {
    console.warn('[Redis] Failed to initialize Redis client:', err);
    return null;
  }
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production' && redis) {
  globalForRedis.redis = redis;
}

/**
 * Get cached data by key
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    if (redis.status === 'wait') {
      await redis.connect().catch(() => {});
    }
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.warn(`[Redis] Error getting cache for ${key}:`, err);
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
  if (!redis) return;
  try {
    if (redis.status === 'wait') {
      await redis.connect().catch(() => {});
    }
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
  } catch (err) {
    console.warn(`[Redis] Error setting cache for ${key}:`, err);
  }
}

/**
 * Delete one or more specific keys
 */
export async function delCache(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    if (redis.status === 'wait') {
      await redis.connect().catch(() => {});
    }
    await redis.del(...keys);
  } catch (err) {
    console.warn(`[Redis] Error deleting cache for keys:`, err);
  }
}

/**
 * Invalidate all keys matching pattern (e.g., 'products:*')
 */
export async function delCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    if (redis.status === 'wait') {
      await redis.connect().catch(() => {});
    }
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn(`[Redis] Error deleting pattern ${pattern}:`, err);
  }
}
