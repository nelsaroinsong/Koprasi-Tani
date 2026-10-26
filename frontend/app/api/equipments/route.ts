import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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

    // Cek daftar kategori yang dinonaktifkan
    const inactiveCats = new Set<string>();
    try {
      const catFile = path.join(process.cwd(), 'data', 'equipment-categories.json');
      if (fs.existsSync(catFile)) {
        const raw = fs.readFileSync(catFile, 'utf-8');
        const cats = JSON.parse(raw);
        if (Array.isArray(cats)) {
          cats.forEach((c: any) => {
            if (c.isActive === false && c.name) {
              inactiveCats.add(c.name.toLowerCase().trim());
              if (c.slug) inactiveCats.add(c.slug.toLowerCase().trim());
            }
          });
        }
      }
    } catch {}

    // Jika filter kategori yang diminta sedang dinonaktifkan admin, langsung kembalikan kosong
    if (kategori && kategori !== 'SEMUA' && inactiveCats.has(kategori.toLowerCase().trim())) {
      return NextResponse.json({
        success: true,
        equipments: [],
      });
    }

    // Cek cache Redis jika tanpa filter query
    if (!kategori && !search) {
      const cached = await getCache<EquipmentItem[]>(CACHE_KEY);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        // Tetap saring kategori nonaktif jika ada
        const filteredCached = inactiveCats.size > 0
          ? cached.filter((eq) => !eq.kategori || !inactiveCats.has(eq.kategori.toLowerCase().trim()))
          : cached;
        return NextResponse.json({ success: true, equipments: filteredCached });
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

    // Saring alat dengan kategori yang dinonaktifkan admin
    if (inactiveCats.size > 0) {
      list = list.filter((eq) => !eq.kategori || !inactiveCats.has(eq.kategori.toLowerCase().trim()));
    }

    // Terapkan filter kategori jika ada
    if (kategori && kategori !== 'SEMUA') {
      list = list.filter((eq) => eq.kategori?.toLowerCase().trim() === kategori.toLowerCase().trim());
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
