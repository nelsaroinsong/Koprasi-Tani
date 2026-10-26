import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getCache, setCache, delCache } from '@/lib/redis';
import fs from 'fs';
import path from 'path';

const DEFAULT_ADDRESS =
  'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara';
const DEFAULT_LAT = 1.4334;
const DEFAULT_LNG = 124.9312;
const KOPERASI_CACHE_KEY = 'koperasi:info';
const COORDS_FILE_PATH = path.join(process.cwd(), 'data', 'warehouse-location.json');

function readSavedCoords(): { latitude: number; longitude: number } {
  try {
    if (fs.existsSync(COORDS_FILE_PATH)) {
      const raw = fs.readFileSync(COORDS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return { latitude: parsed.latitude, longitude: parsed.longitude };
      }
    }
  } catch {}
  return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
}

function writeSavedCoords(latitude: number, longitude: number) {
  try {
    const dir = path.dirname(COORDS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      COORDS_FILE_PATH,
      JSON.stringify({ latitude, longitude, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.warn('Failed to write warehouse coords file:', err);
  }
}

// 1. GET: Ambil info resmi Koperasi (Alamat Gudang, No. WhatsApp, Koordinat GPS) untuk checkout & katalog
export async function GET() {
  try {
    const cached = await getCache<any>(KOPERASI_CACHE_KEY);
    if (cached && typeof cached.latitude === 'number') {
      return NextResponse.json(cached);
    }

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
    const coords = readSavedCoords();

    const responseData = {
      success: true,
      namaKoperasi: 'Koperasi Sinar Pagi Sejahtera',
      alamat: alamatGudang,
      telepon: phone,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    // Cache for 1 hour (3600 seconds)
    await setCache(KOPERASI_CACHE_KEY, responseData, 3600);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching koperasi info:', error);
    const coords = readSavedCoords();
    return NextResponse.json({
      success: true,
      namaKoperasi: 'Koperasi Sinar Pagi Sejahtera',
      alamat: DEFAULT_ADDRESS,
      telepon: '081944078924',
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  }
}

// 2. PATCH: Admin memperbarui Alamat Gudang / Kantor Pengambilan & Titik Koordinat GPS
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya Administrator yang berhak mengubah alamat koperasi.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { alamat, telepon, latitude, longitude } = body;

    if (!alamat || typeof alamat !== 'string' || !alamat.trim()) {
      return NextResponse.json(
        { error: 'Alamat kantor / gudang tidak boleh kosong.' },
        { status: 400 }
      );
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

    if (typeof latitude === 'number' && !isNaN(latitude) && typeof longitude === 'number' && !isNaN(longitude)) {
      writeSavedCoords(latitude, longitude);
    }

    const savedCoords = readSavedCoords();

    // Invalidate Redis cache
    await delCache(KOPERASI_CACHE_KEY);

    return NextResponse.json({
      success: true,
      message: 'Alamat kantor & titik lokasi gudang koperasi berhasil diperbarui.',
      alamat: updated.address,
      telepon: updated.phone,
      latitude: savedCoords.latitude,
      longitude: savedCoords.longitude,
    });
  } catch (error: any) {
    console.error('Error updating koperasi info:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui alamat koperasi.' },
      { status: 500 }
    );
  }
}
