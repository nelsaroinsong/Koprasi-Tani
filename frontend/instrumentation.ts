/**
 * Dijalankan sekali saat server Next.js menyala.
 * Menyalakan penjadwal internal (tiap 10 menit) untuk pembatalan tepat waktu & pengingat tenggat.
 *
 * Matikan dengan SCHEDULER_DISABLED=true bila server dijalankan lebih dari satu instance
 * — gunakan endpoint /api/cron/tasks dari penjadwal luar sebagai gantinya.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.SCHEDULER_DISABLED === 'true') return;

  const g = globalThis as typeof globalThis & { __koperasiScheduler?: NodeJS.Timeout };
  if (g.__koperasiScheduler) return; // cegah interval ganda saat hot reload

  const INTERVAL_MS = 10 * 60 * 1000;
  const run = async () => {
    try {
      const { runScheduledTasks } = await import('@/lib/scheduled-tasks');
      const res = await runScheduledTasks();
      const sent = res ? Object.values(res.reminders).reduce((a, b) => a + b, 0) : 0;
      if (res && (res.ordersExpired || res.rentalsExpired || sent)) {
        console.log(
          `[Penjadwal] ${res.ordersExpired} pesanan & ${res.rentalsExpired} sewa kedaluwarsa, ${sent} pengingat dikirim`
        );
      }
    } catch (err) {
      console.error('[Penjadwal] Gagal menjalankan tugas terjadwal:', err);
    }
  };

  // Putaran pertama 1 menit setelah server siap, lalu tiap 10 menit
  setTimeout(run, 60_000);
  g.__koperasiScheduler = setInterval(run, INTERVAL_MS);
}
