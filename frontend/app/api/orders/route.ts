import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

    // Jalankan transaksi database agar konsistensi stok dan pesanan terjamin 100%
    const newOrder = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId || item.id },
          include: { petani: true },
        });

        if (!product) {
          throw new Error(`Komoditas dengan ID ${item.productId || item.id} tidak ditemukan.`);
        }

        if (!product.isTersedia) {
          throw new Error(`Komoditas "${product.nama}" saat ini sedang dinonaktifkan dari katalog.`);
        }

        const requestedQty = parseInt(item.quantity, 10);
        if (isNaN(requestedQty) || requestedQty <= 0) {
          throw new Error(`Jumlah pesanan untuk "${product.nama}" tidak valid.`);
        }

        if (product.stok < requestedQty) {
          throw new Error(
            `Stok komoditas "${product.nama}" di gudang koperasi tidak mencukupi (Tersedia: ${product.stok} ${product.satuan}, diminta: ${requestedQty} ${product.satuan}).`
          );
        }

        // Potong stok fisik komoditas di gudang koperasi secara real-time
        await tx.product.update({
          where: { id: product.id },
          data: {
            stok: {
              decrement: requestedQty,
            },
          },
        });

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

      // Buat Order beserta OrderItems
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error saat mengambil riwayat pesanan:', error);
    return NextResponse.json({ error: 'Gagal mengambil riwayat pesanan' }, { status: 500 });
  }
}
