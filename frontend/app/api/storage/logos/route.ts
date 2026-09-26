import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { auth } from '@/auth';
import { delCachePattern } from '@/lib/redis';

const LOGOS_FILE = path.join(process.cwd(), 'data', 'partner-logos.json');

export interface PartnerLogo {
  id: string;
  name: string;
  url: string;
  key?: string;
}

const DEFAULT_LOGOS: PartnerLogo[] = [
  {
    id: 'logo-icare',
    key: 'logo/logo-icare.webp',
    name: 'ICARE',
    url: '/api/storage/logo/logo-icare.webp',
  },
  {
    id: 'logo-polimdo',
    key: 'logo/logo polimdo.png',
    name: 'POLIMDO',
    url: '/api/storage/logo/logo polimdo.png',
  },
];

function readLogosFromFile(): PartnerLogo[] {
  try {
    if (fs.existsSync(LOGOS_FILE)) {
      const content = fs.readFileSync(LOGOS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading partner logos file:', err);
  }
  return DEFAULT_LOGOS;
}

function writeLogosToFile(logos: PartnerLogo[]) {
  try {
    const dir = path.dirname(LOGOS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOGOS_FILE, JSON.stringify(logos, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing partner logos file:', err);
  }
}

// 1. GET: Ambil daftar logo mitra pendukung
export async function GET() {
  try {
    const logos = readLogosFromFile();
    return NextResponse.json({
      success: true,
      total: logos.length,
      logos,
    });
  } catch (error: any) {
    console.error('Error fetching logos:', error);
    return NextResponse.json({
      success: true,
      total: DEFAULT_LOGOS.length,
      logos: DEFAULT_LOGOS,
    });
  }
}

// 2. POST: Tambah logo baru oleh Admin (via FormData file atau JSON URL)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let name = '';
    let url = '';
    let key = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      name = (formData.get('name') as string)?.trim() || '';

      if (!file) {
        return NextResponse.json({ error: 'File gambar wajib diunggah.' }, { status: 400 });
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
      key = `logo/${timestamp}-${cleanFileName}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Simpan ke R2
      try {
        const uploadCmd = new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type || 'image/png',
        });
        await r2Client.send(uploadCmd);
        url = `/api/storage/${key}`;
      } catch (r2Err) {
        console.warn('R2 upload failed, saving to local public storage fallback:', r2Err);
        // Fallback: simpan di public/uploads/logos
        const publicDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        const localPath = path.join(publicDir, `${timestamp}.${fileExt}`);
        fs.writeFileSync(localPath, buffer);
        url = `/uploads/logos/${timestamp}.${fileExt}`;
      }

      if (!name) {
        name = file.name.split('.')[0].replace(/[-_]/g, ' ').toUpperCase();
      }
    } else {
      const body = await request.json();
      name = body.name?.trim() || '';
      url = body.url?.trim() || '';
      key = body.key || '';

      if (!name || !url) {
        return NextResponse.json({ error: 'Nama dan URL logo wajib diisi.' }, { status: 400 });
      }
    }

    const newLogo: PartnerLogo = {
      id: `logo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.toUpperCase(),
      url,
      key,
    };

    const currentLogos = readLogosFromFile();
    const updated = [...currentLogos, newLogo];
    writeLogosToFile(updated);

    await delCachePattern('logos:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Logo mitra berhasil ditambahkan.',
      logo: newLogo,
      logos: updated,
    });
  } catch (error: any) {
    console.error('Error adding partner logo:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan logo' }, { status: 500 });
  }
}

// 3. PATCH: Update urutan atau edit nama logo
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();

    // Jika yang dikirim adalah array penuh baru (reorder)
    if (Array.isArray(body.logos)) {
      writeLogosToFile(body.logos);
      return NextResponse.json({
        success: true,
        message: 'Urutan logo berhasil diperbarui.',
        logos: body.logos,
      });
    }

    // Jika update satuan ({ id, name, url })
    const { id, name, url } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID logo wajib disertakan.' }, { status: 400 });
    }

    const currentLogos = readLogosFromFile();
    const index = currentLogos.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Logo tidak ditemukan.' }, { status: 404 });
    }

    if (name) currentLogos[index].name = name.trim().toUpperCase();
    if (url) currentLogos[index].url = url.trim();

    writeLogosToFile(currentLogos);

    return NextResponse.json({
      success: true,
      message: 'Data logo berhasil diperbarui.',
      logos: currentLogos,
    });
  } catch (error: any) {
    console.error('Error updating partner logo:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui logo' }, { status: 500 });
  }
}

// 4. DELETE: Hapus logo mitra
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID logo wajib disertakan.' }, { status: 400 });
    }

    const currentLogos = readLogosFromFile();
    const logoToDelete = currentLogos.find((l) => l.id === id || l.key === id);

    if (!logoToDelete) {
      return NextResponse.json({ error: 'Logo tidak ditemukan.' }, { status: 404 });
    }

    // Hapus dari R2 jika ada key
    if (logoToDelete.key && logoToDelete.key.startsWith('logo/')) {
      try {
        const deleteCmd = new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: logoToDelete.key,
        });
        await r2Client.send(deleteCmd);
      } catch (delErr) {
        console.warn('R2 delete object error:', delErr);
      }
    }

    const updated = currentLogos.filter((l) => l.id !== id && l.key !== id);
    writeLogosToFile(updated);

    return NextResponse.json({
      success: true,
      message: `Logo ${logoToDelete.name} berhasil dihapus.`,
      logos: updated,
    });
  } catch (error: any) {
    console.error('Error deleting partner logo:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus logo' }, { status: 500 });
  }
}
