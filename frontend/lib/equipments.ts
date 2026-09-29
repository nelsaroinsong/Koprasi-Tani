import fs from 'fs';
import path from 'path';

export interface EquipmentItem {
  id: string;
  nama: string;
  kategori: string;
  deskripsi: string | null;
  spesifikasi: string | null;
  hargaSewa: number;
  satuanSewa: string;
  biayaOperator: number | null;
  stokUnit: number;
  kondisi: string;
  imageUrl: string | null;
  isTersedia: boolean;
  kontakPj: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const EQUIPMENTS_FILE = path.join(process.cwd(), 'data', 'equipments.json');

export function readEquipmentsFromFile(): EquipmentItem[] {
  try {
    if (fs.existsSync(EQUIPMENTS_FILE)) {
      const data = fs.readFileSync(EQUIPMENTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading equipments from file:', e);
  }
  return [];
}

export function writeEquipmentsToFile(items: EquipmentItem[]): void {
  try {
    const dir = path.dirname(EQUIPMENTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(EQUIPMENTS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing equipments to file:', e);
  }
}
