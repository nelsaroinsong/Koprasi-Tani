/**
 * Penjadwal internal (hanya runtime Node.js) — diimpor dari instrumentation.ts.
 * Tiap 10 menit: pembatalan tepat waktu & pengingat tenggat.
 *
 * Matikan dengan SCHEDULER_DISABLED=true bila server dijalankan lebih dari satu instance
 * — gunakan endpoint /api/cron/tasks dari penjadwal luar sebagai gantinya.
 */
import { runScheduledTasks } from '@/lib/scheduled-tasks';

const INTERVAL_MS = 10 * 60 * 1000;
const g = globalThis as typeof globalThis & { __koperasiScheduler?: NodeJS.Timeout };

async function run() {
  try {
    const res = await runScheduledTasks();
    const sent = res ? Object.values(res.reminders).reduce((a, b) => a + b, 0) : 0;
    if (res && (res.ordersExpired || res.rentalsExpired || sent)) {
      console.log(`[Penjadwal] ${res.ordersExpired} pesanan & ${res.rentalsExpired} sewa kedaluwarsa, ${sent} pengingat dikirim`);
    }
  } catch (err) {
    console.error('[Penjadwal] Gagal menjalankan tugas terjadwal:', err);
  }
}

// Di Vercel (serverless) tidak ada proses yang hidup terus: pakai Vercel Cron -> /api/cron/tasks (lihat vercel.json)
const isServerless = Boolean(process.env.VERCEL);

if (!isServerless && process.env.SCHEDULER_DISABLED !== 'true' && !g.__koperasiScheduler) {
  // Putaran pertama 1 menit setelah server siap, lalu tiap 10 menit (cegah interval ganda saat hot reload)
  setTimeout(run, 60_000);
  g.__koperasiScheduler = setInterval(run, INTERVAL_MS);
}
