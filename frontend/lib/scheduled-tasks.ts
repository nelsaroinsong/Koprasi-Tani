import { prisma } from '@/lib/prisma';
import { expireOverduePickupOrders } from '@/lib/order-lifecycle';
import { expireOverdueRentals } from '@/lib/equipment-rentals';
import { notifyUser } from '@/lib/user-notifications';
import { addDays, todayWita } from '@/lib/rental-schedule';

/**
 * Tugas terjadwal (dijalankan tiap ±10 menit oleh instrumentation.ts atau endpoint /api/cron/tasks):
 * 1. Membatalkan tepat waktu pesanan & sewa yang lewat batas (tidak menunggu ada yang membuka halaman)
 * 2. Mengirim pengingat menjelang tenggat
 *
 * Setiap pengingat memakai eventKey unik sehingga aman dijalankan berulang kali (tidak terkirim dobel).
 */

const HOUR = 60 * 60 * 1000;
/** Pengingat ambil pesanan: saat sisa waktu <= 3 jam */
export const ORDER_PICKUP_REMIND_MS = 3 * HOUR;
/** Pengingat bayar DP sewa: saat sisa waktu <= 6 jam */
export const RENTAL_DP_REMIND_MS = 6 * HOUR;

const rp = (n: unknown) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtTime = (d: Date) =>
  `${d.toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WITA`;
const fmtDateOnly = (d: Date) =>
  d.toLocaleDateString('id-ID', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const dateOnly = (s: string) => new Date(`${s}T00:00:00Z`);

export interface TaskResult {
  ordersExpired: number;
  rentalsExpired: number;
  reminders: Record<string, number>;
  ranAt: string;
}

let running = false;

export async function runScheduledTasks(now: Date = new Date()): Promise<TaskResult | null> {
  // Cegah dua putaran berjalan bersamaan dalam satu proses
  if (running) return null;
  running = true;
  const reminders: Record<string, number> = {};
  const count = (k: string) => (reminders[k] = (reminders[k] || 0) + 1);

  try {
    const ordersExpired = await expireOverduePickupOrders().catch(() => 0);
    const rentalsExpired = await expireOverdueRentals().catch(() => 0);

    const today = todayWita(now);
    const tomorrow = addDays(today, 1);

    const [pickupSoon, dpSoon, startTomorrow, returnToday, lateReturn] = await Promise.all([
      // 1. Pesanan siap diambil, belum dibayar, batal dalam <= 3 jam
      prisma.order.findMany({
        where: {
          status: 'SIAP_DIAMBIL',
          isPaid: false,
          pickupDeadline: { gt: now, lte: new Date(now.getTime() + ORDER_PICKUP_REMIND_MS) },
        },
        select: { id: true, orderNumber: true, pembeliId: true, totalAmount: true, pickupDeadline: true },
      }),
      // 2. Sewa disetujui, DP belum dibayar, batas bayar dalam <= 6 jam
      prisma.equipmentRental.findMany({
        where: {
          status: 'DISETUJUI',
          dpPaidAt: null,
          isPaid: false,
          paymentDeadline: { gt: now, lte: new Date(now.getTime() + RENTAL_DP_REMIND_MS) },
        },
        select: { id: true, rentalCode: true, userId: true, dpAmount: true, paymentDeadline: true },
      }),
      // 3. Jadwal ambil alat besok
      prisma.equipmentRental.findMany({
        where: { status: { in: ['DIKONFIRMASI', 'SIAP_DIAMBIL'] }, startDate: dateOnly(tomorrow) },
        select: { id: true, rentalCode: true, userId: true, status: true, startDate: true, totalEstimasi: true, dpAmount: true, dpPaidAt: true },
      }),
      // 4. Hari ini batas pengembalian
      prisma.equipmentRental.findMany({
        where: { status: 'SEDANG_DISEWA', endDate: dateOnly(today) },
        select: { id: true, rentalCode: true, userId: true, endDate: true },
      }),
      // 5. Terlambat dikembalikan (kemarin sudah lewat batas)
      prisma.equipmentRental.findMany({
        where: { status: 'SEDANG_DISEWA', endDate: { lt: dateOnly(today) } },
        select: { id: true, rentalCode: true, userId: true, endDate: true },
      }),
    ]);

    for (const o of pickupSoon) {
      const deadline = o.pickupDeadline!;
      const created = await notifyUser({
        userId: o.pembeliId,
        kind: 'ORDER',
        title: `Pesanan #${o.orderNumber} akan dibatalkan`,
        message: `Batas ambil & bayar ${fmtTime(deadline)}. Segera ke kasir koperasi dengan kode ambil Anda dan siapkan ${rp(o.totalAmount)}.`,
        href: `/pesanan/${o.id}`,
        // satu pengingat per batas waktu (batas diperpanjang -> boleh diingatkan lagi)
        eventKey: `remind:order-pickup:${o.id}:${deadline.getTime()}`,
        email: { actionLabel: 'Lihat Kode Ambil' },
      });
      if (created) count('ambilPesanan');
    }

    for (const r of dpSoon) {
      const deadline = r.paymentDeadline!;
      const created = await notifyUser({
        userId: r.userId,
        kind: 'RENTAL',
        title: `Segera bayar DP sewa #${r.rentalCode}`,
        message: `Bayar DP ${rp(r.dpAmount)} tunai di kasir sebelum ${fmtTime(deadline)}. Lewat batas, jadwal dibuka untuk penyewa lain.`,
        href: `/pesanan/${r.id}?type=sewa`,
        eventKey: `remind:rental-dp:${r.id}:${deadline.getTime()}`,
        email: { actionLabel: 'Lihat Pengajuan' },
      });
      if (created) count('bayarDp');
    }

    for (const r of startTomorrow) {
      const sisa = Math.max(0, Number(r.totalEstimasi) - (r.dpPaidAt ? Number(r.dpAmount || 0) : 0));
      const created = await notifyUser({
        userId: r.userId,
        kind: 'RENTAL',
        title: `Besok jadwal ambil alat #${r.rentalCode}`,
        message:
          r.status === 'SIAP_DIAMBIL'
            ? `Alat siap diambil di gudang koperasi pada ${fmtDateOnly(r.startDate)}.`
            : `Datang ke gudang koperasi ${fmtDateOnly(r.startDate)} untuk melunasi sisa ${rp(sisa)} dan mengambil alat.`,
        href: `/pesanan/${r.id}?type=sewa`,
        eventKey: `remind:rental-start:${r.id}:${tomorrow}`,
        email: { actionLabel: 'Lihat Detail' },
      });
      if (created) count('ambilAlatBesok');
    }

    for (const r of returnToday) {
      const created = await notifyUser({
        userId: r.userId,
        kind: 'RENTAL',
        title: `Hari ini batas pengembalian alat #${r.rentalCode}`,
        message: 'Kembalikan alat ke gudang koperasi hari ini agar tidak terkena denda keterlambatan.',
        href: `/pesanan/${r.id}?type=sewa`,
        eventKey: `remind:rental-return:${r.id}:${today}`,
        email: false,
      });
      if (created) count('kembalikanHariIni');
    }

    for (const r of lateReturn) {
      const created = await notifyUser({
        userId: r.userId,
        kind: 'RENTAL',
        title: `Alat sewa #${r.rentalCode} terlambat dikembalikan`,
        message: `Batas pengembalian ${fmtDateOnly(r.endDate)} sudah lewat. Denda berjalan per hari — segera kembalikan ke gudang koperasi.`,
        href: `/pesanan/${r.id}?type=sewa`,
        // sekali saja per sewa, agar tidak mengirim setiap hari
        eventKey: `remind:rental-late:${r.id}`,
        email: { actionLabel: 'Lihat Detail' },
      });
      if (created) count('terlambatKembali');
    }

    return { ordersExpired, rentalsExpired, reminders, ranAt: now.toISOString() };
  } finally {
    running = false;
  }
}
