import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const DEFAULT_ADDRESS =
  'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara';

// 1. GET: Ambil info resmi Koperasi (Alamat Gudang, No. WhatsApp) untuk checkout & katalog
export async function GET() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
      },
    });

    const alamatGudang = admin?.address?.trim() || DEFAULT_ADDRESS;
    const phone = admin?.phone?.trim() || '081944078924';

    return NextResponse.json({
      success: true,
      namaKoperasi: 'Koperasi Sinar Pagi Sejahtera',
      alamat: alamatGudang,
      telepon: phone,
    });
  } catch (error) {
    console.error('Error fetching koperasi info:', error);
    return NextResponse.json({
      success: true,
      namaKoperasi: 'Koperasi Sinar Pagi Sejahtera',
      alamat: DEFAULT_ADDRESS,
      telepon: '081944078924',
    });
  }
}

// 2. PATCH: Admin memperbarui Alamat Gudang / Kantor Pengambilan
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya Administrator yang berhak mengubah alamat koperasi.' }, { status: 403 });
    }

    const body = await request.json();
    const { alamat, telepon } = body;

    if (!alamat || typeof alamat !== 'string' || !alamat.trim()) {
      return NextResponse.json({ error: 'Alamat kantor / gudang tidak boleh kosong.' }, { status: 400 });
    }

    const currentAdmin = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentAdmin) {
      return NextResponse.json({ error: 'Data admin tidak ditemukan.' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      address: alamat.trim(),
    };

    if (telepon && typeof telepon === 'string' && telepon.trim()) {
      updateData.phone = telepon.trim();
    }

    const updated = await prisma.user.update({
      where: { id: currentAdmin.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Alamat kantor & gudang koperasi berhasil diperbarui.',
      alamat: updated.address,
      telepon: updated.phone,
    });
  } catch (error: any) {
    console.error('Error updating koperasi info:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui alamat koperasi.' }, { status: 500 });
  }
}
