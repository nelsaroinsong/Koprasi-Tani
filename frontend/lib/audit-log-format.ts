/**
 * Penerjemah & pemformat Log Aktivitas Admin ke Bahasa Indonesia yang ramah pengguna
 * (tanpa menampilkan JSON mentah atau nama field teknis).
 */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ORDER_STATUS: 'Status Pesanan',
  ORDER_EXTEND_PICKUP: 'Perpanjang Batas Ambil',
  ORDER_PAYMENT_FLAG: 'Status Pembayaran Pesanan',
  ORDER_ARCHIVE: 'Arsip Pesanan',
  ORDER_UNARCHIVE: 'Pulihkan Pesanan',
  RENTAL_STATUS: 'Status Sewa Alat',
  RENTAL_DP_REFUND: 'Pengembalian DP Sewa',
  RENTAL_ARCHIVE: 'Arsip Sewa Alat',
  RENTAL_UNARCHIVE: 'Pulihkan Sewa Alat',
  PAYOUT_CASH: 'Penyerahan Bagi Hasil Tunai',
  PRODUCT_UPDATE: 'Ubah Produk',
  PRODUCT_AVAILABILITY: 'Ketersediaan Produk',
  PRODUCT_DELETE: 'Hapus Produk',
  USER_CREATE: 'Tambah Akun',
  USER_UPDATE: 'Ubah Data Akun',
  USER_VERIFY: 'Verifikasi Petani',
  USER_DELETE: 'Hapus Akun',
  SETTINGS_WAREHOUSE: 'Lokasi Gudang',
  SETTINGS_MAINTENANCE: 'Pemeliharaan Sistem',
  REPORT_EXPORT: 'Unduh Laporan Keuangan',
};

const STATUS_LABELS: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: 'Menunggu Diproses',
  MENUNGGU_PERSETUJUAN_ADMIN: 'Menunggu Persetujuan',
  DIPROSES: 'Sedang Disiapkan',
  DISETUJUI: 'Disetujui (Bayar DP)',
  DIKONFIRMASI: 'DP Lunas (Jadwal Terkunci)',
  SIAP_DIAMBIL: 'Siap Diambil',
  SEDANG_DISEWA: 'Sedang Disewa',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
  DITOLAK: 'Ditolak',
  KADALUARSA: 'Kedaluwarsa',
  BELUM_DICAIRKAN: 'Belum Diserahkan',
  SUDAH_DICAIRKAN_CASH: 'Sudah Diserahkan Tunai',
  PEMBELI: 'Pembeli',
  PETANI: 'Petani',
  ADMIN: 'Administrator',
  NORMAL: 'Normal (Online)',
  ANNOUNCEMENT: 'Pengumuman Pra-Pemeliharaan',
  MAINTENANCE: 'Pemeliharaan Aktif',
};

const USER_FIELD_LABELS: Record<string, string> = {
  name: 'Nama Lengkap',
  email: 'Email',
  phone: 'Nomor Telepon',
  address: 'Alamat',
  role: 'Peran Akun',
  isActive: 'Status Aktif',
  isVerified: 'Status Verifikasi',
  isOnboarded: 'Status Pendaftaran',
  avatarUrl: 'Foto Profil',
  password: 'Kata Sandi',
  nama: 'Nama',
  hargaPerSatuan: 'Harga Satuan',
  stok: 'Stok',
  isTersedia: 'Ketersediaan di Toko',
  satuan: 'Satuan',
  kategori: 'Kategori',
  deskripsi: 'Deskripsi',
};

const CURRENCY_KEYS = new Set([
  'totalAmount',
  'total',
  'dpAmount',
  'totalEstimasi',
  'hargaPerSatuan',
  'lateFee',
  'damageFee',
  'paidAmount',
  'sisaBayar',
  'refundAmount',
  'amount',
]);

const DETAIL_KEY_LABELS: Record<string, string> = {
  from: 'Status Sebelumnya',
  to: 'Status Baru',
  status: 'Status',
  totalAmount: 'Total Transaksi',
  total: 'Total Diserahkan',
  dpAmount: 'Nominal DP',
  totalEstimasi: 'Total Estimasi Sewa',
  hargaPerSatuan: 'Harga Satuan',
  lateFee: 'Denda Keterlambatan',
  damageFee: 'Biaya Kerusakan',
  paidAmount: 'Nominal Dibayar',
  pickupCodeVerified: 'Verifikasi Kode Ambil',
  verifiedWithRollingCode: 'Verifikasi Kode 20 Detik',
  pickupDeadline: 'Batas Waktu Ambil',
  paymentDeadline: 'Batas Pembayaran',
  cancelReason: 'Alasan Pembatalan',
  rejectionReason: 'Alasan Penolakan',
  reason: 'Alasan',
  note: 'Catatan',
  notes: 'Catatan',
  catatan: 'Catatan',
  orderItemIds: 'Jumlah Item',
  fields: 'Data yang Diubah',
  deleted: 'Berhasil Dihapus',
  skipped: 'Dilewati',
  alamat: 'Alamat Gudang',
  telepon: 'Telepon Gudang',
  stok: 'Stok',
  isTersedia: 'Tampil di Toko',
  forceEnabled: 'Mode Darurat (Paksa Aktif)',
  startAt: 'Jadwal Mulai',
  endAt: 'Jadwal Selesai',
  noticeHoursBefore: 'Banner Peringatan Sebelum Mulai',
  recurringEnabled: 'Jadwal Rutin Mingguan',
  recurringSchedule: 'Waktu Rutin Mingguan',
  title: 'Judul Pemberitahuan',
  message: 'Pesan untuk Pengguna',
  contactInfo: 'Kontak Bantuan',
};

export interface FormattedDetailRow {
  label: string;
  value?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'money';
  transition?: { from: string; to: string };
  chips?: string[];
}

export function formatAuditAction(action: string): string {
  if (!action) return 'Aktivitas';
  if (AUDIT_ACTION_LABELS[action]) return AUDIT_ACTION_LABELS[action];
  return action
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export function humanizeStatusCode(raw: string): string {
  const trimmed = raw.trim();
  if (STATUS_LABELS[trimmed]) return STATUS_LABELS[trimmed];
  return trimmed;
}

/** Rapikan ringkasan lama di database agar kode status seperti SIAP_DIAMBIL tampil manusiawi */
export function formatAuditSummary(summary: string): string {
  if (!summary) return '';
  let out = summary;
  // Ganti token status uppercase paling panjang terlebih dahulu agar tidak tertimpa sebagian
  const tokens = Object.keys(STATUS_LABELS).sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    if (!out.includes(token)) continue;
    const regex = new RegExp(`\\b${token}\\b`, 'g');
    out = out.replace(regex, STATUS_LABELS[token]);
  }
  return out;
}

function formatRupiah(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
}

function formatWitaDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} WITA`;
}

function isIsoDateString(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val);
}

function humanizeKey(key: string): string {
  if (DETAIL_KEY_LABELS[key]) return DETAIL_KEY_LABELS[key];
  if (USER_FIELD_LABELS[key]) return USER_FIELD_LABELS[key];
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPlainValue(key: string, val: unknown): { value: string; tone?: FormattedDetailRow['tone'] } {
  if (val === null || val === undefined || val === '') {
    return { value: 'Tidak diisi' };
  }

  if (typeof val === 'boolean') {
    if (key === 'pickupCodeVerified' || key === 'verifiedWithRollingCode') {
      return val
        ? { value: 'Terverifikasi dengan kode', tone: 'success' }
        : { value: 'Belum diverifikasi', tone: 'warning' };
    }
    if (key === 'isTersedia') {
      return val ? { value: 'Tersedia di toko', tone: 'success' } : { value: 'Disembunyikan', tone: 'warning' };
    }
    if (key === 'forceEnabled' || key === 'recurringEnabled') {
      return val ? { value: 'Aktif', tone: 'warning' } : { value: 'Nonaktif', tone: 'default' };
    }
    return { value: val ? 'Ya' : 'Tidak', tone: val ? 'success' : 'default' };
  }

  if (typeof val === 'number') {
    if (CURRENCY_KEYS.has(key)) {
      return { value: formatRupiah(val), tone: 'money' };
    }
    if (key === 'noticeHoursBefore') {
      return { value: val === 0 ? 'Tidak pakai banner awal' : `${val} jam sebelum mulai` };
    }
    return { value: val.toLocaleString('id-ID') };
  }

  if (typeof val === 'string') {
    if (isIsoDateString(val)) {
      return { value: formatWitaDateTime(val) };
    }
    if (STATUS_LABELS[val]) {
      const tone: FormattedDetailRow['tone'] =
        val === 'SELESAI' || val === 'DIKONFIRMASI' || val === 'SIAP_DIAMBIL'
          ? 'success'
          : val === 'DIBATALKAN' || val === 'DITOLAK' || val === 'KADALUARSA'
            ? 'danger'
            : 'default';
      return { value: STATUS_LABELS[val], tone };
    }
    return { value: val };
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return { value: 'Tidak ada' };
    if (key === 'orderItemIds') return { value: `${val.length} item pesanan` };
    if (key === 'deleted') return { value: `${val.length} data` };
    if (key === 'skipped') return { value: `${val.length} data` };
    return { value: val.map((item) => String(item)).join(', ') };
  }

  return { value: 'Tersimpan' };
}

/**
 * Mengubah objek `details` log aktivitas menjadi daftar baris ramah admin.
 */
export function formatAuditDetails(details: Record<string, unknown> | null | undefined): FormattedDetailRow[] {
  if (!details || typeof details !== 'object') return [];

  const rows: FormattedDetailRow[] = [];
  const handled = new Set<string>();

  // 1. Transisi status (from -> to) dijadikan satu baris visual yang jelas
  if (typeof details.from === 'string' && typeof details.to === 'string') {
    rows.push({
      label: 'Perubahan Status',
      transition: {
        from: humanizeStatusCode(details.from),
        to: humanizeStatusCode(details.to),
      },
    });
    handled.add('from');
    handled.add('to');
  }

  // 2. Koordinat peta (latitude + longitude) digabung agar rapi
  if (typeof details.latitude === 'number' && typeof details.longitude === 'number') {
    rows.push({
      label: 'Koordinat Peta',
      value: `${details.latitude.toFixed(5)}, ${details.longitude.toFixed(5)}`,
    });
    handled.add('latitude');
    handled.add('longitude');
  }

  // 3. Perbandingan before / after (misal perubahan produk)
  if (
    details.before &&
    details.after &&
    typeof details.before === 'object' &&
    typeof details.after === 'object' &&
    !Array.isArray(details.before) &&
    !Array.isArray(details.after)
  ) {
    const beforeObj = details.before as Record<string, unknown>;
    const afterObj = details.after as Record<string, unknown>;
    const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));
    for (const k of allKeys) {
      const bVal = beforeObj[k];
      const aVal = afterObj[k];
      if (bVal === undefined && aVal === undefined) continue;
      if (bVal === aVal) continue;
      const bFmt = formatPlainValue(k, bVal).value;
      const aFmt = formatPlainValue(k, aVal).value;
      rows.push({
        label: humanizeKey(k),
        transition: { from: bFmt, to: aFmt },
      });
    }
    handled.add('before');
    handled.add('after');
  }

  // 4. Field lainnya
  for (const [key, val] of Object.entries(details)) {
    if (handled.has(key)) continue;
    if (val === undefined || val === null || val === '') continue;

    // Daftar nama field yang diubah (USER_UPDATE) -> tampil sebagai chip bahasa Indonesia
    if (key === 'fields' && Array.isArray(val)) {
      const chips = val.map((f) => USER_FIELD_LABELS[String(f)] || humanizeKey(String(f)));
      if (chips.length > 0) {
        rows.push({ label: 'Data yang Diubah', chips });
      }
      continue;
    }

    // Lewati array kosong untuk deleted/skipped agar tampilan bersih
    if ((key === 'skipped' || key === 'deleted') && Array.isArray(val) && val.length === 0) {
      continue;
    }

    // Nested object lain (selain before/after) diratakan secara aman
    if (typeof val === 'object' && !Array.isArray(val)) {
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        if (subVal === undefined || subVal === null || subVal === '') continue;
        const formatted = formatPlainValue(subKey, subVal);
        rows.push({
          label: `${humanizeKey(key)} · ${humanizeKey(subKey)}`,
          value: formatted.value,
          tone: formatted.tone,
        });
      }
      continue;
    }

    const formatted = formatPlainValue(key, val);
    rows.push({
      label: humanizeKey(key),
      value: formatted.value,
      tone: formatted.tone,
    });
  }

  return rows;
}
