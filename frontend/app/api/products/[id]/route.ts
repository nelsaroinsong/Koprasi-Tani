import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Pastikan produk ada
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Hanya pemilik produk atau admin yang berhak mengedit
    if (existingProduct.petaniId !== dbUser.id && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki hak untuk mengubah produk ini.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nama, deskripsi, kategori, hargaPerSatuan, satuan, stok, imageUrl, isTersedia } = body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(nama && { nama: nama.trim() }),
        ...(deskripsi !== undefined && { deskripsi: deskripsi ? deskripsi.trim() : null }),
        ...(kategori && { kategori: kategori.trim() }),
        ...(hargaPerSatuan !== undefined && { hargaPerSatuan: parseFloat(hargaPerSatuan) }),
        ...(satuan && { satuan: satuan.trim() }),
        ...(stok !== undefined && { stok: parseInt(stok, 10) }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(isTersedia !== undefined && { isTersedia: Boolean(isTersedia) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui!',
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Error saat update produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui produk' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Hanya pemilik produk atau admin yang berhak menghapus
    if (existingProduct.petaniId !== dbUser.id && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki hak untuk menghapus produk ini.' },
        { status: 403 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus dari katalog.',
    });
  } catch (error: any) {
    console.error('Error saat menghapus produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus produk' }, { status: 500 });
  }
}
