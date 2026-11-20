import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getSetting, setSetting } from '@/lib/app-settings';
import { expireOverdueRentals } from '@/lib/equipment-rentals';
import { parseDateOnly, todayWita } from '@/lib/rental-schedule';

export const dynamic = 'force-dynamic';

// Kapan admin terakhir membuka lonceng / tiap menu (disimpan di app_settings)
const SEEN_KEY = 'admin_notifications_seen';
type SeenMap = Record<string, string>;
const SECTIONS = ['bell', 'petani', 'pembeli', 'pesananToko', 'pesananSewa', 'bagiHasil'] as const;
type Section = (typeof SECTIONS)[number];

// Menu "pekerjaan tertunda": badge = item tertunda yang BELUM pernah dilihat admin.
// Saat menu dibuka, daftar kunci item tertunda saat itu disimpan sebagai "sudah dilihat".
const SEEN_IDS_KEY = 'admin_notifications_seen_ids';
const ID_SECTIONS = ['pesananToko', 'pesananSewa', 'bagiHasil'] as const;
type IdSection = (typeof ID_SECTIONS)[number];
type SeenIdsMap = Partial<Record<IdSection, string[]>>;

/** Kunci unik tiap item tertunda per menu. Kunci "ambil hari ini" memuat tanggal agar muncul lagi di hari H berikutnya. */
async function collectPendingKeys(): Promise<Record<IdSection, string[]>> {
  const today = parseDateOnly(todayWita())!;
  const todayStr = todayWita();
  const [orders, menunggu, ambil, kembali, refund, payouts] = await Promise.all([
    prisma.order.findMany({ where: { status: 'MENUNGGU_PEMBAYARAN' }, select: { id: true } }),
    prisma.equipmentRental.findMany({ where: { status: 'MENUNGGU_PERSETUJUAN_ADMIN' }, select: { id: true } }),
    prisma.equipmentRental.findMany({
      where: { status: { in: ['DIKONFIRMASI', 'SIAP_DIAMBIL'] }, startDate: { lte: today } },
      select: { id: true },
    }),
    prisma.equipmentRental.findMany({ where: { status: 'SEDANG_DISEWA', endDate: { lt: today } }, select: { id: true } }),
    prisma.equipmentRental.findMany({
      where: { status: { in: ['DIBATALKAN', 'DITOLAK'] }, dpPaidAt: { not: null }, dpForfeited: false, dpRefundedAt: null },
      select: { id: true },
    }),
    prisma.orderItem.findMany({
      where: { payoutStatus: 'MENUNGGU_PENCAIRAN', order: { status: 'SELESAI', isPaid: true } },
      select: { id: true },
    }),
  ]);
  return {
    pesananToko: orders.map((o) => `o:${o.id}`),
    pesananSewa: [
      ...menunggu.map((r) => `m:${r.id}`),
      ...ambil.map((r) => `a:${r.id}:${todayStr}`),
      ...kembali.map((r) => `k:${r.id}`),
      ...refund.map((r) => `r:${r.id}`),
    ],
    bagiHasil: payouts.map((i) => `p:${i.id}`),
  };
}

/** Sidik jari daftar item: berubah setiap ada item tertunda baru / selesai -> tabel di halaman itu memuat ulang */
const signatureOf = (parts: string[]) =>
  createHash('sha1').update([...parts].sort().join('|')).digest('hex').slice(0, 12);

const countUnseen = (keys: string[], seen: string[] | undefined) => {
  if (!seen?.length) return keys.length;
  const seenSet = new Set(seen);
  return keys.filter((k) => !seenSet.has(k)).length;
};

async function isAdmin() {
  const session = await auth();
  if ((session?.user as any)?.role === 'ADMIN') return true;
  if (!session?.user?.email) return false;
  const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true } });
  return u?.role === 'ADMIN';
}

const seenDate = (seen: SeenMap, key: Section) => (seen[key] ? new Date(seen[key]) : new Date(0));

export interface AdminNotification {
  id: string;
  kind: 'order' | 'rental' | 'rental_update' | 'user';
  title: string;
  description: string;
  at: string;
  unread: boolean;
  target: { group: string; item: string };
}

const rp = (n: unknown) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// GET: jumlah badge per menu sidebar + daftar notifikasi lonceng
export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    await expireOverdueRentals();

    const seen = (await getSetting<SeenMap>(SEEN_KEY)) || {};
    const [seenIds, pendingKeys] = await Promise.all([
      getSetting<SeenIdsMap>(SEEN_IDS_KEY).then((v) => v || {}),
      collectPendingKeys(),
    ]);
    const today = parseDateOnly(todayWita())!;
    const recentSince = new Date(Date.now() - 14 * 86_400_000);

    const [
      pesananToko,
      sewaMenunggu,
      sewaAmbil,
      sewaKembali,
      sewaRefund,
      bagiHasil,
      petaniBaru,
      pembeliBaru,
      orders,
      rentals,
      rentalUpdates,
      users,
      latestPetani,
      latestPembeli,
    ] = await Promise.all([
      prisma.order.count({ where: { status: 'MENUNGGU_PEMBAYARAN' } }),
      prisma.equipmentRental.count({ where: { status: 'MENUNGGU_PERSETUJUAN_ADMIN' } }),
      prisma.equipmentRental.count({ where: { status: { in: ['DIKONFIRMASI', 'SIAP_DIAMBIL'] }, startDate: { lte: today } } }),
      prisma.equipmentRental.count({ where: { status: 'SEDANG_DISEWA', endDate: { lt: today } } }),
      prisma.equipmentRental.count({
        where: { status: { in: ['DIBATALKAN', 'DITOLAK'] }, dpPaidAt: { not: null }, dpForfeited: false, dpRefundedAt: null },
      }),
      prisma.orderItem.count({
        where: { payoutStatus: 'MENUNGGU_PENCAIRAN', order: { status: 'SELESAI', isPaid: true } },
      }),
      prisma.user.count({ where: { role: 'PETANI', createdAt: { gt: seenDate(seen, 'petani') } } }),
      prisma.user.count({ where: { role: 'PEMBELI', createdAt: { gt: seenDate(seen, 'pembeli') } } }),
      prisma.order.findMany({
        where: { createdAt: { gt: recentSince } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, orderNumber: true, totalAmount: true, createdAt: true, pembeli: { select: { name: true } } },
      }),
      prisma.equipmentRental.findMany({
        where: { createdAt: { gt: recentSince } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, rentalCode: true, userName: true, totalEstimasi: true, createdAt: true, startDate: true },
      }),
      prisma.equipmentRental.findMany({
        where: { status: { in: ['DIBATALKAN', 'KADALUARSA'] }, updatedAt: { gt: recentSince } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, rentalCode: true, userName: true, status: true, updatedAt: true },
      }),
      prisma.user.findMany({
        where: { role: { in: ['PETANI', 'PEMBELI'] }, createdAt: { gt: recentSince } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, role: true, createdAt: true },
      }),
      prisma.user.findFirst({ where: { role: 'PETANI' }, orderBy: { createdAt: 'desc' }, select: { id: true } }),
      prisma.user.findFirst({ where: { role: 'PEMBELI' }, orderBy: { createdAt: 'desc' }, select: { id: true } }),
    ]);

    const bellSeen = seenDate(seen, 'bell');
    const items: AdminNotification[] = [
      ...orders.map((o) => ({
        id: `order-${o.id}`,
        kind: 'order' as const,
        title: `Pesanan baru #${o.orderNumber}`,
        description: `${o.pembeli?.name || 'Pembeli'} • ${rp(o.totalAmount)}`,
        at: o.createdAt.toISOString(),
        target: { group: 'Transaksi Koperasi', item: 'Pesanan Toko' },
      })),
      ...rentals.map((r) => ({
        id: `rental-${r.id}`,
        kind: 'rental' as const,
        title: `Pengajuan sewa #${r.rentalCode}`,
        description: `${r.userName} • mulai ${r.startDate.toISOString().slice(0, 10)} • ${rp(r.totalEstimasi)}`,
        at: r.createdAt.toISOString(),
        target: { group: 'Transaksi Koperasi', item: 'Pesanan Sewa Alat' },
      })),
      ...rentalUpdates.map((r) => ({
        id: `rental-upd-${r.id}-${r.status}`,
        kind: 'rental_update' as const,
        title: r.status === 'KADALUARSA' ? `Sewa #${r.rentalCode} kadaluarsa` : `Sewa #${r.rentalCode} dibatalkan`,
        description:
          r.status === 'KADALUARSA' ? `${r.userName} tidak membayar DP sampai batas waktu` : `Dibatalkan • ${r.userName}`,
        at: r.updatedAt.toISOString(),
        target: { group: 'Transaksi Koperasi', item: 'Pesanan Sewa Alat' },
      })),
      ...users.map((u) => ({
        id: `user-${u.id}`,
        kind: 'user' as const,
        title: u.role === 'PETANI' ? 'Petani mitra baru' : 'Pembeli baru terdaftar',
        description: u.name,
        at: u.createdAt.toISOString(),
        target: { group: 'Pengguna', item: u.role === 'PETANI' ? 'Petani' : 'Pembeli' },
      })),
    ]
      .map((n) => ({ ...n, unread: new Date(n.at) > bellSeen }))
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      // Badge sidebar: hanya yang belum dilihat (hilang saat menu dibuka)
      badges: {
        pesananToko: countUnseen(pendingKeys.pesananToko, seenIds.pesananToko),
        pesananSewa: countUnseen(pendingKeys.pesananSewa, seenIds.pesananSewa),
        bagiHasil: countUnseen(pendingKeys.bagiHasil, seenIds.bagiHasil),
        petani: petaniBaru,
        pembeli: pembeliBaru,
      },
      signatures: {
        pesananToko: signatureOf(pendingKeys.pesananToko),
        pesananSewa: signatureOf(pendingKeys.pesananSewa),
        bagiHasil: signatureOf(pendingKeys.bagiHasil),
        petani: latestPetani?.id || '',
        pembeli: latestPembeli?.id || '',
      },
      // Total pekerjaan tertunda (untuk daftar "Perlu Tindakan" di lonceng)
      pending: {
        pesananToko,
        pesananSewa: sewaMenunggu + sewaAmbil + sewaKembali + sewaRefund,
        bagiHasil,
      },
      sewaDetail: { menunggu: sewaMenunggu, ambilHariIni: sewaAmbil, terlambat: sewaKembali, refundDp: sewaRefund },
      unreadCount: items.filter((n) => n.unread).length,
      items,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat notifikasi' }, { status: 500 });
  }
}

// POST { section } -> tandai sudah dilihat (bell/petani/pembeli: waktu; pesananToko/pesananSewa/bagiHasil: daftar item)
export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    const { section } = await request.json().catch(() => ({}));
    if (!SECTIONS.includes(section)) return NextResponse.json({ error: 'Section tidak valid' }, { status: 400 });
    if ((ID_SECTIONS as readonly string[]).includes(section)) {
      const [seenIds, pendingKeys] = await Promise.all([
        getSetting<SeenIdsMap>(SEEN_IDS_KEY).then((v) => v || {}),
        collectPendingKeys(),
      ]);
      // Simpan hanya item yang masih tertunda agar data tidak terus membesar
      seenIds[section as IdSection] = pendingKeys[section as IdSection];
      await setSetting(SEEN_IDS_KEY, seenIds);
      return NextResponse.json({ success: true });
    }
    const seen = (await getSetting<SeenMap>(SEEN_KEY)) || {};
    seen[section] = new Date().toISOString();
    await setSetting(SEEN_KEY, seen);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan' }, { status: 500 });
  }
}
