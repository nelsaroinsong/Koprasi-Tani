import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { readEquipmentsFromFile } from '@/lib/equipments';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk menyewa alat' }, { status: 401 });
    }

    const body = await request.json();
    const {
      equipmentId,
      startDate,
      endDate,
      durasi = 1,
      includeOperator = false,
      lokasiLahan,
      catatan,
    } = body;

    if (!equipmentId || !startDate) {
      return NextResponse.json(
        { error: 'Pilih alat dan tanggal sewa terlebih dahulu' },
        { status: 400 }
      );
    }

    // Ambil data alat
    const equipments = readEquipmentsFromFile();
    const equipment = equipments.find((eq) => eq.id === equipmentId);

    if (!equipment) {
      return NextResponse.json({ error: 'Alat pertanian tidak ditemukan' }, { status: 404 });
    }

    if (!equipment.isTersedia) {
      return NextResponse.json(
        { error: 'Unit alat ini saat ini sedang tidak tersedia atau dalam jadwal perawatan' },
        { status: 400 }
      );
    }

    const durasiNumber = Math.max(1, Number(durasi) || 1);
    const hargaDasar = equipment.hargaSewa * durasiNumber;
    const biayaOperatorTotal = includeOperator && equipment.biayaOperator ? equipment.biayaOperator * durasiNumber : 0;
    const totalEstimasi = hargaDasar + biayaOperatorTotal;

    const rentalCode = `SEWA-${Date.now().toString(36).toUpperCase()}`;

    // Format nomor WhatsApp Admin / PJ Alsintan
    const rawPhone = equipment.kontakPj || '081944078924';
    const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');

    const waMessage = `Halo Pengurus/PJ Alsintan Koperasi Sinar Pagi Sejahtera,
Saya ingin mengajukan peminjaman/sewa alat pertanian:

*Kode Pengajuan:* #${rentalCode}
*Nama Pemohon:* ${session.user.name || 'Anggota Koperasi'}
*Email/Kontak:* ${session.user.email}
*Alat:* ${equipment.nama} (${equipment.kategori})
*Tarif Sewa:* Rp ${equipment.hargaSewa.toLocaleString('id-ID')} / ${equipment.satuanSewa}
*Durasi Sewa:* ${durasiNumber} ${equipment.satuanSewa}
*Tanggal Pakai:* ${startDate} ${endDate ? `s/d ${endDate}` : ''}
*Layanan Operator:* ${includeOperator ? 'Ya (Termasuk Operator Koperasi)' : 'Tidak (Operasi Mandiri)'}
*Lokasi Lahan Kebun:* ${lokasiLahan || '-'}
*Catatan Tambahan:* ${catatan || '-'}

*Estimasi Total:* Rp ${totalEstimasi.toLocaleString('id-ID')}

Mohon konfirmasi ketersediaan unit dan jadwal operasionalnya. Terima kasih.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    return NextResponse.json({
      success: true,
      rentalCode,
      totalEstimasi,
      equipment,
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
