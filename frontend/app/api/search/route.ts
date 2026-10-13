import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';
import { readEquipmentsFromFile, type EquipmentItem } from '@/lib/equipments';
import { recordSearchTerm } from '@/lib/popular-searches';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const limitParam = parseInt(searchParams.get('limit') || '5', 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);

    if (!query || query.length < 1) {
      return NextResponse.json({
        success: true,
        query: '',
        results: {
          products: [],
          equipments: [],
          users: [],
        },
        counts: {
          products: 0,
          equipments: 0,
          users: 0,
          total: 0,
        },
      });
    }

    // Catat statistik pencarian untuk menghitung kata kunci populer secara riil
    recordSearchTerm(query).catch(() => {});

    const cacheKey = `search:v4:${query.toLowerCase()}:${limit}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const lowerQuery = query.toLowerCase();

    // 1. Search Products (Toko Online Komoditas)
    const productsPromise = prisma.product.findMany({
      where: {
        isTersedia: true,
        OR: [
          { nama: { contains: query, mode: 'insensitive' } },
          { kategori: { contains: query, mode: 'insensitive' } },
          { deskripsi: { contains: query, mode: 'insensitive' } },
          { petani: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        nama: true,
        kategori: true,
        hargaPerSatuan: true,
        satuan: true,
        stok: true,
        imageUrl: true,
        petani: {
          select: {
            id: true,
            name: true,
            address: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // 2. Search Equipment (Sewa Alat Pertanian / Alsintan)
    const equipmentsPromise = (async () => {
      let list: EquipmentItem[] = [];
      try {
        const dbEquipments: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM equipments 
           WHERE "isTersedia" = true 
             AND (
               LOWER(nama) LIKE $1 
               OR LOWER(kategori) LIKE $1 
               OR LOWER(COALESCE(deskripsi, '')) LIKE $1 
               OR LOWER(COALESCE(spesifikasi, '')) LIKE $1
             )
           ORDER BY "createdAt" DESC 
           LIMIT $2`,
          `%${lowerQuery}%`,
          limit
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
          }));
        }
      } catch {
        // Fallback jika database raw query bermasalah
      }

      if (list.length === 0) {
        const fileEquipments = readEquipmentsFromFile();
        list = fileEquipments
          .filter(
            (eq) =>
              eq.isTersedia &&
              (eq.nama?.toLowerCase().includes(lowerQuery) ||
                eq.kategori?.toLowerCase().includes(lowerQuery) ||
                eq.deskripsi?.toLowerCase().includes(lowerQuery) ||
                eq.spesifikasi?.toLowerCase().includes(lowerQuery))
          )
          .slice(0, limit);
      }

      return list;
    })();

    // 3. Search Users (Hanya Petani Mitra & Anggota Pembeli, HANYA MENGGUNAKAN NAMA, TIDAK BOLEH ADMIN)
    const usersPromise = prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['PETANI', 'PEMBELI'] },
        NOT: [
          { role: 'ADMIN' },
          { email: { contains: 'admin', mode: 'insensitive' } },
          { name: { contains: 'Administrator', mode: 'insensitive' } },
          { name: { contains: 'admin', mode: 'insensitive' } },
        ],
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        address: true,
        avatarUrl: true,
        isVerified: true,
        _count: {
          select: {
            products: true,
            followers: true,
          },
        },
      },
      take: limit,
      orderBy: [{ role: 'asc' }, { isVerified: 'desc' }],
    });

    const [products, equipments, users] = await Promise.all([
      productsPromise,
      equipmentsPromise,
      usersPromise,
    ]);

    const formattedProducts = products.map((p: any) => ({
      ...p,
      hargaPerSatuan: Number(p.hargaPerSatuan),
    }));

    const formattedEquipments = equipments.map((e: EquipmentItem) => ({
      ...e,
      hargaSewa: Number(e.hargaSewa),
    }));

    // Filter ketat memastikan tidak ada akun admin sama sekali
    const formattedUsers = users
      .filter((u: any) => {
        if (u.role === 'ADMIN') return false;
        const nameLower = (u.name || '').toLowerCase();
        const emailLower = (u.email || '').toLowerCase();
        if (nameLower.includes('admin') || emailLower.includes('admin')) return false;
        return true;
      })
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        address: u.address,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        totalProduk: u._count.products,
        followersCount: u._count.followers,
      }));

    const responseData = {
      success: true,
      query,
      results: {
        products: formattedProducts,
        equipments: formattedEquipments,
        users: formattedUsers,
      },
      counts: {
        products: formattedProducts.length,
        equipments: formattedEquipments.length,
        users: formattedUsers.length,
        total: formattedProducts.length + formattedEquipments.length + formattedUsers.length,
      },
    };

    // Cache di Redis selama 60 detik
    await setCache(cacheKey, responseData, 60).catch(() => {});

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error pada API pencarian global:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan pada server saat memproses pencarian.',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
