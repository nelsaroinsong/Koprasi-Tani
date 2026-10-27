import fs from 'fs';
import path from 'path';

export type EquipmentRentalStatus =
  | 'MENUNGGU_PERSETUJUAN_ADMIN'
  | 'DISETUJUI'
  | 'SIAP_DIAMBIL'
  | 'SEDANG_DISEWA'
  | 'SELESAI'
  | 'DITOLAK'
  | 'DIBATALKAN';

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
  items: EquipmentRentalOrderItem[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  rejectedReason?: string | null;
}

const RENTALS_FILE = path.join(process.cwd(), 'data', 'equipment-rentals.json');

export function readEquipmentRentals(): EquipmentRentalOrder[] {
  try {
    if (!fs.existsSync(RENTALS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(RENTALS_FILE, 'utf-8');
    return JSON.parse(data) || [];
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

// Menghitung jumlah unit yang sedang aktif disewa (status belum selesai dan tidak ditolak)
export function getActiveRentedUnitsMap(): Record<string, number> {
  const allRentals = readEquipmentRentals();
  const activeRentals = allRentals.filter((r) =>
    ['MENUNGGU_PERSETUJUAN_ADMIN', 'DISETUJUI', 'SIAP_DIAMBIL', 'SEDANG_DISEWA'].includes(r.status)
  );

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

