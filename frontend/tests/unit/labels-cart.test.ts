import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rentalSummary, saleStatus } from '@/lib/transaction-labels';
import { cappedAddQuantity } from '@/lib/cart';

describe('Status hasil penjualan petani', () => {
  test('sudah diserahkan tunai', () => {
    assert.equal(saleStatus({ payoutStatus: 'SUDAH_DICAIRKAN_CASH', orderStatus: 'SELESAI' }).tone, 'paid');
  });
  test('siap diambil hanya bila pesanan pembeli selesai & lunas', () => {
    assert.equal(saleStatus({ payoutStatus: 'MENUNGGU_PENCAIRAN', orderStatus: 'SELESAI', orderPaid: true }).tone, 'ready');
    assert.equal(saleStatus({ payoutStatus: 'MENUNGGU_PENCAIRAN', orderStatus: 'SIAP_DIAMBIL', orderPaid: false }).tone, 'waiting');
  });
});

describe('Ringkasan sewa', () => {
  test('nama alat, durasi, & nomor sewa dari field API yang benar', () => {
    const r = rentalSummary({ id: 'abcdefgh-1', rentalCode: 'SEWA-1', totalEstimasi: 250000, items: [{ nama: 'Traktor', durasi: 3, satuanSewa: 'Hari' }, { nama: 'Pompa' }] });
    assert.equal(r.name, 'Traktor +1 alat');
    assert.equal(r.durationLabel, '3 hari');
    assert.equal(r.ref, '#SEWA-1');
    assert.equal(r.total, 250000);
  });
});

describe('Batas stok keranjang', () => {
  const cart = [{ id: 'p1', nama: 'Kelapa', hargaPerSatuan: 5000, satuan: 'butir', quantity: 2 }];
  test('tidak bisa menambah melebihi stok', () => {
    assert.deepEqual(cappedAddQuantity(cart, 'p1', 2, 2), { addable: 0, inCart: 2 });
    assert.deepEqual(cappedAddQuantity(cart, 'p1', 5, 3), { addable: 1, inCart: 2 });
  });
  test('produk baru: sebanyak permintaan selama stok cukup', () => {
    assert.deepEqual(cappedAddQuantity(cart, 'p2', 4, 10), { addable: 4, inCart: 0 });
    assert.deepEqual(cappedAddQuantity(cart, 'p2', 4, 0), { addable: 0, inCart: 0 });
  });
});
