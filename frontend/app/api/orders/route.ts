import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache, delCachePattern } from '@/lib/redis';

// 1. POST: Buat Pesanan Baru oleh Pembeli (Otomatis potong stok di gudang koperasi)
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk checkout pesanan.' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { items, paymentMethod = 'CASH_KOPERASI', catatan, alamatKirim } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Keranjang belanja masih kosong.' }, { status: 400 });
    }

    // Urutkan item berdasarkan productId secara deterministik untuk mencegah deadlock antar transaksi simultan
    const sortedItems = [...items].sort((a, b) => {
      const idA = a.productId || a.id || '';
      const idB = b.productId || b.id || '';
      return idA.localeCompare(idB);
    });

    // Jalankan transaksi database ACID dengan Pessimistic Row Locking (FOR UPDATE)
    // Menjamin secara matematis bahwa jika 2 pembeli checkout barang yang sama (sisa 1) di saat bersamaan,
    // pembeli kedua otomatis mengantre dan ditolak secara bersih setelah pembeli pertama selesai.
    const newOrder = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of sortedItems) {
        const prodId = item.productId || item.id;
        const requestedQty = parseInt(item.quantity, 10);
        if (isNaN(requestedQty) || requestedQty <= 0) {
          throw new Error('Jumlah pesanan tidak valid.');
        }

        // 1. Pessimistic Row-Level Lock di PostgreSQL (SELECT ... FOR UPDATE)
        // Row produk dikunci eksklusif. Transaksi lain yang mencoba mengakses produk ini WAJIB mengantre.
        const lockedRows: any[] = await tx.$queryRawUnsafe(
          `SELECT id, nama, stok, "hargaPerSatuan", satuan, "isTersedia", "petaniId"
           FROM products
           WHERE id = $1
           FOR UPDATE`,
          prodId
        );

        if (!lockedRows || lockedRows.length === 0) {
          throw new Error(`Komoditas dengan ID "${prodId}" tidak ditemukan.`);
        }

        const product = lockedRows[0];

        if (!product.isTersedia) {
          throw new Error(`Komoditas "${product.nama}" saat ini sedang dinonaktifkan dari katalog.`);
        }

        const currentStock = parseInt(product.stok, 10);

        // Periksa ketersediaan stok terkini setelah lock didapatkan
        if (currentStock < requestedQty) {
          if (currentStock <= 0) {
            throw new Error(
              `Mohon maaf, komoditas "${product.nama}" baru saja habis terjual karena telah dibeli oleh pembeli lain terlebih dahulu.`
            );
          } else {
            throw new Error(
              `Mohon maaf, sisa stok komoditas "${product.nama}" saat ini hanya tersisa ${currentStock} ${product.satuan} (telah berkurang karena transaksi pembeli lain). Silakan sesuaikan jumlah pesanan Anda.`
            );
          }
        }

        // 2. Atomic Conditional Decrement (Perlindungan ganda di level SQL)
        const updateStockResult = await tx.product.updateMany({
          where: {
            id: product.id,
            stok: { gte: requestedQty },
            isTersedia: true,
          },
          data: {
            stok: {
              decrement: requestedQty,
            },
          },
        });

        if (updateStockResult.count === 0) {
          throw new Error(
            `Mohon maaf, komoditas "${product.nama}" baru saja habis terjual karena telah dibeli oleh pembeli lain terlebih dahulu.`
          );
        }

        const unitPrice = Number(product.hargaPerSatuan);
        const subtotal = unitPrice * requestedQty;
        totalAmount += subtotal;

        orderItemsData.push({
          productId: product.id,
          namaProduk: product.nama,
          hargaPerSatuan: unitPrice,
          satuan: product.satuan,
          quantity: requestedQty,
          subtotal,
          petaniId: product.petaniId,
          payoutStatus: 'MENUNGGU_PENCAIRAN' as const,
        });
      }

      // Generate nomor invoice resmi koperasi yang unik, contoh: KOP-202609-8472
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
      const orderNumber = `KOP-${dateStr}-${randomCode}`;

      // Buat Order beserta OrderItems (Tahap 1: Pesanan Masuk - Bisa Dibatalkan Pembeli)
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          pembeliId: currentUser.id,
          status: 'MENUNGGU_PEMBAYARAN',
          paymentMethod: paymentMethod === 'TRANSFER_KOPERASI' ? 'TRANSFER_KOPERASI' : 'CASH_KOPERASI',
          isPaid: false,
          totalAmount,
          catatan: catatan?.trim() || null,
          alamatKirim: alamatKirim?.trim() || currentUser.address || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: true,
              petani: {
                select: { id: true, name: true, phone: true },
              },
            },
          },
          pembeli: {
            select: { id: true, name: true, email: true, phone: true, address: true },
          },
        },
      });

      return createdOrder;
    });

    // Invalidate Redis caches secara instan agar stok terbaru langsung terpantau oleh pembeli lain
    await Promise.all([
      delCachePattern('products:*'),
      delCachePattern('product:detail:*'),
      delCachePattern('categories:*'),
      delCachePattern('petani:*'),
      delCachePattern('admin:orders:*'),
      delCache(`user:orders:${currentUser.id}`),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Pesanan berhasil dibuat di sistem koperasi.',
      order: {
        ...newOrder,
        totalAmount: Number(newOrder.totalAmount),
        items: newOrder.items.map((i) => ({
          ...i,
          hargaPerSatuan: Number(i.hargaPerSatuan),
          subtotal: Number(i.subtotal),
        })),
      },
    });
  } catch (error: any) {
    console.error('Error saat membuat pesanan:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memproses pesanan Anda.' },
      { status: 400 }
    );
  }
}

// 2. GET: Ambil daftar riwayat pesanan milik pembeli yang sedang login
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const cacheKey = `user:orders:${currentUser.id}`;
    const cachedOrders = await getCache<any>(cacheKey);
    if (cachedOrders) {
      return NextResponse.json(cachedOrders);
    }

    // 1. Periksa dan batalkan pesanan yang belum dibayar lewat dari 24 jam sejak siap diambil di kasir (SIAP_DIAMBIL)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredOrders = await prisma.order.findMany({
      where: {
        pembeliId: currentUser.id,
        status: 'SIAP_DIAMBIL',
        updatedAt: { lte: twentyFourHoursAgo },
      },
      include: { items: true },
    });

    if (expiredOrders.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const exp of expiredOrders) {
          for (const item of exp.items) {
            if (item.productId && item.quantity > 0) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stok: { increment: item.quantity } },
              });
            }
          }
          await tx.order.update({
            where: { id: exp.id },
            data: {
              status: 'DIBATALKAN',
              isPaid: false,
              paidAt: null,
              catatan: exp.catatan
                ? `${exp.catatan} (Otomatis dibatalkan sistem: Melewati batas pembayaran 24 jam sejak siap diambil)`
                : '(Otomatis dibatalkan sistem: Melewati batas pembayaran 24 jam sejak siap diambil)',
            },
          });
        }
      });
      await delCachePattern('products:*');
    }

    const orders = await prisma.order.findMany({
      where: { pembeliId: currentUser.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, nama: true, imageUrl: true, satuan: true },
            },
            petani: {
              select: { id: true, name: true },
            },
          },
        },
        pembeli: {
          select: { id: true, name: true, phone: true, address: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const responseData = {
      success: true,
      orders: orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        items: o.items.map((i) => ({
          ...i,
          hargaPerSatuan: Number(i.hargaPerSatuan),
          subtotal: Number(i.subtotal),
        })),
      })),
    };

    // Cache for 60 seconds
    await setCache(cacheKey, responseData, 60);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error saat mengambil riwayat pesanan:', error);
    return NextResponse.json({ error: 'Gagal mengambil riwayat pesanan' }, { status: 500 });
  }
}
