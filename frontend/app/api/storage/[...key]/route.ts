import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/src/storage/storage.module';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileKey = resolvedParams.key.join('/');

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
    });

    const response = await r2Client.send(command);
    if (!response.Body) {
      return new NextResponse('File not found', { status: 404 });
    }

    const byteArray = await response.Body.transformToByteArray();
    return new NextResponse(byteArray as unknown as BodyInit, {
      headers: {
        'Content-Type': response.ContentType || 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching file from R2';
    return new NextResponse(message, { status: 500 });
  }
}
