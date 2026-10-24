import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOtp, clearOtp, markEmailVerified } from '@/lib/otp-store';

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
    const { email, otp } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Alamat email wajib diisi.' }, { status: 400 });
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Kode OTP wajib diisi.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const storedOtp = await getOtp(cleanEmail);

    if (!storedOtp) {
      return NextResponse.json(
        { error: 'Kode OTP sudah kedaluwarsa atau belum diminta. Silakan minta kode baru.' },
        { status: 400 }
      );
    }

    if (storedOtp !== cleanOtp) {
      return NextResponse.json(
        { error: 'Kode OTP salah. Periksa kembali email Anda.' },
        { status: 400 }
      );
    }

    // OTP valid! Tandai email terverifikasi selama 15 menit & hapus OTP
    await clearOtp(cleanEmail);
    await markEmailVerified(cleanEmail, 900);

    return NextResponse.json({
      success: true,
      message: 'Email berhasil diverifikasi!',
      verified: true,
    });
  } catch (error: any) {
    console.error('Error verify-otp:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memverifikasi kode OTP.' },
      { status: 500 }
    );
  }
}
