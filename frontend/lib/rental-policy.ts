// Kebijakan sewa alat koperasi. Semua pembayaran tunai di kasir koperasi (tanpa payment gateway).
import { addDays, parseDateOnly, todayWita } from '@/lib/rental-schedule';

/** Uang muka untuk mengunci jadwal (persen dari total sewa) */
export const DP_PERSEN = 30;
/** Denda keterlambatan per unit per hari */
export const DENDA_PER_HARI = 50_000;
/** Batal paling lambat H-N sebelum pemakaian: DP kembali penuh. Lebih mepet: DP hangus. */
export const BATAS_BATAL_HARI = 2;

/** DP dibulatkan ke atas ke ribuan terdekat */
export function hitungDp(total: number): number {
  return Math.ceil((total * DP_PERSEN) / 100 / 1000) * 1000;
}

/** Apakah pembatalan pada hari ini masih berhak pengembalian DP penuh */
export function dpDikembalikanJikaBatal(startDate: string, today: string = todayWita()): boolean {
  return today <= addDays(startDate, -BATAS_BATAL_HARI);
}

/** Hari terlambat: dihitung dari hari setelah tanggal selesai sampai tanggal pengembalian (WITA) */
export function hitungHariTerlambat(endDate: string, returnDate: string = todayWita()): number {
  const end = parseDateOnly(endDate);
  const ret = parseDateOnly(returnDate);
  if (!end || !ret) return 0;
  return Math.max(0, Math.round((ret.getTime() - end.getTime()) / 86_400_000));
}

export function hitungDenda(hariTerlambat: number, jumlahUnit: number): number {
  return Math.max(0, hariTerlambat) * Math.max(1, jumlahUnit) * DENDA_PER_HARI;
}

/** Rangkuman tagihan sebuah sewa */
export function rincianTagihan(r: {
  totalEstimasi: number;
  dpAmount?: number | null;
  dpPaidAt?: string | null;
  lateFee?: number;
  damageFee?: number;
}) {
  const dpDibayar = r.dpPaidAt ? Number(r.dpAmount || 0) : 0;
  const biayaTambahan = Number(r.lateFee || 0) + Number(r.damageFee || 0);
  return {
    total: r.totalEstimasi,
    dp: Number(r.dpAmount || 0),
    dpDibayar,
    sisaPelunasan: Math.max(0, r.totalEstimasi - dpDibayar),
    biayaTambahan,
    grandTotal: r.totalEstimasi + biayaTambahan,
  };
}
