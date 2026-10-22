import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { isSafeStorageKey } from '@/lib/file-security';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const objectKey = key.join('/');

    // Validasi anti path-traversal & prefix whitelist
    if (!isSafeStorageKey(objectKey)) {
      return new NextResponse('Kunci gambar tidak valid', { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return new NextResponse('Gambar tidak ditemukan', { status: 404 });
    }

    // Stream the image back
    const byteArray = await response.Body.transformToByteArray();

    // Pastikan Content-Type dibatasi hanya untuk gambar aman
    const rawType = (response.ContentType || '').toLowerCase();
    const safeContentType = ['image/jpeg', 'image/png', 'image/webp'].includes(rawType)
      ? rawType
      : 'image/jpeg';

    return new NextResponse(Buffer.from(byteArray), {
      headers: {
        'Content-Type': safeContentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Header keamanan ketat untuk mencegah serangan XSS & MIME-confusion
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
        'X-Frame-Options': 'DENY',
      },
    });
  } catch (error) {
    console.error('Error saat mengambil gambar dari Cloudflare R2:', error);
    return new NextResponse('Gambar tidak ditemukan di R2', { status: 404 });
  }
}
