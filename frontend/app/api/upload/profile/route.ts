import { NextResponse } from 'next/server';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { validateImageUpload } from '@/lib/file-security';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userEmail = (formData.get('email') as string) || session?.user?.email;
    const oldUrl = formData.get('oldUrl') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    // Konversi file ke buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validasi keamanan berkas mendalam (ukuran, ekstensi, MIME, dan Magic Bytes)
    const validation = validateImageUpload(file, buffer);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const timestamp = Date.now();
    const cleanEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'user';
    const finalExt = validation.sanitizedExt || 'jpg';

    // Path folder spesifik di R2: profiles/{user}-{timestamp}.{ext}
    const key = `profiles/${cleanEmail}-${timestamp}.${finalExt}`;

    // Upload ke Cloudflare R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: validation.contentType || 'image/jpeg',
    });

    await r2Client.send(uploadCommand);

    // URL gambar melalui image proxy handler
    const imageUrl = `/api/images/${key}`;

    // Hapus foto profil lama dari Cloudflare R2 jika ada untuk menghemat kuota R2
    if (oldUrl) {
      const match = oldUrl.match(/profiles\/[^?#]+/);
      if (match && match[0].startsWith('profiles/')) {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET,
              Key: match[0],
            })
          );
        } catch (delErr) {
          console.warn('Gagal membersihkan foto profil lama di R2:', delErr);
        }
      }
    }

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

// Endpoint DELETE untuk menghapus foto profil dari Cloudflare R2 & Database
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const body = await request.json().catch(() => ({}));
    const rawUrl = body.url || body.imageUrl;
    const userEmail = body.email || session?.user?.email;

    if (!rawUrl && !userEmail) {
      return NextResponse.json(
        { error: 'Parameter url atau email tidak diberikan' },
        { status: 400 }
      );
    }

    let targetKey = '';

    // Ekstrak key dari URL (misal: /api/images/profiles/user_xxx-1234.png)
    if (rawUrl && typeof rawUrl === 'string') {
      const match = rawUrl.match(/profiles\/[^?#]+/);
      if (match) {
        targetKey = match[0];
      }
    }

    // Jika tidak didapat dari URL, cari avatarUrl aktif di database
    if (!targetKey && userEmail) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { avatarUrl: true },
        });
        if (dbUser?.avatarUrl) {
          const match = dbUser.avatarUrl.match(/profiles\/[^?#]+/);
          if (match) {
            targetKey = match[0];
          }
        }
      } catch (err) {
        console.warn('Error saat mencari avatar di database:', err);
      }
    }

    // Hapus dari bucket Cloudflare R2
    if (targetKey && targetKey.startsWith('profiles/')) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: targetKey,
        });
        await r2Client.send(deleteCommand);
      } catch (r2Err) {
        console.warn('Gagal menghapus file dari Cloudflare R2:', r2Err);
      }
    }

    // Reset avatarUrl di database jika email ditemukan
    if (userEmail) {
      try {
        await prisma.user.update({
          where: { email: userEmail },
          data: { avatarUrl: null },
        });
      } catch (dbErr) {
        console.warn('Gagal reset avatarUrl di database:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Foto profil berhasil dihapus dari Cloudflare R2',
      deletedKey: targetKey,
    });
  } catch (error: any) {
    console.error('Error saat menghapus foto profil dari Cloudflare R2:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menghapus foto dari R2' },
      { status: 500 }
    );
  }
}
