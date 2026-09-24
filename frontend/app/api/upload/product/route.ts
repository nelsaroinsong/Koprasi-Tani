import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    // Ekstensi file
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);

    // Path folder di R2: products/prod-{timestamp}-{randomHex}.{ext}
    const key = `products/prod-${timestamp}-${randomHex}.${fileExt}`;

    // Konversi file ke buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Cloudflare R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'image/jpeg',
    });

    await r2Client.send(uploadCommand);

    // URL gambar melalui image proxy handler
    const imageUrl = `/api/images/${key}`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      key: key,
    });
  } catch (error: any) {
    console.error('Error saat upload foto produk ke Cloudflare R2:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mengunggah foto ke R2' },
      { status: 500 }
    );
  }
}
