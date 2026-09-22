import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const objectKey = key.join('/');

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

    return new NextResponse(Buffer.from(byteArray), {
      headers: {
        'Content-Type': response.ContentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error saat mengambil gambar dari Cloudflare R2:', error);
    return new NextResponse('Gambar tidak ditemukan di R2', { status: 404 });
  }
}
