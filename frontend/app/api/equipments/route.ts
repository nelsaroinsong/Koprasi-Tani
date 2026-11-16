import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import { getEquipments, type EquipmentItem } from '@/lib/equipments';
import { expireOverdueRentals, getActiveRentedUnitsMap } from '@/lib/equipment-rentals';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'equipments:list:public';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kategori = searchParams.get('kategori');
    const search = searchParams.get('search')?.toLowerCase().trim();

    // Kategori alat yang dinonaktifkan admin
    const inactiveCats = new Set<string>();
    try {
      const cats = await prisma.equipmentCategory.findMany({
        where: { isActive: false },
        select: { name: true, slug: true },
      });
      cats.forEach((c) => {
        inactiveCats.add(c.name.toLowerCase().trim());
        if (c.slug) inactiveCats.add(c.slug.toLowerCase().trim());
      });
    } catch {}

    if (kategori && kategori !== 'SEMUA' && inactiveCats.has(kategori.toLowerCase().trim())) {
      return NextResponse.json({ success: true, equipments: [] });
    }

    if (!kategori && !search) {
      const cached = await getCache<EquipmentItem[]>(CACHE_KEY);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        const filteredCached =
          inactiveCats.size > 0
            ? cached.filter((eq) => !eq.kategori || !inactiveCats.has(eq.kategori.toLowerCase().trim()))
            : cached;
        return NextResponse.json({ success: true, equipments: filteredCached });
      }
    }

    await expireOverdueRentals();
    let list = await getEquipments();

    // Stok tersedia HARI INI: total unit dikurangi unit yang terjadwal dipakai hari ini.
    // Sewa untuk tanggal lain tidak mengurangi stok hari ini.
    const rentedMap = await getActiveRentedUnitsMap();
    list = list.map((eq) => {
      const rented = rentedMap[eq.id] || 0;
      const totalStok = Number(eq.stokUnit) || 0;
      const stokTersedia = Math.max(0, totalStok - rented);
      return {
        ...eq,
        stokUnit: totalStok,
        stokTersedia,
        unitDisewa: rented,
        isTersedia: Boolean(eq.isTersedia) && stokTersedia > 0,
      };
    });

    if (inactiveCats.size > 0) {
      list = list.filter((eq) => !eq.kategori || !inactiveCats.has(eq.kategori.toLowerCase().trim()));
    }

    if (kategori && kategori !== 'SEMUA') {
      list = list.filter((eq) => eq.kategori?.toLowerCase().trim() === kategori.toLowerCase().trim());
    }

    if (search) {
      list = list.filter(
        (eq) =>
          eq.nama.toLowerCase().includes(search) ||
          (eq.deskripsi && eq.deskripsi.toLowerCase().includes(search)) ||
          (eq.spesifikasi && eq.spesifikasi.toLowerCase().includes(search))
      );
    }

    if (!kategori && !search) {
      await setCache(CACHE_KEY, list, 180);
    }

    return NextResponse.json({ success: true, equipments: list });
  } catch (error: any) {
    console.error('Error saat mengambil data sewa alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat katalog sewa alat' },
      { status: 500 }
    );
  }
}
