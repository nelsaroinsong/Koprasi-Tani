import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/mailer';
import { saveOtp } from '@/lib/otp-store';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Alamat email wajib diisi.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Format alamat email tidak valid.' }, { status: 400 });
    }

    // Pastikan email belum terdaftar di database
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email ini sudah terdaftar di sistem koperasi.' },
        { status: 409 }
      );
    }

    // Buat kode OTP 6-digit acak
    const otpCode = crypto.randomInt(100000, 999999).toString();

    // Simpan OTP dengan masa berlaku 5 menit (300 detik)
    await saveOtp(cleanEmail, otpCode, 300);

    // Kirim email OTP
    const mailResult = await sendOtpEmail(cleanEmail, otpCode);

    return NextResponse.json({
      success: true,
      message: mailResult.isDev
        ? `[Dev Mode] Kode OTP dibuat: ${otpCode}`
        : `Kode OTP verifikasi telah dikirim ke ${cleanEmail}. Periksa kotak masuk/spam.`,
      isDev: mailResult.isDev,
      devOtp: mailResult.isDev ? otpCode : undefined,
    });
  } catch (error: any) {
    console.error('Error send-otp:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengirim kode verifikasi ke email.' },
      { status: 500 }
    );
  }
}
