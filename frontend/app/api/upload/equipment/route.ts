import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function checkIsAdmin(session: any): Promise<boolean> {
  if (session?.user?.role === 'ADMIN') return true;
  if (!session?.user?.email) return false;
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file foto alat yang diunggah' }, { status: 400 });
    }

    // Validasi ukuran & tipe file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus berupa gambar (JPG, PNG, WebP)' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);

    // Simpan ke folder sewa-alat/ di Cloudflare R2
    const key = `sewa-alat/alsintan-${timestamp}-${randomHex}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'image/jpeg',
    });

    await r2Client.send(uploadCommand);

    // URL gambar melalui image proxy handler Next.js
    const imageUrl = `/api/images/${key}`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      key: key,
      message: 'Foto alat pertanian berhasil diunggah ke Cloudflare R2 folder sewa-alat/',
    });
  } catch (error: any) {
    console.error('Error saat upload foto alsintan ke Cloudflare R2:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mengunggah foto ke folder sewa-alat R2' },
      { status: 500 }
    );
  }
}
