import { NextResponse } from 'next/server';
import { actorFromSession, logAudit, rpAudit } from '@/lib/audit-log';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';

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
    if (petaniId !== undefined) {
      if (!petaniId || !String(petaniId).trim()) {
        return NextResponse.json(
          { error: 'Mitra petani wajib dipilih dan tidak boleh kosong.' },
          { status: 400 }
        );
      }

      const farmer = await prisma.user.findUnique({
        where: { id: String(petaniId).trim() },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!farmer) {
        return NextResponse.json(
          { error: 'Akun mitra petani tidak ditemukan di database koperasi.' },
          { status: 404 }
        );
      }

      if (farmer.role !== 'PETANI') {
        return NextResponse.json(
          {
            error: `Akun "${farmer.email}" terdaftar sebagai "${farmer.role}". Komoditas wajib dimiliki oleh akun dengan role PETANI (bukan akun Admin atau Pembeli).`,
          },
          { status: 400 }
        );
      }

      updateData.petaniId = farmer.id;
    }

    const before = await prisma.product.findUnique({
      where: { id },
      select: { nama: true, hargaPerSatuan: true, stok: true, isTersedia: true, petaniId: true },
    });

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

    // Invalidate product and farmer caches
    await Promise.all([
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

    {
      const changes: string[] = [];
      if (before && Number(before.hargaPerSatuan) !== Number(updated.hargaPerSatuan))
        changes.push(`harga ${rpAudit(before.hargaPerSatuan)} → ${rpAudit(updated.hargaPerSatuan)}`);
      if (before && before.stok !== updated.stok) changes.push(`stok ${before.stok} → ${updated.stok}`);
      if (before && before.isTersedia !== updated.isTersedia) changes.push(updated.isTersedia ? 'diaktifkan' : 'dinonaktifkan');
      if (before && before.petaniId !== updated.petaniId) changes.push('pemilik petani diganti');
      if (before && before.nama !== updated.nama) changes.push(`nama "${before.nama}" → "${updated.nama}"`);
      await logAudit({
        actor: actorFromSession(session),
        action: 'PRODUCT_UPDATE',
        entityType: 'PRODUCT',
        entityId: id,
        entityLabel: updated.nama,
        summary: `Mengubah produk "${updated.nama}"${changes.length ? `: ${changes.join(', ')}` : ''}`,
        details: {
          before: before ? { ...before, hargaPerSatuan: Number(before.hargaPerSatuan) } : null,
          after: { hargaPerSatuan: Number(updated.hargaPerSatuan), stok: updated.stok, isTersedia: updated.isTersedia },
        },
      });
    }

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

    // Invalidate product and farmer caches
    await Promise.all([
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
      delCachePattern('petani:*'),
    ]).catch(() => {});

    await logAudit({
      actor: actorFromSession(session),
      action: 'PRODUCT_AVAILABILITY',
      entityType: 'PRODUCT',
      entityId: id,
      entityLabel: updated.nama,
      summary: `${updated.isTersedia ? 'Mengaktifkan' : 'Menonaktifkan'} produk "${updated.nama}" di toko`,
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

    // Produk yang sudah pernah terjual tidak boleh dihapus (riwayat penjualan & bagi hasil akan hilang)
    const target = await prisma.product.findUnique({ where: { id }, select: { nama: true } });
    const soldCount = await prisma.orderItem.count({ where: { productId: id } });
    if (soldCount > 0) {
      return NextResponse.json({ error: 'Produk ini sudah pernah terjual, jadi tidak bisa dihapus (riwayat penjualan & bagi hasil petani akan hilang). Matikan "Tersedia" agar tidak tampil di toko.', code: 'HAS_SALES' }, { status: 409 });
    }

    // Hapus relasi yang merujuk ke produk (reviews) dalam transaksi
    await prisma.$transaction(async (tx) => {
      // 1. Hapus reviews terkait produk
      await tx.review.deleteMany({
        where: { productId: id },
      });

      // 2. Ambil list order yang memuat item produk ini
      const relatedItems = await tx.orderItem.findMany({
        where: { productId: id },
        select: { orderId: true },
      });
      const orderIds = Array.from(new Set(relatedItems.map((item) => item.orderId)));

      // 3. Hapus order_items terkait produk
      await tx.orderItem.deleteMany({
        where: { productId: id },
      });

      // 4. Bersihkan data pesanan yang kosong jika seluruh itemnya telah dihapus
      for (const orderId of orderIds) {
        const remainingCount = await tx.orderItem.count({
          where: { orderId },
        });
        if (remainingCount === 0) {
          await tx.order.delete({
            where: { id: orderId },
          });
        }
      }

      // 5. Hapus produk
      await tx.product.delete({
        where: { id },
      });
    });

    // Invalidate product, farmer, and order caches
    await Promise.all([
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
      delCachePattern('petani:*'),
      delCachePattern('admin:orders:*'),
      delCachePattern('admin:payouts:*'),
      delCachePattern('user:orders:*'),
    ]).catch(() => {});

    await logAudit({
      actor: actorFromSession(session),
      action: 'PRODUCT_DELETE',
      entityType: 'PRODUCT',
      entityId: id,
      entityLabel: target?.nama || null,
      summary: `Menghapus produk "${target?.nama || id}" (belum pernah terjual)`,
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
