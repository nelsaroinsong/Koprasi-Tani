import type { Equipment } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
  stokTersedia?: number;
  unitDisewa?: number;
  kondisi: string;
  imageUrl: string | null;
  isTersedia: boolean;
  kontakPj: string | null;
  /** Jeda hari setelah setiap sewa sebelum unit bisa disewa lagi */
  jedaHari?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function toEquipmentItem(eq: Equipment): EquipmentItem {
  return {
    id: eq.id,
    nama: eq.nama,
    kategori: eq.kategori,
    deskripsi: eq.deskripsi,
    spesifikasi: eq.spesifikasi,
    hargaSewa: Number(eq.hargaSewa),
    satuanSewa: eq.satuanSewa || 'hari',
    biayaOperator: eq.biayaOperator !== null ? Number(eq.biayaOperator) : null,
    stokUnit: Number(eq.stokUnit) || 0,
    kondisi: eq.kondisi || 'Sangat Baik',
    imageUrl: eq.imageUrl,
    isTersedia: eq.isTersedia,
    kontakPj: eq.kontakPj,
    jedaHari: eq.jedaHari,
    createdAt: eq.createdAt.toISOString(),
    updatedAt: eq.updatedAt.toISOString(),
  };
}

/** Seluruh alat dari database, terbaru lebih dulu */
export async function getEquipments(): Promise<EquipmentItem[]> {
  const rows = await prisma.equipment.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toEquipmentItem);
}

export async function getEquipmentById(id: string): Promise<EquipmentItem | null> {
  const row = await prisma.equipment.findUnique({ where: { id } });
  return row ? toEquipmentItem(row) : null;
}
