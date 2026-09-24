import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// 1. PUT: Update data komoditas secara komprehensif
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      nama,
      deskripsi,
      kategori,
      hargaPerSatuan,
      satuan,
      stok,
      imageUrl,
      isTersedia,
      petaniId,
    } = body;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (nama !== undefined) updateData.nama = nama.trim();
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi?.trim() || null;
    if (kategori !== undefined) updateData.kategori = kategori.trim();
    if (hargaPerSatuan !== undefined) updateData.hargaPerSatuan = parseFloat(hargaPerSatuan);
    if (satuan !== undefined) updateData.satuan = satuan.trim();
    if (stok !== undefined) updateData.stok = parseInt(stok, 10);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (isTersedia !== undefined) updateData.isTersedia = Boolean(isTersedia);
    if (petaniId !== undefined && petaniId) updateData.petaniId = petaniId;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
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
        ...updated,
        hargaPerSatuan: Number(updated.hargaPerSatuan),
      },
    });
  } catch (error) {
    console.error('Error updating product by admin:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data produk' }, { status: 500 });
  }
}

// 2. PATCH: Quick toggle ketersediaan (Aktif Dijual vs Nonaktif)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isTersedia } = body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        isTersedia: Boolean(isTersedia),
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        ...updated,
        hargaPerSatuan: Number(updated.hargaPerSatuan),
      },
    });
  } catch (error) {
    console.error('Error toggle status product by admin:', error);
    return NextResponse.json({ error: 'Gagal mengubah status ketersediaan' }, { status: 500 });
  }
}

// 3. DELETE: Hapus komoditas oleh admin
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus oleh administrator',
    });
  } catch (error) {
    console.error('Error delete product by admin:', error);
    return NextResponse.json({ error: 'Gagal menghapus produk' }, { status: 500 });
  }
}
