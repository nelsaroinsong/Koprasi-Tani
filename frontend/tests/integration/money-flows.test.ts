/**
 * Test integrasi alur uang & stok terhadap database (DATABASE_URL di .env).
 * Jalankan: npm run test:db
 * Semua data uji berawalan "TEST-INT-" dan dihapus di akhir; periode laporan memakai tahun 2099
 * agar tidak tercampur data asli.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import { expireOverduePickupOrders } from '@/lib/order-lifecycle';
import { archiveOrders } from '@/lib/archive';
import { buildFinanceReport } from '@/lib/finance-report';
import { runScheduledTasks } from '@/lib/scheduled-tasks';

const TAG = 'TEST-INT-';
let pembeliId = '';
let product: { id: string; nama: string; satuan: string; petaniId: string; stok: number; hargaPerSatuan: unknown };
const createdOrderIds: string[] = [];
const createdRentalIds: string[] = [];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeOrder(suffix: string, data: Record<string, unknown>, qty = 1) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `${TAG}${suffix}-${Date.now()}`,
      pembeliId,
      totalAmount: 1000 * qty,
      items: {
        create: [
          {
            productId: product.id,
            namaProduk: product.nama,
            hargaPerSatuan: 1000,
            satuan: product.satuan,
            quantity: qty,
            subtotal: 1000 * qty,
            petaniId: product.petaniId,
          },
        ],
      },
      ...data,
    } as any,
  });
  createdOrderIds.push(order.id);
  return order;
}

before(async () => {
  const buyer = await prisma.user.findFirst({ where: { role: 'PEMBELI' }, select: { id: true } });
  const prod = await prisma.product.findFirst({
    select: { id: true, nama: true, satuan: true, petaniId: true, stok: true, hargaPerSatuan: true },
  });
  assert.ok(buyer && prod, 'Butuh minimal 1 pembeli dan 1 produk di database');
  pembeliId = buyer.id;
  product = prod;
});

after(async () => {
  await prisma.userNotification.deleteMany({
    where: { OR: [...createdOrderIds, ...createdRentalIds].map((id) => ({ eventKey: { contains: id } })) },
  });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [...createdOrderIds, ...createdRentalIds] } } });
  await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.equipmentRental.deleteMany({ where: { id: { in: createdRentalIds } } });
  await prisma.$disconnect();
});

describe('Batal otomatis pesanan lewat batas ambil', () => {
  test('pesanan dibatalkan, stok kembali, pembeli diberi tahu — dan tidak dobel', async () => {
    const stokAwal = (await prisma.product.findUnique({ where: { id: product.id } }))!.stok;
    await prisma.product.update({ where: { id: product.id }, data: { stok: { decrement: 1 } } });
    const order = await makeOrder('EXPIRE', {
      status: 'SIAP_DIAMBIL',
      isPaid: false,
      pickupDeadline: new Date(Date.now() - 60_000),
    });

    assert.equal(await expireOverduePickupOrders({ orderId: order.id }), 1);
    assert.equal(await expireOverduePickupOrders({ orderId: order.id }), 0, 'putaran kedua tidak memproses ulang');

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(after!.status, 'DIBATALKAN');
    assert.ok(after!.cancelReason?.includes('Otomatis'));
    assert.equal((await prisma.product.findUnique({ where: { id: product.id } }))!.stok, stokAwal, 'stok kembali utuh');

    await wait(800); // notifikasi dikirim di latar belakang
    const notif = await prisma.userNotification.count({ where: { eventKey: `order:${order.id}:DIBATALKAN` } });
    assert.equal(notif, 1);
  });

  test('pesanan yang sudah lunas tidak pernah dibatalkan otomatis', async () => {
    const order = await makeOrder('PAID', { status: 'SIAP_DIAMBIL', isPaid: true, pickupDeadline: new Date(Date.now() - 60_000) });
    assert.equal(await expireOverduePickupOrders({ orderId: order.id }), 0);
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } }))!.status, 'SIAP_DIAMBIL');
  });
});

describe('Arsip transaksi', () => {
  test('hanya pesanan final yang diarsipkan; data tetap ada & tercatat di log', async () => {
    const done = await makeOrder('ARC-DONE', { status: 'SELESAI', isPaid: true });
    const active = await makeOrder('ARC-ACTIVE', { status: 'MENUNGGU_PEMBAYARAN' });
    const res = await archiveOrders([done.id, active.id], { name: 'Test Otomatis' });

    assert.equal(res.archived.length, 1);
    assert.equal(res.skipped.length, 1);
    assert.ok((await prisma.order.findUnique({ where: { id: done.id } }))!.archivedAt);
    assert.equal((await prisma.order.findUnique({ where: { id: active.id } }))!.archivedAt, null);
    assert.equal(await prisma.auditLog.count({ where: { entityId: done.id, action: 'ORDER_ARCHIVE' } }), 1);
  });
});

describe('Laporan keuangan', () => {
  test('kas masuk/keluar & pendapatan koperasi dihitung tepat (periode terisolasi 2099)', async () => {
    const d = (day: number) => new Date(`2099-01-${String(day).padStart(2, '0')}T04:00:00Z`);
    // Penjualan toko Rp 25.000, bagi hasilnya diserahkan Rp 25.000
    const order = await makeOrder('FIN', { status: 'SELESAI', isPaid: true, paidAt: d(10), totalAmount: 25_000 }, 25);
    await prisma.orderItem.updateMany({ where: { orderId: order.id }, data: { payoutStatus: 'SUDAH_DICAIRKAN_CASH', payoutAt: d(15) } });

    // Sewa: DP 30.000, pelunasan (100.000 - 30.000), denda 50.000
    const rental = await prisma.equipmentRental.create({
      data: {
        rentalCode: `${TAG}FIN-${Date.now()}`,
        userId: pembeliId,
        userName: 'Uji',
        userEmail: 'uji@test.local',
        status: 'SELESAI',
        startDate: d(18),
        endDate: d(20),
        totalEstimasi: 100_000,
        dpAmount: 30_000,
        dpPaidAt: d(5),
        isPaid: true,
        paidAt: d(18),
        returnedAt: d(25),
        lateDays: 1,
        lateFee: 50_000,
      } as any,
    });
    createdRentalIds.push(rental.id);
    // Sewa batal tepat waktu: DP 10.000 masuk lalu dikembalikan
    const refund = await prisma.equipmentRental.create({
      data: {
        rentalCode: `${TAG}REF-${Date.now()}`,
        userId: pembeliId,
        userName: 'Uji',
        userEmail: 'uji@test.local',
        status: 'DIBATALKAN',
        startDate: d(28),
        endDate: d(28),
        totalEstimasi: 40_000,
        dpAmount: 10_000,
        dpPaidAt: d(6),
        dpRefundedAt: d(26),
      } as any,
    });
    createdRentalIds.push(refund.id);

    const r = await buildFinanceReport('2099-01-01', '2099-01-31');
    assert.equal(r.summary.tokoSales, 25_000);
    assert.equal(r.summary.rentalDp, 40_000);
    assert.equal(r.summary.rentalSettlement, 70_000);
    assert.equal(r.summary.rentalFees, 50_000);
    assert.equal(r.summary.cashIn, 25_000 + 40_000 + 70_000 + 50_000);
    assert.equal(r.summary.payoutPaid, 25_000);
    assert.equal(r.summary.dpRefunded, 10_000);
    assert.equal(r.summary.cashOut, 35_000);
    assert.equal(r.summary.netCash, 185_000 - 35_000);
    assert.equal(r.summary.koperasiRevenue, 40_000 + 70_000 + 50_000 - 10_000);
    // saldo akhir buku kas = saldo bersih
    const saldo = r.ledger.reduce((s, e) => s + e.in - e.out, 0);
    assert.equal(saldo, r.summary.netCash);
  });
});

describe('Pengingat terjadwal', () => {
  test('pengingat "akan dibatalkan" terkirim sekali walau tugas berjalan berulang', async () => {
    const order = await makeOrder('REMIND', {
      status: 'SIAP_DIAMBIL',
      isPaid: false,
      pickupDeadline: new Date(Date.now() + 2 * 3_600_000),
    });
    await runScheduledTasks();
    await runScheduledTasks();
    const count = await prisma.userNotification.count({ where: { eventKey: { startsWith: `remind:order-pickup:${order.id}` } } });
    assert.equal(count, 1);
  });
});
