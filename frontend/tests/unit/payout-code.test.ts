import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePayoutCode,
  normalizePayoutCode,
  PAYOUT_CODE_STEP_MS,
  PAYOUT_CODE_STEP_SECONDS,
  verifyPayoutCode,
} from '@/lib/payout-code';

const SECRET = 'unit-test-payout-secret';

describe('Kode verifikasi penarikan tunai petani (20 detik)', () => {
  test(`interval rotasi tepat ${PAYOUT_CODE_STEP_SECONDS} detik dan kode selalu 6 digit`, () => {
    assert.equal(PAYOUT_CODE_STEP_SECONDS, 20);
    const base = 1_760_000_000_000;
    for (let i = 0; i < 60; i++) {
      const res = generatePayoutCode(`petani-${i}`, base + i * 3_700, SECRET);
      assert.match(res.code, /^\d{6}$/);
      assert.ok(res.remainingMs > 0 && res.remainingMs <= PAYOUT_CODE_STEP_MS);
    }
  });

  test('kode stabil dalam slot 20 detik yang sama dan berubah pada slot berikutnya', () => {
    const slotStart = Math.floor(1_760_000_000_000 / PAYOUT_CODE_STEP_MS) * PAYOUT_CODE_STEP_MS;
    const atStart = generatePayoutCode('petani-1', slotStart + 100, SECRET);
    const atEnd = generatePayoutCode('petani-1', slotStart + PAYOUT_CODE_STEP_MS - 100, SECRET);
    const nextSlot = generatePayoutCode('petani-1', slotStart + PAYOUT_CODE_STEP_MS + 100, SECRET);

    assert.equal(atStart.code, atEnd.code);
    assert.notEqual(atStart.code, nextSlot.code);
  });

  test('kode unik per petani (kode petani A tidak bisa dipakai petani B)', () => {
    const now = 1_760_000_120_000;
    const petaniA = generatePayoutCode('petani-A', now, SECRET);
    assert.equal(verifyPayoutCode('petani-A', petaniA.code, now, { secret: SECRET }), true);
    assert.equal(verifyPayoutCode('petani-B', petaniA.code, now, { secret: SECRET }), false);
  });

  test('menerima slot saat ini & 1 slot grace window sebelumnya, menolak kode kedaluwarsa & masa depan', () => {
    const slotStart = Math.floor(1_760_000_000_000 / PAYOUT_CODE_STEP_MS) * PAYOUT_CODE_STEP_MS;
    const t0 = slotStart + 2_000;
    const codeAtT0 = generatePayoutCode('petani-1', t0, SECRET).code;

    // Berlaku di slot yang sama
    assert.equal(verifyPayoutCode('petani-1', codeAtT0, slotStart + 14_000, { secret: SECRET }), true);
    // Masih berlaku di 1 slot grace window berikutnya (agar tidak gagal saat kasir mengetik di detik 0)
    assert.equal(verifyPayoutCode('petani-1', codeAtT0, slotStart + PAYOUT_CODE_STEP_MS + 5_000, { secret: SECRET }), true);
    // Ditolak setelah lewat 2 slot (>= 30 detik)
    assert.equal(verifyPayoutCode('petani-1', codeAtT0, slotStart + 2 * PAYOUT_CODE_STEP_MS + 1_000, { secret: SECRET }), false);
    // Ditolak untuk kode slot masa depan
    const futureCode = generatePayoutCode('petani-1', slotStart + PAYOUT_CODE_STEP_MS + 2_000, SECRET).code;
    assert.equal(verifyPayoutCode('petani-1', futureCode, t0, { secret: SECRET }), false);
  });

  test('normalisasi input kode & tolak input tidak lengkap / kosong', () => {
    assert.equal(normalizePayoutCode(' 123 456 '), '123456');
    assert.equal(normalizePayoutCode('ab12-345678'), '123456');
    assert.equal(verifyPayoutCode('petani-1', '12345', 1_760_000_000_000, { secret: SECRET }), false);
    assert.equal(verifyPayoutCode('petani-1', '', 1_760_000_000_000, { secret: SECRET }), false);
    assert.equal(verifyPayoutCode('', '123456', 1_760_000_000_000, { secret: SECRET }), false);
  });
});
