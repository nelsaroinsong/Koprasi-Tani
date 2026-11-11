import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCachePattern } from '@/lib/redis';
import { readEquipmentsFromFile, type EquipmentItem } from '@/lib/equipments';
import {
  readEquipmentRentals,
  writeEquipmentRentals,
  type EquipmentRentalOrder,
  type EquipmentRentalOrderItem,
} from '@/lib/equipment-rentals';
import { validateMinahasaUtaraAddress } from '@/lib/address-validation';

export const dynamic = 'force-dynamic';

// GET: Ambil riwayat pengajuan sewa alat milik pengguna saat ini (Cached in Redis)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    const email = session.user.email.toLowerCase().trim();
    const cacheKey = `user:rentals:${email}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const allRentals = readEquipmentRentals();
    // Filter pengajuan yang diajukan oleh email pengguna ini
    const userRentals = allRentals
      .filter((r) => r.userEmail === session.user?.email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const responsePayload = {
      success: true,
      rentals: userRentals,
    };

    await setCache(cacheKey, responsePayload, 60);

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error fetching user rentals:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat daftar pengajuan sewa' },
      { status: 500 }
    );
  }
}

// POST: Buat Pengajuan Sewa Alat Baru (Status: MENUNGGU_PERSETUJUAN_ADMIN)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk mengajukan sewa alat' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, phone: true, role: true, email: true },
    });

    const body = await request.json();
    const {
      startDate,
      endDate,
      lokasiLahan,
      farmLocationGps,
      catatan,
      // Multi-items payload
      items,
      // Single-item fallback payload
      equipmentId,
      durasi = 1,
      jumlahUnit = 1,
      includeOperator = false,
    } = body;

    if (!startDate) {
      return NextResponse.json(
        { error: 'Tentukan tanggal mulai pemakaian sewa alat' },
        { status: 400 }
      );
    }

    const addressValidation = validateMinahasaUtaraAddress(lokasiLahan, true);
    if (!addressValidation.isValid) {
      return NextResponse.json(
        { error: addressValidation.error },
        { status: 400 }
      );
    }

    // Ambil semua data master alat
    const allEquipments = readEquipmentsFromFile();

    const processedItems: EquipmentRentalOrderItem[] = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const eq = allEquipments.find((e) => e.id === (it.equipmentId || it.id));
        if (!eq) continue;
        const dur = Math.max(1, Number(it.durasi) || 1);
        const qty = Math.max(1, Number(it.jumlahUnit) || 1);
        const withOp = Boolean(it.includeOperator);
        const dasar = eq.hargaSewa * dur * qty;
        const op = withOp && eq.biayaOperator ? eq.biayaOperator * dur * qty : 0;
        processedItems.push({
          equipmentId: eq.id,
          nama: eq.nama,
          kategori: eq.kategori,
          hargaSewa: eq.hargaSewa,
          satuanSewa: eq.satuanSewa,
          jumlahUnit: qty,
          durasi: dur,
          includeOperator: withOp,
          biayaOperator: eq.biayaOperator,
          subtotal: dasar + op,
          imageUrl: eq.imageUrl,
        });
      }
    } else if (equipmentId) {
      const eq = allEquipments.find((e) => e.id === equipmentId);
      if (eq) {
        const dur = Math.max(1, Number(durasi) || 1);
        const qty = Math.max(1, Number(jumlahUnit) || 1);
        const withOp = Boolean(includeOperator);
        const dasar = eq.hargaSewa * dur * qty;
        const op = withOp && eq.biayaOperator ? eq.biayaOperator * dur * qty : 0;
        processedItems.push({
          equipmentId: eq.id,
          nama: eq.nama,
          kategori: eq.kategori,
          hargaSewa: eq.hargaSewa,
          satuanSewa: eq.satuanSewa,
          jumlahUnit: qty,
          durasi: dur,
          includeOperator: withOp,
          biayaOperator: eq.biayaOperator,
          subtotal: dasar + op,
          imageUrl: eq.imageUrl,
        });
      }
    }

    if (processedItems.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal satu unit alat pertanian yang tersedia' },
        { status: 400 }
      );
    }

    const totalEstimasi = processedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    const rentalCode = `SEWA-${Date.now().toString(36).toUpperCase()}`;

    // Kontak WhatsApp PJ Koperasi (ambil kontak pertama yang ada atau default)
    const pjContact =
      allEquipments.find((it) => it.kontakPj)?.kontakPj || '081944078924';
    const cleanPhone = pjContact.replace(/\D/g, '').replace(/^0/, '62');

    // Buat Objek Pengajuan Sewa Resmi (Status: MENUNGGU_PERSETUJUAN_ADMIN)
    const newRentalOrder: EquipmentRentalOrder = {
      id: `rent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rentalCode,
      userId: dbUser?.id || session.user.id || session.user.email,
      userName: dbUser?.name || session.user.name || 'Anggota Koperasi',
      userEmail: session.user.email,
      userPhone: dbUser?.phone || (session.user as any).phone || '',
      userRole: dbUser?.role || (session.user as any).role || 'PEMBELI',
      status: 'MENUNGGU_PERSETUJUAN_ADMIN',
      startDate,
      endDate: endDate || undefined,
      lokasiLahan: lokasiLahan || '',
      farmLocationGps:
        farmLocationGps &&
        typeof farmLocationGps.lat === 'number' &&
        typeof farmLocationGps.lng === 'number'
          ? { lat: farmLocationGps.lat, lng: farmLocationGps.lng }
          : null,
      catatan: catatan || '',
      totalEstimasi,
      paymentMethod: 'CASH_KOPERASI',
      isPaid: false,
      items: processedItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: null,
    };

    // Simpan ke database / file
    const existingRentals = readEquipmentRentals();
    existingRentals.unshift(newRentalOrder);
    writeEquipmentRentals(existingRentals);

    // Hapus cache katalog sewa alat agar ketersediaan stok langsung terbarui
    try {
      const { delCache } = await import('@/lib/redis');
      await delCache('equipments:list:public');
    } catch {}

    // Rincian alat dalam pesan WhatsApp
    const itemLines = processedItems.map((it, idx) => {
      const opInfo = it.includeOperator
        ? `+ Operator Koperasi (Rp ${Number(it.biayaOperator || 0).toLocaleString('id-ID')}/${it.satuanSewa})`
        : 'Operator Mandiri';
      return `${idx + 1}. *${it.nama}*
   • Jumlah: ${it.jumlahUnit} unit
   • Durasi: ${it.durasi} ${it.satuanSewa}
   • Tarif: Rp ${it.hargaSewa.toLocaleString('id-ID')}/${it.satuanSewa}
   • Layanan Operator: ${opInfo}
   • Subtotal: Rp ${it.subtotal.toLocaleString('id-ID')}`;
    }).join('\n\n');

    const waMessage = `Halo Pengurus/PJ Sewa Alat Koperasi Sinar Pagi Sejahtera,
Saya telah membuat *Pengajuan Sewa Alat Pertanian* melalui website koperasi:

*No. Pengajuan:* #${rentalCode}
*Status:* ⏳ Menunggu Persetujuan Admin Koperasi
*Nama Pemohon:* ${newRentalOrder.userName}
*Email:* ${newRentalOrder.userEmail}
*No. HP:* ${newRentalOrder.userPhone || '-'}
*Mulai Tanggal:* ${startDate}
*Lokasi Lahan Kebun:* ${lokasiLahan || '-'}
*Catatan Tambahan:* ${catatan || '-'}

📋 *Daftar Alat yang Diajukan (${processedItems.length} jenis alat):*
${itemLines}

💰 *TOTAL ESTIMASI TAGIHAN:* Rp ${totalEstimasi.toLocaleString('id-ID')}
*Metode Pembayaran:* Tunai di Kasir Kantor Koperasi (Kolongan)
*Catatan Kasir:* Pengajuan ini bersifat reservasi sementara. Saya siap datang ke kasir koperasi untuk pelunasan tunai setelah disetujui agar unit resmi terkunci. Terima kasih.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    // Invalidate user rentals and equipment availability cache
    await Promise.all([
      delCachePattern('user:rentals:*'),
      delCachePattern('equipments:*'),
    ]).catch(() => {});

    return NextResponse.json({
      success: true,
      rentalCode,
      rentalOrder: newRentalOrder,
      totalEstimasi,
      itemsCount: processedItems.length,
      waUrl,
      message: 'Pengajuan sewa alat berhasil dikirim dan menunggu persetujuan admin koperasi.',
    });
  } catch (error: any) {
    console.error('Error saat pengajuan sewa alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses pengajuan sewa alat' },
      { status: 500 }
    );
  }
}

// 3. PATCH: Batalkan Pengajuan Sewa Alat oleh Pengguna
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { rentalId, action, alasanBatal } = body;

    if (action !== 'CANCEL') {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    const allRentals = readEquipmentRentals();
    const targetIdx = allRentals.findIndex(
      (r) =>
        (r.id === rentalId || r.rentalCode === rentalId || (r as any).rentalNumber === rentalId) &&
        r.userEmail === session.user?.email
    );

    if (targetIdx === -1) {
      return NextResponse.json(
        { error: 'Pengajuan sewa tidak ditemukan' },
        { status: 404 }
      );
    }

    const rental = allRentals[targetIdx];
    if (rental.status !== 'MENUNGGU_PERSETUJUAN_ADMIN') {
      return NextResponse.json(
        { error: 'Pengajuan sewa tidak dapat dibatalkan karena sudah diproses atau disetujui.' },
        { status: 400 }
      );
    }

    const reason = alasanBatal ? ` (Dibatalkan pemohon: ${alasanBatal})` : ' (Dibatalkan oleh pemohon)';
    allRentals[targetIdx].status = 'DIBATALKAN';
    allRentals[targetIdx].catatan = allRentals[targetIdx].catatan
      ? `${allRentals[targetIdx].catatan}${reason}`
      : reason.trim();

    writeEquipmentRentals(allRentals);

    return NextResponse.json({
      success: true,
      message: 'Pengajuan sewa alat berhasil dibatalkan.',
      rental: allRentals[targetIdx],
    });
  } catch (err: any) {
    console.error('Error canceling rental:', err);
    return NextResponse.json(
      { error: err?.message || 'Gagal membatalkan pengajuan sewa' },
      { status: 500 }
    );
  }
}

