import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readEquipmentsFromFile, type EquipmentItem } from '@/lib/equipments';
import { getActiveRentedUnitsMap } from '@/lib/equipment-rentals';
import {
  readEquipmentReviewsFromFile,
  calculateEquipmentStats,
} from '@/lib/equipment-reviews';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID alat diperlukan' }, { status: 400 });
    }

    let equipment: EquipmentItem | null = null;

    // Coba ambil dari database
    try {
      const dbEquipments: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM equipments WHERE id = $1 LIMIT 1`,
        id
      );

      if (dbEquipments && dbEquipments.length > 0) {
        const eq = dbEquipments[0];
        equipment = {
          id: eq.id,
          nama: eq.nama,
          kategori: eq.kategori,
          deskripsi: eq.deskripsi,
          spesifikasi: eq.spesifikasi,
          hargaSewa: Number(eq.hargaSewa),
          satuanSewa: eq.satuanSewa || 'hari',
          biayaOperator: eq.biayaOperator !== null ? Number(eq.biayaOperator) : null,
          stokUnit: Number(eq.stokUnit) || 1,
          kondisi: eq.kondisi || 'Sangat Baik',
          imageUrl: eq.imageUrl,
          isTersedia: eq.isTersedia ?? true,
          kontakPj: eq.kontakPj,
          createdAt: eq.createdAt,
          updatedAt: eq.updatedAt,
        };
      }
    } catch {}

    // Fallback ke file data lokal
    if (!equipment) {
      const list = readEquipmentsFromFile();
      const found = list.find((item) => item.id === id);
      if (found) {
        equipment = found;
      }
    }

    if (!equipment) {
      return NextResponse.json(
        { error: 'Unit alat pertanian tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hitung sisa stok tersedia secara dinamis
    const rentedMap = getActiveRentedUnitsMap();
    const rented = rentedMap[equipment.id] || 0;
    const totalStok = Number(equipment.stokUnit) || 0;
    const stokTersedia = Math.max(0, totalStok - rented);
    const isAvailable = Boolean(equipment.isTersedia) && stokTersedia > 0;

    const enrichedEquipment: EquipmentItem = {
      ...equipment,
      stokUnit: totalStok,
      stokTersedia,
      unitDisewa: rented,
      isTersedia: isAvailable,
    };

    // Ambil ulasan & statistik ulasan alat
    const allReviews = readEquipmentReviewsFromFile();
    const reviews = allReviews.filter((r) => r.equipmentId === equipment.id);
    const stats = calculateEquipmentStats(reviews);

    return NextResponse.json({
      success: true,
      equipment: enrichedEquipment,
      reviews,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching equipment detail:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat detail alat' },
      { status: 500 }
    );
  }
}
