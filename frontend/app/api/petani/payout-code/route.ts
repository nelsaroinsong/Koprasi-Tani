import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generatePayoutCode, PAYOUT_CODE_STEP_SECONDS } from '@/lib/payout-code';

export const dynamic = 'force-dynamic';

/**
 * GET /api/petani/payout-code
 * Mengembalikan kode verifikasi 6 digit yang berganti setiap 20 detik
 * untuk ditunjukkan petani kepada kasir/admin koperasi saat mengambil uang tunai.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, isVerified: true, name: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    if (currentUser.role !== 'PETANI') {
      return NextResponse.json({ error: 'Fitur ini khusus untuk akun mitra petani.' }, { status: 403 });
    }

    const readyItems = await prisma.orderItem.findMany({
      where: {
        petaniId: currentUser.id,
        payoutStatus: 'MENUNGGU_PENCAIRAN',
        order: { status: 'SELESAI', isPaid: true },
      },
      select: { id: true, subtotal: true },
    });

    const cashSiapDiambil = readyItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

    if (readyItems.length === 0 || cashSiapDiambil <= 0) {
      return NextResponse.json(
        {
          success: true,
          hasReadyCash: false,
          cashSiapDiambil: 0,
          itemCount: 0,
          stepSeconds: PAYOUT_CODE_STEP_SECONDS,
        },
        { headers: { 'Cache-Control': 'no-store, private' } }
      );
    }

    const generated = generatePayoutCode(currentUser.id);

    return NextResponse.json(
      {
        success: true,
        hasReadyCash: true,
        cashSiapDiambil,
        itemCount: readyItems.length,
        code: generated.code,
        stepSeconds: generated.stepSeconds,
        remainingMs: generated.remainingMs,
        validUntilMs: generated.validUntilMs,
        serverTimeMs: generated.serverTimeMs,
      },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
  } catch (error) {
    console.error('Error membuat kode verifikasi pencairan petani:', error);
    return NextResponse.json(
      { error: 'Gagal membuat kode verifikasi pencairan.' },
      { status: 500 }
    );
  }
}
