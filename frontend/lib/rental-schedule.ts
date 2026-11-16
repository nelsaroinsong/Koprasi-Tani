// Aturan jadwal & pembayaran sewa alat.
// Semua tanggal sewa disimpan sebagai tanggal kalender (YYYY-MM-DD) zona WITA (UTC+8).

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal hari ini (WITA) dalam format YYYY-MM-DD */
export function todayWita(now: Date = new Date()): string {
  return new Date(now.getTime() + WITA_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> Date (00:00 UTC), cocok untuk kolom @db.Date */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(dateOnly: string, days: number): string {
  const d = parseDateOnly(dateOnly);
  if (!d) return dateOnly;
  return toDateOnly(new Date(d.getTime() + days * DAY_MS));
}

/** Jam tertentu (WITA) pada sebuah tanggal -> Date UTC */
export function witaDateTime(dateOnly: string, hour: number, minute = 0): Date {
  const base = parseDateOnly(dateOnly)!;
  return new Date(base.getTime() + (hour * 60 + minute) * 60 * 1000 - WITA_OFFSET_MS);
}

/**
 * Berapa hari kalender sebuah item memakai unit.
 * - hari   : sesuai durasi
 * - minggu : durasi x 7
 * - bulan  : durasi x 30
 * - jam / hektar / lainnya : dianggap selesai dalam 1 hari kerja
 */
export function occupiedDays(satuanSewa: string, durasi: number): number {
  const d = Math.max(1, Math.floor(Number(durasi) || 1));
  const unit = (satuanSewa || '').toLowerCase().trim();
  if (unit === 'hari') return d;
  if (unit === 'minggu') return d * 7;
  if (unit === 'bulan') return d * 30;
  return 1;
}

/** Rentang tanggal pemakaian (inklusif) */
export function itemDateRange(startDate: string, satuanSewa: string, durasi: number) {
  return { startDate, endDate: addDays(startDate, occupiedDays(satuanSewa, durasi) - 1) };
}

/** Jam tutup kasir koperasi (WITA) */
export const KASIR_CLOSE_HOUR = 16;
export const KASIR_CLOSE_MINUTE = 30;
/** Batas paling lambat pelunasan pada hari H (WITA), saat alat diambil */
export const HARI_H_HOUR = 10;

/** Waktu minimal yang diberikan ke penyewa untuk datang ke kasir setelah disetujui */
const MIN_PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000;

export type PaymentDeadlineMode = 'H_MINUS_1' | 'HARI_H' | 'DUA_JAM' | 'CUSTOM';

/**
 * Hitung batas bayar di kasir berdasarkan TANGGAL MULAI SEWA, bukan waktu persetujuan.
 *
 * - H_MINUS_1 (default): sehari sebelum pemakaian pukul 16:30 WITA.
 *   Sewa tanggal 19 cukup dibayar paling lambat tanggal 18 sore, tidak perlu 3 hari sebelumnya.
 * - HARI_H: hari pemakaian pukul 10:00 WITA (bayar saat mengambil alat).
 * - DUA_JAM: 2 jam setelah disetujui (untuk sewa mendadak).
 * - CUSTOM: waktu pilihan admin.
 *
 * Batas tidak pernah lebih awal dari 2 jam setelah disetujui, dan tidak pernah
 * melewati hari H pukul 10:00 (unit harus sudah lunas sebelum dibawa).
 */
export function computePaymentDeadline(
  startDate: string,
  mode: PaymentDeadlineMode = 'H_MINUS_1',
  customIso?: string | null,
  now: Date = new Date()
): Date {
  const latest = witaDateTime(startDate, HARI_H_HOUR);
  const earliest = new Date(now.getTime() + MIN_PAYMENT_WINDOW_MS);

  let target: Date;
  if (mode === 'CUSTOM' && customIso && !isNaN(new Date(customIso).getTime())) {
    target = new Date(customIso);
  } else if (mode === 'HARI_H') {
    target = latest;
  } else if (mode === 'DUA_JAM') {
    target = earliest;
  } else {
    target = witaDateTime(addDays(startDate, -1), KASIR_CLOSE_HOUR, KASIR_CLOSE_MINUTE);
  }

  if (target.getTime() > latest.getTime()) target = latest;
  if (target.getTime() < earliest.getTime()) target = earliest;
  return target;
}

/** Iterasi setiap tanggal dalam rentang inklusif */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}
