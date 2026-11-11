import fs from 'fs';
import path from 'path';

export type EquipmentRentalStatus =
  | 'MENUNGGU_PERSETUJUAN_ADMIN'
  | 'DISETUJUI'
  | 'SIAP_DIAMBIL'
  | 'SEDANG_DISEWA'
  | 'SELESAI'
  | 'DITOLAK'
  | 'DIBATALKAN'
  | 'KADALUARSA';

export interface EquipmentRentalOrderItem {
  equipmentId: string;
  nama: string;
  kategori: string;
  hargaSewa: number;
  satuanSewa: string;
  jumlahUnit: number;
  durasi: number;
  includeOperator: boolean;
  biayaOperator?: number | null;
  subtotal: number;
  imageUrl?: string | null;
}

export interface EquipmentRentalOrder {
  id: string;
  rentalCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userRole?: string;
  status: EquipmentRentalStatus;
  startDate: string;
  endDate?: string;
  lokasiLahan?: string;
  farmLocationGps?: { lat: number; lng: number } | null;
  catatan?: string;
  totalEstimasi: number;
  paymentMethod: string;
  isPaid: boolean;
  paymentDeadline?: string | null;
  paidAt?: string | null;
  cashierName?: string | null;
  cashierNotes?: string | null;
  items: EquipmentRentalOrderItem[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  rejectedReason?: string | null;
}

const RENTALS_FILE = path.join(process.cwd(), 'data', 'equipment-rentals.json');

// Memeriksa dan otomatis mengupdate status pengajuan sewa yang belum dibayar tunai melewati batas waktu
export function autoExpireUnpaidRentals(rentals: EquipmentRentalOrder[]): {
  rentals: EquipmentRentalOrder[];
  hasChanged: boolean;
} {
  const now = Date.now();
  let hasChanged = false;

  const updatedRentals = rentals.map((r) => {
    // Pengajuan yang disetujui, belum dibayar tunai di kasir, dan batas waktu telah terlewati
    if (r.status === 'DISETUJUI' && !r.isPaid && r.paymentDeadline) {
      const deadlineMs = new Date(r.paymentDeadline).getTime();
      if (!isNaN(deadlineMs) && deadlineMs < now) {
        hasChanged = true;
        return {
          ...r,
          status: 'KADALUARSA' as EquipmentRentalStatus,
          catatan: r.catatan
            ? `${r.catatan} (Kadaluarsa: Melewati batas pembayaran tunai di kasir)`
            : 'Kadaluarsa: Melewati batas pembayaran tunai di kasir',
          updatedAt: new Date().toISOString(),
        };
      }
    }
    return r;
  });

  return { rentals: updatedRentals, hasChanged };
}

export function readEquipmentRentals(): EquipmentRentalOrder[] {
  try {
    if (!fs.existsSync(RENTALS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(RENTALS_FILE, 'utf-8');
    const rawList: EquipmentRentalOrder[] = JSON.parse(data) || [];

    // Jalankan auto-expire jika ada pesanan yang lewat tenggat kasir
    const { rentals, hasChanged } = autoExpireUnpaidRentals(rawList);
    if (hasChanged) {
      writeEquipmentRentals(rentals);
    }

    return rentals;
  } catch (error) {
    console.error('Error reading equipment rentals:', error);
    return [];
  }
}

export function writeEquipmentRentals(rentals: EquipmentRentalOrder[]): boolean {
  try {
    const dir = path.dirname(RENTALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(RENTALS_FILE, JSON.stringify(rentals, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing equipment rentals:', error);
    return false;
  }
}

// Menghitung jumlah unit yang sedang aktif disewa
// ATURAN PENTING:
// 1. MENUNGGU_PERSETUJUAN_ADMIN TIDAK memotong stok (masih reservasi sementara/draft).
// 2. DISETUJUI memotong stok sementara selama paymentDeadline belum lewat.
// 3. SIAP_DIAMBIL & SEDANG_DISEWA memotong stok secara permanen (karena sudah lunas di kasir).
// 4. SELESAI, DITOLAK, DIBATALKAN, KADALUARSA tidak memotong stok.
export function getActiveRentedUnitsMap(): Record<string, number> {
  const allRentals = readEquipmentRentals();
  const now = Date.now();

  const activeRentals = allRentals.filter((r) => {
    // Sudah lunas di kasir dan siap diambil atau sedang beroperasi di lapangan
    if (r.status === 'SIAP_DIAMBIL' || r.status === 'SEDANG_DISEWA') {
      return true;
    }
    // Disetujui tapi belum bayar tunai: hanya kunci stok jika batas bayar kasir belum kedaluwarsa
    if (r.status === 'DISETUJUI') {
      if (r.paymentDeadline) {
        const deadlineMs = new Date(r.paymentDeadline).getTime();
        if (!isNaN(deadlineMs) && deadlineMs < now) {
          return false;
        }
      }
      return true;
    }
    // MENUNGGU_PERSETUJUAN_ADMIN TIDAK memotong stok katalog!
    return false;
  });

  const rentedMap: Record<string, number> = {};
  for (const rental of activeRentals) {
    for (const item of rental.items || []) {
      if (item.equipmentId) {
        rentedMap[item.equipmentId] = (rentedMap[item.equipmentId] || 0) + (Number(item.jumlahUnit) || 1);
      }
    }
  }
  return rentedMap;
}

