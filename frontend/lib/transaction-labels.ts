/**
 * Label status yang dipakai bersama oleh halaman pembeli & petani
 * (Riwayat Transaksi, Rincian Transaksi, Dashboard Petani).
 */

export const RENTAL_STATUS_LABEL: Record<string, string> = {
  MENUNGGU_PERSETUJUAN_ADMIN: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui • Bayar DP',
  DIKONFIRMASI: 'DP Lunas • Jadwal Terkunci',
  SIAP_DIAMBIL: 'Lunas • Siap Diambil',
  SEDANG_DISEWA: 'Sedang Disewa',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
  DIBATALKAN: 'Dibatalkan',
  KADALUARSA: 'Kadaluarsa',
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: 'Menunggu Diproses',
  DIPROSES: 'Sedang Disiapkan Gudang',
  SIAP_DIAMBIL: 'Siap Diambil • Bayar di Kasir',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
};

/** Nama alat, durasi, & nomor sewa dari data sewa (format API /api/equipments/rent) */
export function rentalSummary(r: any) {
  const items: any[] = Array.isArray(r?.items) ? r.items : [];
  const first = items[0];
  const name = first?.nama || 'Sewa Alat Pertanian';
  const extra = items.length > 1 ? ` +${items.length - 1} alat` : '';
  const durasi = Number(first?.durasi) || 1;
  const satuan = String(first?.satuanSewa || 'hari').toLowerCase();
  return {
    name: `${name}${extra}`,
    durationLabel: `${durasi} ${satuan}`,
    ref: `#${r?.rentalCode || String(r?.id || '').slice(0, 8)}`,
    total: Number(r?.totalEstimasi ?? r?.totalAmount ?? 0),
  };
}

export type SaleTone = 'paid' | 'ready' | 'waiting';

/**
 * Status hasil penjualan petani:
 * - sudah diserahkan tunai
 * - siap diambil di kasir (pesanan pembeli selesai & lunas)
 * - menunggu pesanan pembeli selesai
 */
export function saleStatus(s: { payoutStatus?: string; orderStatus?: string; orderPaid?: boolean }) {
  if (s.payoutStatus === 'SUDAH_DICAIRKAN_CASH') {
    return { tone: 'paid' as SaleTone, label: 'Sudah Diterima Tunai', isPaid: true };
  }
  // Data lama tanpa orderStatus: anggap siap (perilaku sebelumnya)
  const ready = s.orderStatus === undefined || (s.orderStatus === 'SELESAI' && s.orderPaid !== false);
  return ready
    ? { tone: 'ready' as SaleTone, label: 'Siap Diambil di Kasir', isPaid: false }
    : { tone: 'waiting' as SaleTone, label: 'Menunggu Pesanan Pembeli Selesai', isPaid: false };
}
