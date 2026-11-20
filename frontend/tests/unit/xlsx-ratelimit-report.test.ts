import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildXlsx } from '@/lib/xlsx-writer';
import { checkRateLimit, enforceRateLimit, hitRateLimit } from '@/lib/rate-limit';
import { witaDate, witaRange } from '@/lib/finance-report';

describe('Pembuat file Excel', () => {
  test('menghasilkan zip .xlsx berisi sheet, teks ter-escape, dan angka asli', () => {
    const file = buildXlsx([
      { name: 'Ringkasan', rows: [['Uraian & <catatan>', { v: 13000, s: 'money' }]], widths: [30, 15] },
      { name: 'Buku Kas', rows: [['A']] },
    ]);
    const text = new TextDecoder().decode(file);
    assert.equal(text.slice(0, 2), 'PK');
    assert.ok(text.includes('name="Ringkasan"') && text.includes('name="Buku Kas"'));
    assert.ok(text.includes('Uraian &amp; &lt;catatan&gt;'));
    assert.ok(text.includes('<v>13000</v>'));
  });
});

describe('Rate limit (cadangan memori bila Redis mati)', () => {
  const rule = { name: `uji-${Date.now()}`, limit: 3, windowSec: 60 };

  test('memblokir setelah melewati batas', async () => {
    for (let i = 0; i < 3; i++) assert.equal((await hitRateLimit(rule, 'user@a')).allowed, true);
    assert.equal((await hitRateLimit(rule, 'user@a')).allowed, false);
    assert.equal((await hitRateLimit(rule, 'user@b')).allowed, true, 'pengguna lain tidak ikut terblokir');
    assert.equal((await checkRateLimit(rule, 'user@a')).allowed, false);
  });

  test('route mendapat respons 429 dengan Retry-After', async () => {
    const r2 = { name: `uji429-${Date.now()}`, limit: 1, windowSec: 60 };
    const req = new Request('http://localhost/api/x', { headers: { 'x-forwarded-for': '10.0.0.1' } });
    assert.equal(await enforceRateLimit(req, r2), null);
    const res = await enforceRateLimit(req, r2);
    assert.equal(res?.status, 429);
    assert.ok(Number(res?.headers.get('Retry-After')) > 0);
  });
});

describe('Rentang tanggal laporan (WITA)', () => {
  test('1 hari WITA = 16:00 UTC hari sebelumnya s/d 15:59 UTC', () => {
    const { start, end } = witaRange('2026-11-21', '2026-11-21');
    assert.equal(start.toISOString(), '2026-11-20T16:00:00.000Z');
    assert.equal(end.toISOString(), '2026-11-21T15:59:59.999Z');
    assert.equal(witaDate(new Date('2026-11-20T16:30:00Z')), '2026-11-21');
  });
});
