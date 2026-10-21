import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCachePattern } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mineOnly = searchParams.get('mine') === 'true';
    const kategori = searchParams.get('kategori');
    const search = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 30;
    const skip = (page - 1) * limit;

    const session = await auth();

    // 1. Jika filter produk saya (petani login), gunakan query spesifik user
    if (mineOnly) {
      if (!session?.user?.id && !session?.user?.email) {
        return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
      }

      // Cari user berdasarkan email untuk mendapatkan ID terverifikasi di DB
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email?.trim().toLowerCase() },
      });

      if (!dbUser) {
        return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
      }

      const cacheKey = `products:v3:mine:${dbUser.id}:p=${page}:l=${limit}:cat=${kategori || 'ALL'}:q=${search || ''}`;
      const cached = await getCache<any>(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }

      const whereCondition = {
        petaniId: dbUser.id,
        ...(kategori && kategori !== 'SEMUA' && { kategori }),
        ...(search && {
          OR: [
            { nama: { contains: search, mode: 'insensitive' as const } },
            { deskripsi: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [totalCount, rawProducts] = await Promise.all([
        prisma.product.count({ where: whereCondition }),
        prisma.product.findMany({
          where: whereCondition,
          include: {
            petani: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatarUrl: true,
              },
            },
            orderItems: {
              where: {
                order: { status: { not: 'DIBATALKAN' } },
              },
              select: {
                quantity: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const products = rawProducts.map((p: any) => {
        const totalTerjual = p.orderItems?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) || 0;
        const { orderItems, ...rest } = p;
        return {
          ...rest,
          totalTerjual,
        };
      });

      const hasMore = skip + products.length < totalCount;
      const responseData = {
        success: true,
        products,
        pagination: {
          totalCount,
          page,
          limit,
          hasMore,
          totalPages: Math.ceil(totalCount / limit),
        },
      };

      await setCache(cacheKey, responseData, 180); // 3 menit
      return NextResponse.json(responseData);
    }

    // 2. Katalog Publik Koperasi (Dengan Redis Cache-Aside)
    const publicCacheKey = `products:v3:public:p=${page}:l=${limit}:cat=${kategori || 'ALL'}:q=${search || ''}`;
    const cachedCatalog = await getCache<any>(publicCacheKey);
    if (cachedCatalog) {
      return NextResponse.json(cachedCatalog);
    }

    // Mengambil seluruh produk yang aktif di Koperasi dari DB jika cache miss
    const whereCondition = {
      isTersedia: true,
      ...(kategori && kategori !== 'SEMUA' && { kategori }),
      ...(search && {
        OR: [
          { nama: { contains: search, mode: 'insensitive' as const } },
          { deskripsi: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [totalCount, rawProducts] = await Promise.all([
      prisma.product.count({ where: whereCondition }),
      prisma.product.findMany({
        where: whereCondition,
        include: {
          petani: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
          orderItems: {
            where: {
              order: { status: { not: 'DIBATALKAN' } },
            },
            select: {
              quantity: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const products = rawProducts.map((p: any) => {
      const totalTerjual = p.orderItems?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) || 0;
      const { orderItems, ...rest } = p;
      return {
        ...rest,
        totalTerjual,
      };
    });

    const hasMore = skip + products.length < totalCount;
    const responseData = {
      success: true,
      products,
      pagination: {
        totalCount,
        page,
        limit,
        hasMore,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    // Simpan ke Redis selama 300 detik (5 menit)
    await setCache(publicCacheKey, responseData, 300);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error saat mengambil produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat produk' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });

    if (!dbUser || dbUser.role !== 'PETANI' || !dbUser.isVerified) {
      return NextResponse.json(
        { error: 'Hanya petani terverifikasi yang dapat menambahkan produk komoditas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nama, deskripsi, kategori, hargaPerSatuan, satuan, stok, imageUrl } = body;

    if (!nama || typeof nama !== 'string' || !nama.trim()) {
      return NextResponse.json({ error: 'Nama produk wajib diisi.' }, { status: 400 });
    }

    if (!kategori || typeof kategori !== 'string') {
      return NextResponse.json({ error: 'Kategori produk wajib dipilih.' }, { status: 400 });
    }

    const parsedPrice = parseFloat(hargaPerSatuan);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: 'Harga produk harus berupa angka positif.' }, { status: 400 });
    }

    const parsedStock = parseInt(stok, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return NextResponse.json({ error: 'Stok produk tidak valid.' }, { status: 400 });
    }

    const newProduct = await prisma.product.create({
      data: {
        nama: nama.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : null,
        kategori: kategori.trim(),
        hargaPerSatuan: parsedPrice,
        satuan: satuan ? satuan.trim() : 'kg',
        stok: parsedStock,
        imageUrl: imageUrl || null,
        isTersedia: true,
        petaniId: dbUser.id,
      },
    });

    // Invalidate Redis Cache untuk katalog dan dashboard petani
    await Promise.all([
      delCachePattern('products:*'),
      delCachePattern('petani:dashboard:*'),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil ditambahkan ke katalog!',
      product: newProduct,
    });
  } catch (error: any) {
    console.error('Error saat membuat produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan produk' }, { status: 500 });
  }
}
