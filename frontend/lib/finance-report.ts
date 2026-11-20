import { prisma } from '@/lib/prisma';

/**
 * Laporan keuangan kas koperasi per periode (tanggal WITA, inklusif).
 * Semua transaksi tunai di kasir. Data yang diarsipkan TETAP dihitung.
 *
 * Kas masuk : pembayaran pesanan toko, DP sewa, pelunasan sewa, denda & kerusakan
 * Kas keluar: bagi hasil diserahkan ke petani, DP dikembalikan ke penyewa
 *
 * Uang pesanan toko adalah titipan petani (100% menjadi bagi hasil);
 * pendapatan koperasi berasal dari sewa alat (termasuk DP hangus, denda, kerusakan).
 */

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

export type LedgerKind =
  | 'PENJUALAN_TOKO'
  | 'DP_SEWA'
  | 'PELUNASAN_SEWA'
  | 'DENDA_SEWA'
  | 'BAGI_HASIL'
  | 'REFUND_DP';

export const LEDGER_LABEL: Record<LedgerKind, string> = {
  PENJUALAN_TOKO: 'Penjualan toko',
  DP_SEWA: 'DP sewa alat',
  PELUNASAN_SEWA: 'Pelunasan sewa alat',
  DENDA_SEWA: 'Denda & kerusakan sewa',
  BAGI_HASIL: 'Bagi hasil ke petani',
  REFUND_DP: 'Pengembalian DP sewa',
};

export interface LedgerEntry {
  at: string; // ISO
  date: string; // YYYY-MM-DD (WITA)
  kind: LedgerKind;
  ref: string;
  party: string;
  description: string;
  in: number;
  out: number;
}

export interface FinanceReport {
  period: { from: string; to: string };
  summary: {
    cashIn: number;
    cashOut: number;
    netCash: number;
    // rincian masuk
    tokoSales: number;
    tokoOrders: number;
    rentalDp: number;
    rentalSettlement: number;
    rentalFees: number;
    // rincian keluar
    payoutPaid: number;
    dpRefunded: number;
    // pendapatan koperasi (sewa) vs titipan petani (toko)
    koperasiRevenue: number;
    farmerFunds: number;
    // aktivitas periode
    ordersCancelled: number;
    rentalsCompleted: number;
  };
  /** Posisi saat ini (tidak terikat periode) */
  outstanding: {
    payoutOwed: number;
    payoutOwedPetani: number;
    dpToRefund: number;
    dpToRefundCount: number;
  };
  daily: { date: string; in: number; out: number }[];
  topProducts: { nama: string; quantity: number; satuan: string; amount: number }[];
  perPetani: { name: string; sales: number; paid: number }[];
  ledger: LedgerEntry[];
}

/** "2026-11-01" (WITA) -> rentang UTC [awal hari, akhir hari] */
export function witaRange(from: string, to: string) {
  const start = new Date(new Date(`${from}T00:00:00Z`).getTime() - WITA_OFFSET_MS);
  const end = new Date(new Date(`${to}T23:59:59.999Z`).getTime() - WITA_OFFSET_MS);
  return { start, end };
}

export function witaDate(d: Date) {
  return new Date(d.getTime() + WITA_OFFSET_MS).toISOString().slice(0, 10);
}

const num = (v: unknown) => Number(v || 0);

export async function buildFinanceReport(from: string, to: string): Promise<FinanceReport> {
  const { start, end } = witaRange(from, to);
  const inRange = { gte: start, lte: end };

  const [paidOrders, dpRentals, settledRentals, returnedRentals, refundedRentals, payoutItems, cancelledCount, owedItems, dpToRefund] =
    await Promise.all([
      // Penjualan toko: pesanan selesai & lunas, dibayar di periode ini
      prisma.order.findMany({
        where: { status: 'SELESAI', isPaid: true, paidAt: inRange },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          paidAt: true,
          pembeli: { select: { name: true } },
          items: { select: { namaProduk: true, quantity: true, satuan: true, subtotal: true, petaniId: true, petani: { select: { name: true } } } },
        },
      }),
      prisma.equipmentRental.findMany({
        where: { dpPaidAt: inRange },
        select: { id: true, rentalCode: true, userName: true, dpAmount: true, dpPaidAt: true, dpForfeited: true },
      }),
      prisma.equipmentRental.findMany({
        where: { isPaid: true, paidAt: inRange },
        select: { id: true, rentalCode: true, userName: true, totalEstimasi: true, dpAmount: true, dpPaidAt: true, paidAt: true },
      }),
      prisma.equipmentRental.findMany({
        where: { returnedAt: inRange, OR: [{ lateFee: { gt: 0 } }, { damageFee: { gt: 0 } }] },
        select: { id: true, rentalCode: true, userName: true, lateFee: true, damageFee: true, lateDays: true, returnedAt: true },
      }),
      prisma.equipmentRental.findMany({
        where: { dpRefundedAt: inRange },
        select: { id: true, rentalCode: true, userName: true, dpAmount: true, dpRefundedAt: true },
      }),
      prisma.orderItem.findMany({
        where: { payoutStatus: 'SUDAH_DICAIRKAN_CASH', payoutAt: inRange },
        select: { id: true, subtotal: true, payoutAt: true, namaProduk: true, petaniId: true, petani: { select: { name: true } }, order: { select: { orderNumber: true } } },
      }),
      prisma.order.count({ where: { status: 'DIBATALKAN', cancelledAt: inRange } }),
      prisma.orderItem.findMany({
        where: { payoutStatus: 'MENUNGGU_PENCAIRAN', order: { status: 'SELESAI', isPaid: true } },
        select: { subtotal: true, petaniId: true },
      }),
      prisma.equipmentRental.findMany({
        where: { status: { in: ['DIBATALKAN', 'DITOLAK'] }, dpPaidAt: { not: null }, dpForfeited: false, dpRefundedAt: null },
        select: { dpAmount: true },
      }),
    ]);

  const ledger: LedgerEntry[] = [];
  const push = (at: Date, kind: LedgerKind, ref: string, party: string, description: string, amountIn: number, amountOut: number) => {
    if (amountIn <= 0 && amountOut <= 0) return;
    ledger.push({ at: at.toISOString(), date: witaDate(at), kind, ref, party, description, in: amountIn, out: amountOut });
  };

  const productAgg = new Map<string, { nama: string; quantity: number; satuan: string; amount: number }>();
  const petaniAgg = new Map<string, { name: string; sales: number; paid: number }>();

  for (const o of paidOrders) {
    const items = o.items.map((i) => `${i.namaProduk} ${i.quantity} ${i.satuan}`).join(', ');
    push(o.paidAt!, 'PENJUALAN_TOKO', `#${o.orderNumber}`, o.pembeli?.name || 'Pembeli', items, num(o.totalAmount), 0);
    for (const i of o.items) {
      const key = `${i.namaProduk}|${i.satuan}`;
      const p = productAgg.get(key) || { nama: i.namaProduk, quantity: 0, satuan: i.satuan, amount: 0 };
      p.quantity += i.quantity;
      p.amount += num(i.subtotal);
      productAgg.set(key, p);
      if (i.petaniId) {
        const f = petaniAgg.get(i.petaniId) || { name: i.petani?.name || 'Petani', sales: 0, paid: 0 };
        f.sales += num(i.subtotal);
        petaniAgg.set(i.petaniId, f);
      }
    }
  }

  for (const r of dpRentals) {
    push(r.dpPaidAt!, 'DP_SEWA', `#${r.rentalCode}`, r.userName, r.dpForfeited ? 'DP (hangus — batal mepet)' : 'Uang muka sewa', num(r.dpAmount), 0);
  }
  for (const r of settledRentals) {
    const sisa = Math.max(0, num(r.totalEstimasi) - (r.dpPaidAt ? num(r.dpAmount) : 0));
    push(r.paidAt!, 'PELUNASAN_SEWA', `#${r.rentalCode}`, r.userName, 'Pelunasan sewa alat', sisa, 0);
  }
  for (const r of returnedRentals) {
    const parts = [
      num(r.lateFee) > 0 ? `denda ${r.lateDays} hari` : '',
      num(r.damageFee) > 0 ? 'kerusakan' : '',
    ].filter(Boolean);
    push(r.returnedAt!, 'DENDA_SEWA', `#${r.rentalCode}`, r.userName, parts.join(' + '), num(r.lateFee) + num(r.damageFee), 0);
  }
  for (const r of refundedRentals) {
    push(r.dpRefundedAt!, 'REFUND_DP', `#${r.rentalCode}`, r.userName, 'DP dikembalikan (batal tepat waktu)', 0, num(r.dpAmount));
  }
  for (const i of payoutItems) {
    push(i.payoutAt!, 'BAGI_HASIL', `#${i.order.orderNumber}`, i.petani?.name || 'Petani', i.namaProduk, 0, num(i.subtotal));
    if (i.petaniId) {
      const f = petaniAgg.get(i.petaniId) || { name: i.petani?.name || 'Petani', sales: 0, paid: 0 };
      f.paid += num(i.subtotal);
      petaniAgg.set(i.petaniId, f);
    }
  }

  ledger.sort((a, b) => (a.at < b.at ? -1 : 1));

  const sumKind = (k: LedgerKind, field: 'in' | 'out') => ledger.filter((e) => e.kind === k).reduce((s, e) => s + e[field], 0);
  const tokoSales = sumKind('PENJUALAN_TOKO', 'in');
  const rentalDp = sumKind('DP_SEWA', 'in');
  const rentalSettlement = sumKind('PELUNASAN_SEWA', 'in');
  const rentalFees = sumKind('DENDA_SEWA', 'in');
  const payoutPaid = sumKind('BAGI_HASIL', 'out');
  const dpRefunded = sumKind('REFUND_DP', 'out');
  const cashIn = tokoSales + rentalDp + rentalSettlement + rentalFees;
  const cashOut = payoutPaid + dpRefunded;

  // Ringkasan harian (semua tanggal dalam periode, termasuk hari tanpa transaksi; maks 400 hari)
  const daily: FinanceReport['daily'] = [];
  const byDate = new Map<string, { in: number; out: number }>();
  for (const e of ledger) {
    const d = byDate.get(e.date) || { in: 0, out: 0 };
    d.in += e.in;
    d.out += e.out;
    byDate.set(e.date, d);
  }
  for (let t = new Date(`${from}T00:00:00Z`).getTime(), i = 0; t <= new Date(`${to}T00:00:00Z`).getTime() && i < 400; t += 86_400_000, i++) {
    const date = new Date(t).toISOString().slice(0, 10);
    daily.push({ date, ...(byDate.get(date) || { in: 0, out: 0 }) });
  }

  const owedPetani = new Set(owedItems.map((i) => i.petaniId).filter(Boolean));

  return {
    period: { from, to },
    summary: {
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
      tokoSales,
      tokoOrders: paidOrders.length,
      rentalDp,
      rentalSettlement,
      rentalFees,
      payoutPaid,
      dpRefunded,
      koperasiRevenue: rentalDp + rentalSettlement + rentalFees - dpRefunded,
      farmerFunds: tokoSales,
      ordersCancelled: cancelledCount,
      rentalsCompleted: settledRentals.length,
    },
    outstanding: {
      payoutOwed: owedItems.reduce((s, i) => s + num(i.subtotal), 0),
      payoutOwedPetani: owedPetani.size,
      dpToRefund: dpToRefund.reduce((s, r) => s + num(r.dpAmount), 0),
      dpToRefundCount: dpToRefund.length,
    },
    daily,
    topProducts: [...productAgg.values()].sort((a, b) => b.amount - a.amount).slice(0, 10),
    perPetani: [...petaniAgg.values()].sort((a, b) => b.sales - a.sales),
    ledger,
  };
}
