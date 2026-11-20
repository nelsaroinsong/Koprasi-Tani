import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePickupDeadline,
  effectivePickupDeadline,
  extendPickupDeadline,
  generatePickupCode,
  normalizePickupCode,
  PICKUP_WINDOW_HOURS,
  stripPickupCode,
} from '@/lib/order-lifecycle';

const H = 3_600_000;

describe('Serah terima pesanan (kode ambil & batas waktu)', () => {
  test('kode ambil selalu 6 digit angka', () => {
    for (let i = 0; i < 200; i++) assert.match(generatePickupCode(), /^\d{6}$/);
  });

  test('normalisasi input kode dari kasir', () => {
    assert.equal(normalizePickupCode(' 12-34 56 '), '123456');
    assert.equal(normalizePickupCode('1234567'), '123456');
    assert.equal(normalizePickupCode(null), '');
  });

  test(`batas ambil = ${PICKUP_WINDOW_HOURS} jam sejak siap diambil`, () => {
    const now = new Date('2026-11-21T00:00:00Z');
    assert.equal(computePickupDeadline(now).getTime() - now.getTime(), PICKUP_WINDOW_HOURS * H);
  });

  test('perpanjangan dihitung dari batas lama bila belum lewat, atau dari sekarang', () => {
    const now = new Date('2026-11-21T00:00:00Z');
    const later = new Date(now.getTime() + 5 * H);
    assert.equal(extendPickupDeadline(later, now).getTime(), later.getTime() + 24 * H);
    const past = new Date(now.getTime() - 5 * H);
    assert.equal(extendPickupDeadline(past, now).getTime(), now.getTime() + 24 * H);
  });

  test('batas efektif: hanya untuk SIAP_DIAMBIL, data lama pakai updatedAt + 24 jam', () => {
    assert.equal(effectivePickupDeadline({ status: 'DIPROSES', updatedAt: new Date() }), null);
    const updatedAt = new Date('2026-11-01T00:00:00Z');
    assert.equal(effectivePickupDeadline({ status: 'SIAP_DIAMBIL', updatedAt })!.getTime(), updatedAt.getTime() + 24 * H);
    const saved = new Date('2026-11-05T10:00:00Z');
    assert.equal(effectivePickupDeadline({ status: 'SIAP_DIAMBIL', pickupDeadline: saved, updatedAt })!.getTime(), saved.getTime());
  });

  test('kode ambil disembunyikan dari respons admin', () => {
    const out = stripPickupCode({ id: 'x', pickupCode: '123456' });
    assert.equal('pickupCode' in out, false);
    assert.equal(out.hasPickupCode, true);
    assert.equal(stripPickupCode({ id: 'y', pickupCode: null }).hasPickupCode, false);
  });
});
