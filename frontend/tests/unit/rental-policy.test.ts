import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DENDA_PER_HARI,
  dpDikembalikanJikaBatal,
  hitungDenda,
  hitungDp,
  hitungHariTerlambat,
  rincianTagihan,
} from '@/lib/rental-policy';

describe('Kebijakan sewa alat', () => {
  test('DP 30% dibulatkan ke atas ke ribuan', () => {
    assert.equal(hitungDp(100_000), 30_000);
    assert.equal(hitungDp(150_500), 46_000); // 45.150 -> 46.000
    assert.equal(hitungDp(0), 0);
  });

  test('DP kembali penuh hanya bila batal paling lambat H-2', () => {
    assert.equal(dpDikembalikanJikaBatal('2026-12-10', '2026-12-08'), true);
    assert.equal(dpDikembalikanJikaBatal('2026-12-10', '2026-12-09'), false);
    assert.equal(dpDikembalikanJikaBatal('2026-12-10', '2026-12-10'), false);
  });

  test('Hari terlambat & denda per unit per hari', () => {
    assert.equal(hitungHariTerlambat('2026-12-10', '2026-12-10'), 0);
    assert.equal(hitungHariTerlambat('2026-12-10', '2026-12-13'), 3);
    assert.equal(hitungHariTerlambat('2026-12-10', '2026-12-08'), 0);
    assert.equal(hitungDenda(3, 2), 3 * 2 * DENDA_PER_HARI);
    assert.equal(hitungDenda(-1, 2), 0);
  });

  test('Rincian tagihan: sisa pelunasan dikurangi DP yang sudah dibayar', () => {
    const t = rincianTagihan({ totalEstimasi: 500_000, dpAmount: 150_000, dpPaidAt: '2026-12-01', lateFee: 50_000, damageFee: 25_000 });
    assert.equal(t.sisaPelunasan, 350_000);
    assert.equal(t.biayaTambahan, 75_000);
    assert.equal(t.grandTotal, 575_000);
    const belumDp = rincianTagihan({ totalEstimasi: 500_000, dpAmount: 150_000, dpPaidAt: null });
    assert.equal(belumDp.sisaPelunasan, 500_000);
  });
});
