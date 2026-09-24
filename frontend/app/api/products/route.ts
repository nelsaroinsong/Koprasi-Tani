import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mineOnly = searchParams.get('mine') === 'true';
    const kategori = searchParams.get('kategori');
    const search = searchParams.get('search');

    const session = await auth();

    // Jika filter produk saya, pastikan user sudah login
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

      const products = await prisma.product.findMany({
        where: {
          petaniId: dbUser.id,
          ...(kategori && kategori !== 'SEMUA' && { kategori }),
          ...(search && {
            OR: [
              { nama: { contains: search, mode: 'insensitive' } },
              { deskripsi: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, products });
    }

    // Mengambil seluruh produk yang aktif di Koperasi
    const products = await prisma.product.findMany({
      where: {
        isTersedia: true,
        ...(kategori && kategori !== 'SEMUA' && { kategori }),
        ...(search && {
          OR: [
            { nama: { contains: search, mode: 'insensitive' } },
            { deskripsi: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        petani: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, products });
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
