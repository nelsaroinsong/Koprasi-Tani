import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNotificationEmail } from '@/lib/mailer';
import { delCache } from '@/lib/redis';

/**
 * Notifikasi untuk pembeli & petani.
 * Disimpan di database (tampil di lonceng & /notifikasi) + dikirim email bila SMTP aktif.
 * Semua fungsi di sini "best effort": kegagalan notifikasi TIDAK boleh menggagalkan transaksi.
 */

export type NotificationKind = 'ORDER' | 'RENTAL' | 'PAYOUT' | 'SYSTEM';

const APP_URL = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
const rp = (n: unknown) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtDateTime = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WITA'
    : '';
const fmtDateOnly = (d: string | null | undefined) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('id-ID', {
        timeZone: 'UTC',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  message: string;
  href?: string | null;
  /** Kunci unik peristiwa: notifikasi dengan kunci sama tidak dibuat dua kali */
  eventKey?: string | null;
  email?: {
    subject?: string;
    highlight?: { label: string; value: string } | null;
    actionLabel?: string;
  } | false;
}

/** @returns true bila notifikasi baru dibuat (false bila sudah pernah / gagal) */
export async function notifyUser(input: NotifyInput): Promise<boolean> {
  try {
    let created;
    try {
      created = await prisma.userNotification.create({
        data: {
          userId: input.userId,
          kind: input.kind,
          title: input.title,
          message: input.message,
          href: input.href || null,
          eventKey: input.eventKey || null,
        },
      });
    } catch (err: any) {
      // P2002 = eventKey sudah ada -> peristiwa ini sudah pernah diberitahukan
      if (err?.code === 'P2002') return false;
      throw err;
    }

    await delCache(`user:notifications:${input.userId}`).catch(() => {});

    if (input.email === false) return true;
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true, isActive: true },
    });
    if (!user?.email || !user.isActive) return true;

    const { sent } = await sendNotificationEmail({
      to: user.email,
      name: user.name,
      subject: input.email?.subject || `${input.title} — Koperasi Sinar Pagi Sejahtera`,
      title: input.title,
      message: input.message,
      highlight: input.email?.highlight || null,
      actionUrl: input.href ? `${APP_URL}${input.href}` : null,
      actionLabel: input.email?.actionLabel,
    });
    if (sent) {
      await prisma.userNotification.update({ where: { id: created.id }, data: { emailedAt: new Date() } });
    }
    return true;
  } catch (error) {
    console.error('[Notifikasi] Gagal membuat notifikasi:', error);
    return false;
  }
}

/**
 * Jalankan tanpa menunggu (agar respons API tetap cepat), error sudah ditangani di dalam.
 * Di dalam request memakai `after()` Next.js: di serverless (Vercel) fungsi tetap hidup sampai
 * notifikasi & email selesai. Di luar request (penjadwal, test) langsung dijalankan.
 */
export function notifyInBackground(input: NotifyInput) {
  try {
    after(() => notifyUser(input));
  } catch {
    void notifyUser(input);
  }
}

// ------------------------------------------------------------------
// Pesanan Toko
// ------------------------------------------------------------------
type OrderLike = {
  id: string;
  orderNumber: string;
  pembeliId: string;
  totalAmount: unknown;
  status: string;
  pickupCode?: string | null;
  pickupDeadline?: Date | string | null;
  cancelReason?: string | null;
  items?: { petaniId?: string | null; namaProduk: string; quantity: number; satuan: string; subtotal: unknown }[];
};

export function notifyOrderStatus(order: OrderLike, opts?: { extended?: boolean }) {
  const href = `/pesanan/${order.id}`;
  const no = `#${order.orderNumber}`;

  if (opts?.extended) {
    notifyInBackground({
      userId: order.pembeliId,
      kind: 'ORDER',
      title: `Batas ambil pesanan ${no} diperpanjang`,
      message: `Batas ambil & bayar sekarang sampai ${fmtDateTime(order.pickupDeadline)}.`,
      href,
      eventKey: `order:${order.id}:extend:${order.pickupDeadline ? new Date(order.pickupDeadline).getTime() : ''}`,
    });
    return;
  }

  const templates: Record<string, { title: string; message: string; email?: NotifyInput['email'] } | undefined> = {
    DIPROSES: {
      title: `Pesanan ${no} sedang disiapkan`,
      message: 'Petugas gudang sedang menyortir dan menimbang komoditas pesanan Anda. Kami kabari lagi saat siap diambil.',
      email: false,
    },
    SIAP_DIAMBIL: {
      title: `Pesanan ${no} siap diambil`,
      message: `Datang ke kasir koperasi sebelum ${fmtDateTime(order.pickupDeadline)}, tunjukkan kode ambil aktif di halaman pesanan (berganti tiap 20 detik), lalu bayar tunai ${rp(order.totalAmount)}. Lewat batas, pesanan dibatalkan otomatis.`,
      email: {
        subject: `Pesanan ${no} siap diambil di kasir koperasi`,
        highlight: null,
        actionLabel: 'Buka Kode Ambil Pesanan',
      },
    },
    SELESAI: {
      title: `Pesanan ${no} selesai`,
      message: `Pembayaran ${rp(order.totalAmount)} diterima dan barang sudah diserahkan. Terima kasih! Bagikan ulasan Anda untuk petani.`,
      email: false,
    },
    DIBATALKAN: {
      title: `Pesanan ${no} dibatalkan`,
      message: order.cancelReason ? `Alasan: ${order.cancelReason}` : 'Pesanan Anda telah dibatalkan.',
      email: { actionLabel: 'Lihat Pesanan' },
    },
  };
  const t = templates[order.status];
  if (!t) return;

  notifyInBackground({
    userId: order.pembeliId,
    kind: 'ORDER',
    title: t.title,
    message: t.message,
    href,
    eventKey: `order:${order.id}:${order.status}`,
    email: t.email,
  });

  // Petani: hasil penjualan siap diambil setelah pesanan selesai
  if (order.status === 'SELESAI' && order.items?.length) {
    const byPetani = new Map<string, { total: number; names: string[] }>();
    for (const it of order.items) {
      if (!it.petaniId) continue;
      const cur = byPetani.get(it.petaniId) || { total: 0, names: [] };
      cur.total += Number(it.subtotal || 0);
      cur.names.push(`${it.namaProduk} ${it.quantity} ${it.satuan}`);
      byPetani.set(it.petaniId, cur);
    }
    for (const [petaniId, info] of byPetani) {
      notifyInBackground({
        userId: petaniId,
        kind: 'PAYOUT',
        title: `Hasil penjualan ${rp(info.total)} siap diambil`,
        message: `${info.names.join(', ')} dari pesanan ${no} sudah lunas. Ambil uang tunai di kasir koperasi.`,
        href: '/dashboard',
        eventKey: `payout-ready:${order.id}:${petaniId}`,
        email: { actionLabel: 'Buka Dashboard' },
      });
    }
  }
}

/** Petani: komoditasnya baru dipesan pembeli (tanpa email agar tidak berisik) */
export function notifyPetaniNewOrder(order: OrderLike) {
  const byPetani = new Map<string, string[]>();
  for (const it of order.items || []) {
    if (!it.petaniId) continue;
    byPetani.set(it.petaniId, [...(byPetani.get(it.petaniId) || []), `${it.namaProduk} ${it.quantity} ${it.satuan}`]);
  }
  for (const [petaniId, names] of byPetani) {
    notifyInBackground({
      userId: petaniId,
      kind: 'ORDER',
      title: 'Komoditas Anda dipesan',
      message: `${names.join(', ')} dipesan pembeli (#${order.orderNumber}). Hasil penjualan bisa diambil setelah pesanan selesai.`,
      href: '/dashboard',
      eventKey: `petani-order:${order.id}:${petaniId}`,
      email: false,
    });
  }
}

export function notifyPayoutPaid(petaniId: string, total: number, itemCount: number, batchKey: string) {
  notifyInBackground({
    userId: petaniId,
    kind: 'PAYOUT',
    title: `Bagi hasil ${rp(total)} sudah diserahkan`,
    message: `Uang tunai untuk ${itemCount} item penjualan sudah Anda terima di kasir koperasi. Terima kasih!`,
    href: '/profile/transaksi',
    eventKey: `payout-paid:${batchKey}`,
    email: { actionLabel: 'Lihat Riwayat' },
  });
}

// ------------------------------------------------------------------
// Sewa Alat
// ------------------------------------------------------------------
type RentalLike = {
  id: string;
  rentalCode: string;
  userId: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  paymentDeadline?: string | Date | null;
  dpAmount?: number | null;
  totalEstimasi?: unknown;
  rejectedReason?: string | null;
  lateFee?: number | null;
  dpRefundedAt?: string | Date | null;
};

export function notifyRentalStatus(rental: RentalLike, opts?: { dpRefunded?: boolean }) {
  const href = `/pesanan/${rental.id}?type=sewa`;
  const no = `#${rental.rentalCode}`;

  if (opts?.dpRefunded) {
    notifyInBackground({
      userId: rental.userId,
      kind: 'RENTAL',
      title: `DP sewa ${no} sudah dikembalikan`,
      message: `DP ${rp(rental.dpAmount)} sudah dikembalikan kepada Anda di kasir koperasi.`,
      href,
      eventKey: `rental:${rental.id}:dp-refund`,
      email: false,
    });
    return;
  }

  const jadwal = `${fmtDateOnly(rental.startDate)}${rental.endDate && rental.endDate !== rental.startDate ? ` – ${fmtDateOnly(rental.endDate)}` : ''}`;
  const templates: Record<string, { title: string; message: string; email?: NotifyInput['email'] } | undefined> = {
    DISETUJUI: {
      title: `Sewa ${no} disetujui — bayar DP`,
      message: `Bayar DP ${rp(rental.dpAmount)} tunai di kasir koperasi${rental.paymentDeadline ? ` sebelum ${fmtDateTime(rental.paymentDeadline)}` : ''} agar jadwal ${jadwal} terkunci.`,
      email: { actionLabel: 'Lihat Pengajuan' },
    },
    DIKONFIRMASI: {
      title: `DP sewa ${no} diterima`,
      message: `Jadwal ${jadwal} sudah terkunci. Datang ke gudang koperasi pada hari pertama untuk melunasi sisa dan mengambil alat.`,
      email: false,
    },
    SIAP_DIAMBIL: {
      title: `Alat sewa ${no} siap diambil`,
      message: `Pembayaran lunas. Alat bisa diambil di gudang koperasi mulai ${fmtDateOnly(rental.startDate)}.`,
      email: { actionLabel: 'Lihat Detail' },
    },
    SEDANG_DISEWA: {
      title: `Alat sewa ${no} sudah Anda terima`,
      message: `Kembalikan paling lambat ${fmtDateOnly(rental.endDate || rental.startDate)} agar tidak terkena denda keterlambatan.`,
      email: false,
    },
    SELESAI: {
      title: `Sewa ${no} selesai`,
      message: `Alat sudah dikembalikan${Number(rental.lateFee || 0) > 0 ? ` (denda keterlambatan ${rp(rental.lateFee)})` : ''}. Terima kasih telah menyewa di koperasi!`,
      email: false,
    },
    DITOLAK: {
      title: `Pengajuan sewa ${no} ditolak`,
      message: rental.rejectedReason ? `Alasan: ${rental.rejectedReason}` : 'Pengajuan sewa Anda belum dapat disetujui.',
      email: { actionLabel: 'Lihat Pengajuan' },
    },
    DIBATALKAN: {
      title: `Sewa ${no} dibatalkan`,
      message: rental.rejectedReason ? `Alasan: ${rental.rejectedReason}` : 'Sewa alat Anda telah dibatalkan.',
      email: { actionLabel: 'Lihat Detail' },
    },
    KADALUARSA: {
      title: `Sewa ${no} kadaluarsa`,
      message: 'DP tidak dibayar sampai batas waktu, jadwal unit sudah dibuka kembali. Silakan ajukan ulang bila masih membutuhkan.',
      email: { actionLabel: 'Ajukan Ulang' },
    },
  };
  const t = templates[rental.status];
  if (!t) return;
  notifyInBackground({
    userId: rental.userId,
    kind: 'RENTAL',
    title: t.title,
    message: t.message,
    href,
    eventKey: `rental:${rental.id}:${rental.status}`,
    email: t.email,
  });
}
