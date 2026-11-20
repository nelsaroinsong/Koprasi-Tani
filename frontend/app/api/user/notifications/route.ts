import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { expireOverduePickupOrders } from '@/lib/order-lifecycle';

export const dynamic = 'force-dynamic';

async function currentUserId() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const u = await prisma.user.findUnique({
    where: { email: session.user.email.trim().toLowerCase() },
    select: { id: true },
  });
  return u?.id || null;
}

// GET: 50 notifikasi terbaru + jumlah belum dibaca
export async function GET() {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });

    // Pastikan pembatalan otomatis (lewat batas ambil) ikut memunculkan notifikasi
    await expireOverduePickupOrders({ pembeliId: userId }).catch(() => 0);

    const [items, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, kind: true, title: true, message: true, href: true, isRead: true, createdAt: true },
      }),
      prisma.userNotification.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error('Error notifikasi pengguna:', error);
    return NextResponse.json({ error: 'Gagal memuat notifikasi' }, { status: 500 });
  }
}

// PATCH { ids: string[] } atau { all: true } -> tandai sudah dibaca
export async function PATCH(request: Request) {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 200) : [];
    if (!body.all && ids.length === 0) {
      return NextResponse.json({ error: 'Tidak ada notifikasi yang dipilih' }, { status: 400 });
    }

    const res = await prisma.userNotification.updateMany({
      where: { userId, isRead: false, ...(body.all ? {} : { id: { in: ids } }) },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, updated: res.count });
  } catch (error) {
    console.error('Error tandai notifikasi:', error);
    return NextResponse.json({ error: 'Gagal memperbarui notifikasi' }, { status: 500 });
  }
}
