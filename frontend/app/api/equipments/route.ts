import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import { readEquipmentsFromFile, type EquipmentItem } from '@/lib/equipments';
import { getActiveRentedUnitsMap } from '@/lib/equipment-rentals';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'equipments:list:public';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kategori = searchParams.get('kategori');
    const search = searchParams.get('search')?.toLowerCase().trim();

    // Cek cache Redis jika tanpa filter query
    if (!kategori && !search) {
      const cached = await getCache<EquipmentItem[]>(CACHE_KEY);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return NextResponse.json({ success: true, equipments: cached });
      }
    }

    // Ambil data (dari database jika ada, atau fallback file)
    let list: EquipmentItem[] = [];

    try {
      const dbEquipments: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM equipments ORDER BY "createdAt" DESC`
      );

      if (dbEquipments && dbEquipments.length > 0) {
        list = dbEquipments.map((eq) => ({
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
        }));
      }
    } catch {
      // Jika tabel belum diisi, baca dari file lokal
    }

    if (list.length === 0) {
      list = readEquipmentsFromFile();
      // Sinkronkan ke database PostgreSQL di latar belakang
      try {
        for (const item of list) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO equipments (id, nama, kategori, deskripsi, spesifikasi, "hargaSewa", "satuanSewa", "biayaOperator", "stokUnit", kondisi, "imageUrl", "isTersedia", "kontakPj", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            item.id,
            item.nama,
            item.kategori,
            item.deskripsi,
            item.spesifikasi,
            item.hargaSewa,
            item.satuanSewa,
            item.biayaOperator,
            item.stokUnit,
            item.kondisi,
            item.imageUrl,
            item.isTersedia,
            item.kontakPj
          );
        }
      } catch {}
    }

    // Hitung stok tersedia secara dinamis berdasarkan unit yang sedang aktif disewa
    const rentedMap = getActiveRentedUnitsMap();
    list = list.map((eq) => {
      const rented = rentedMap[eq.id] || 0;
      const totalStok = Number(eq.stokUnit) || 0;
      const stokTersedia = Math.max(0, totalStok - rented);
      const isAvailable = Boolean(eq.isTersedia) && stokTersedia > 0;
      return {
        ...eq,
        stokUnit: totalStok,
        stokTersedia,
        unitDisewa: rented,
        isTersedia: isAvailable,
      };
    });

    // Terapkan filter kategori jika ada
    if (kategori && kategori !== 'SEMUA') {
      list = list.filter((eq) => eq.kategori === kategori);
    }

    // Terapkan filter pencarian nama / spesifikasi jika ada
    if (search) {
      list = list.filter(
        (eq) =>
          eq.nama.toLowerCase().includes(search) ||
          (eq.deskripsi && eq.deskripsi.toLowerCase().includes(search)) ||
          (eq.spesifikasi && eq.spesifikasi.toLowerCase().includes(search))
      );
    }

    // Cache hasil selama 180 detik (3 menit) jika tanpa filter
    if (!kategori && !search) {
      await setCache(CACHE_KEY, list, 180);
    }

    return NextResponse.json({
      success: true,
      equipments: list,
    });
  } catch (error: any) {
    console.error('Error saat mengambil data sewa alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat katalog sewa alat' },
      { status: 500 }
    );
  }
}
