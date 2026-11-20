// Stub Redis untuk test: semua operasi cache tidak melakukan apa-apa
export const redis = null;
export async function getCache<T>(_key: string): Promise<T | null> { return null; }
export async function setCache(_key: string, _value: unknown, _ttl?: number): Promise<void> {}
export async function delCache(..._keys: string[]): Promise<void> {}
export async function delCachePattern(_pattern: string): Promise<void> {}
export async function incrementWithTtl(_key: string, _ttl: number): Promise<null> { return null; }
export async function peekCounter(_key: string): Promise<null> { return null; }
