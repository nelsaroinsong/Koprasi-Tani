import { NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/src/storage/storage.module';

export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
    });

    const response = await r2Client.send(command);
    const files = response.Contents || [];

    // Filter images/logos
    const logos = files
      .filter((item) => {
        const key = item.Key?.toLowerCase() || '';
        return (
          key.endsWith('.png') ||
          key.endsWith('.jpg') ||
          key.endsWith('.jpeg') ||
          key.endsWith('.svg') ||
          key.endsWith('.webp')
        );
      })
      .map((item) => {
        const key = item.Key || '';
        const name = key.split('/').pop()?.replace(/\.[^/.]+$/, '') || key;
        return {
          key,
          name: name.replace(/[-_]/g, ' ').toUpperCase(),
          url: `/api/storage/${key}`,
        };
      });

    return NextResponse.json({
      success: true,
      bucket: R2_BUCKET,
      total: logos.length,
      logos,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching logos from R2';
    return NextResponse.json(
      {
        success: false,
        error: message,
        logos: [],
      },
      { status: 200 } // Return 200 with fallback so UI doesn't crash if R2 credentials are being configured
    );
  }
}
