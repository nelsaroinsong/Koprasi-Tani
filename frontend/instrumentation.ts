/**
 * Dijalankan sekali saat server Next.js menyala.
 * Kode khusus Node.js (Prisma, crypto, penjadwal) WAJIB diimpor di dalam pengecekan runtime ini,
 * agar tidak ikut dibundel ke Edge runtime (middleware).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
