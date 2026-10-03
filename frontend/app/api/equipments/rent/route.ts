import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { readEquipmentsFromFile, type EquipmentItem } from '@/lib/equipments';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk mengajukan sewa alat' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      lokasiLahan,
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

    // Ambil semua data alat
    const allEquipments = readEquipmentsFromFile();

    // Normalisasi daftar item yang disewa
    interface ProcessedItem {
      equipment: EquipmentItem;
      durasi: number;
      jumlahUnit: number;
      includeOperator: boolean;
      subtotal: number;
    }

    const processedItems: ProcessedItem[] = [];

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
          equipment: eq,
          durasi: dur,
          jumlahUnit: qty,
          includeOperator: withOp,
          subtotal: dasar + op,
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
          equipment: eq,
          durasi: dur,
          jumlahUnit: qty,
          includeOperator: withOp,
          subtotal: dasar + op,
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

    // Kontak WhatsApp PJ Koperasi (ambil kontak pertama yang ada atau kontak default)
    const pjContact =
      processedItems.find((it) => it.equipment.kontakPj)?.equipment.kontakPj ||
      '081944078924';
    const cleanPhone = pjContact.replace(/\D/g, '').replace(/^0/, '62');

    // Rincian alat dalam pesan WhatsApp
    const itemLines = processedItems.map((it, idx) => {
      const eq = it.equipment;
      const opInfo = it.includeOperator
        ? `+ Operator Koperasi (Rp ${Number(eq.biayaOperator || 0).toLocaleString('id-ID')}/${eq.satuanSewa})`
        : 'Operator Mandiri';
      return `${idx + 1}. *${eq.nama}*
   • Jumlah: ${it.jumlahUnit} unit
   • Durasi: ${it.durasi} ${eq.satuanSewa}
   • Tarif: Rp ${eq.hargaSewa.toLocaleString('id-ID')}/${eq.satuanSewa}
   • Layanan Operator: ${opInfo}
   • Subtotal: Rp ${it.subtotal.toLocaleString('id-ID')}`;
    }).join('\n\n');

    const waMessage = `Halo Pengurus/PJ Sewa Alat Koperasi Sinar Pagi Sejahtera,
Saya ingin mengajukan permohonan sewa alat pertanian:

*Kode Pengajuan:* #${rentalCode}
*Nama Pemohon:* ${session.user.name || 'Anggota Koperasi'}
*Email/Kontak:* ${session.user.email}
*Mulai Tanggal:* ${startDate} ${endDate ? `s/d ${endDate}` : ''}
*Lokasi Lahan Kebun:* ${lokasiLahan || '-'}
*Catatan Tambahan:* ${catatan || '-'}

📋 *Daftar Alat yang Disewa (${processedItems.length} jenis alat):*
${itemLines}

💰 *TOTAL ESTIMASI SEWA:* Rp ${totalEstimasi.toLocaleString('id-ID')}

Mohon konfirmasi ketersediaan unit dan jadwal operasionalnya di kantor koperasi. Terima kasih.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    return NextResponse.json({
      success: true,
      rentalCode,
      totalEstimasi,
      itemsCount: processedItems.length,
      waUrl,
      message: 'Pengajuan sewa alat berhasil disiapkan.',
    });
  } catch (error: any) {
    console.error('Error saat pengajuan sewa alat:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memproses pengajuan sewa alat' },
      { status: 500 }
    );
  }
}
