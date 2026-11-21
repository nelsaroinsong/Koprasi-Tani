import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  generateRollingPickupCode,
  PICKUP_CODE_STEP_SECONDS,
} from '@/lib/order-lifecycle';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/pickup-code
 * Mengembalikan kode ambil dinamis 6 digit (berganti setiap 20 detik)
 * khusus untuk pembeli pemilik pesanan yang berstatus SIAP_DIAMBIL.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const { id } = await context.params;
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      select: { id: true, pembeliId: true, status: true, pickupCode: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    if (order.pembeliId !== currentUser.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    if (order.status !== 'SIAP_DIAMBIL' || !order.pickupCode) {
      return NextResponse.json(
        {
          success: true,
          active: false,
          status: order.status,
          stepSeconds: PICKUP_CODE_STEP_SECONDS,
        },
        { headers: { 'Cache-Control': 'no-store, private' } }
      );
    }

    const generated = generateRollingPickupCode(order.id, order.pickupCode);

    return NextResponse.json(
      {
        success: true,
        active: true,
        code: generated.code,
        stepSeconds: generated.stepSeconds,
        remainingMs: generated.remainingMs,
        validUntilMs: generated.validUntilMs,
        serverTimeMs: generated.serverTimeMs,
      },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
  } catch (error) {
    console.error('Error membuat kode ambil pesanan:', error);
    return NextResponse.json(
      { error: 'Gagal memuat kode ambil pesanan.' },
      { status: 500 }
    );
  }
}
