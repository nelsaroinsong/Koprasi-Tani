import { NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/src/storage/storage.module';

export async function GET() {
  try {
    // Hanya ambil objek dari folder 'logo/' di bucket R2
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: 'logo/',
    });

    const response = await r2Client.send(command);
    const files = response.Contents || [];

    // Filter hanya file gambar yang berada di dalam folder logo/
    const logos = files
      .filter((item) => {
        const key = item.Key || '';
        const lower = key.toLowerCase();
        const isUnderLogo = lower.startsWith('logo/');
        const isNotFolderItself = lower !== 'logo/' && !lower.endsWith('/');
        const isImage = (
          lower.endsWith('.png') ||
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.svg') ||
          lower.endsWith('.webp')
        );
        return isUnderLogo && isNotFolderItself && isImage;
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

    // Urutkan agar logo iCare selalu berada di sebelah kiri (pertama)
    logos.sort((a, b) => {
      const aIsIcare = a.key.toLowerCase().includes('icare');
      const bIsIcare = b.key.toLowerCase().includes('icare');
      if (aIsIcare && !bIsIcare) return -1;
      if (!aIsIcare && bIsIcare) return 1;
      return a.name.localeCompare(b.name);
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
