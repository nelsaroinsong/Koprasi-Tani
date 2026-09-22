import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userEmail = (formData.get('email') as string) || session?.user?.email;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    // Ekstensi file
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const cleanEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'user';
    
    // Path folder spesifik di R2: profiles/{user}-{timestamp}.{ext}
    const key = `profiles/${cleanEmail}-${timestamp}.${fileExt}`;

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

    // Simpan ke database jika email ditemukan
    if (userEmail) {
      try {
        await prisma.user.update({
          where: { email: userEmail },
          data: { avatarUrl: imageUrl },
        });
      } catch (dbErr) {
        console.warn('Gagal update avatarUrl di database:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: imageUrl,
      key: key,
      bucket: R2_BUCKET,
    });
  } catch (error: any) {
    console.error('Error saat upload foto profil ke Cloudflare R2:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mengunggah foto ke R2' },
      { status: 500 }
    );
  }
}
