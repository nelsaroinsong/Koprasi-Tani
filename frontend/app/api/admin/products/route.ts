import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// 1. READ: Ambil daftar seluruh produk untuk admin dengan pagination, search, dan filter
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim();
    const kategori = searchParams.get('kategori');
    const statusParam = searchParams.get('status');

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '8', 10)));
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, any> = {};

    if (kategori && kategori !== 'SEMUA') {
      whereCondition.kategori = { equals: kategori, mode: 'insensitive' };
    }

    if (statusParam === 'AVAILABLE') {
      whereCondition.isTersedia = true;
    } else if (statusParam === 'UNAVAILABLE') {
      whereCondition.isTersedia = false;
    }

    if (search) {
      whereCondition.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } },
        { kategori: { contains: search, mode: 'insensitive' } },
        {
          petani: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Query data produk, total count, dan opsi petani secara paralel
    const [totalCount, products, petaniUsers] = await Promise.all([
      prisma.product.count({ where: whereCondition }),
      prisma.product.findMany({
        where: whereCondition,
        include: {
          petani: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.findMany({
        where: {
          OR: [{ role: 'PETANI' }, { role: 'ADMIN' }],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        id: p.id,
        nama: p.nama,
        deskripsi: p.deskripsi,
        kategori: p.kategori,
        hargaPerSatuan: Number(p.hargaPerSatuan),
        satuan: p.satuan,
        stok: p.stok,
        imageUrl: p.imageUrl,
        isTersedia: p.isTersedia,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        petaniId: p.petaniId,
        petani: p.petani,
      })),
      petaniOptions: petaniUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error saat mengambil data produk admin:', error);
    return NextResponse.json({ error: 'Gagal mengambil data produk' }, { status: 500 });
  }
}

// 2. CREATE: Tambah komoditas baru oleh Admin
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const {
      nama,
      deskripsi,
      kategori,
      hargaPerSatuan,
      satuan,
      stok,
      imageUrl,
      petaniId,
      isTersedia = true,
    } = body;

    if (!nama || !kategori || !hargaPerSatuan) {
      return NextResponse.json(
        { error: 'Nama, kategori, dan harga per satuan wajib diisi' },
        { status: 400 }
      );
    }

    // Tentukan petaniId: jika tidak ditentukan, gunakan user admin yang sedang login
    let targetPetaniId = petaniId;
    if (!targetPetaniId) {
      const currentAdmin = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      if (!currentAdmin) {
        return NextResponse.json({ error: 'Akun admin tidak ditemukan' }, { status: 404 });
      }
      targetPetaniId = currentAdmin.id;
    }

    const newProduct = await prisma.product.create({
      data: {
        nama: nama.trim(),
        deskripsi: deskripsi?.trim() || null,
        kategori: kategori.trim(),
        hargaPerSatuan: parseFloat(hargaPerSatuan),
        satuan: satuan?.trim() || 'kg',
        stok: parseInt(stok, 10) || 0,
        imageUrl: imageUrl?.trim() || null,
        isTersedia: Boolean(isTersedia),
        petaniId: targetPetaniId,
      },
      include: {
        petani: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        ...newProduct,
        hargaPerSatuan: Number(newProduct.hargaPerSatuan),
      },
    });
  } catch (error) {
    console.error('Error create product by admin:', error);
    return NextResponse.json({ error: 'Gagal menambahkan komoditas baru' }, { status: 500 });
  }
}
