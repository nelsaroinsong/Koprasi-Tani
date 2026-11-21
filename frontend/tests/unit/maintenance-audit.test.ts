import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAINTENANCE_CONFIG,
  evaluateMaintenance,
  isoToWitaInput,
  witaInputToIso,
  type MaintenanceConfig,
} from '@/lib/maintenance';
import {
  createAdminBypassToken,
  verifyAdminBypassToken,
} from '@/lib/maintenance-bypass';
import {
  formatAuditAction,
  formatAuditDetails,
  formatAuditSummary,
} from '@/lib/audit-log-format';

function makeConfig(overrides: Partial<MaintenanceConfig> = {}): MaintenanceConfig {
  return {
    ...DEFAULT_MAINTENANCE_CONFIG,
    recurring: { ...DEFAULT_MAINTENANCE_CONFIG.recurring },
    ...overrides,
  };
}

describe('Mode Pemeliharaan Sistem (evaluateMaintenance)', () => {
  it('status normal bila tidak ada jadwal dan sakelar darurat mati', () => {
    const res = evaluateMaintenance(makeConfig(), new Date('2026-11-22T02:00:00+08:00'));
    assert.equal(res.phase, 'NORMAL');
    assert.equal(res.isMaintenance, false);
    assert.equal(res.isAnnouncement, false);
  });

  it('sakelar darurat langsung mengaktifkan mode pemeliharaan', () => {
    const res = evaluateMaintenance(
      makeConfig({ forceEnabled: true }),
      new Date('2026-11-22T02:00:00+08:00')
    );
    assert.equal(res.phase, 'MAINTENANCE');
    assert.equal(res.isMaintenance, true);
    assert.equal(res.source, 'FORCE');
    assert.ok(res.retryAfterSeconds >= 60);
  });

  it('jadwal sekali jalan: pengumuman sebelum mulai, aktif saat rentang, normal sesudah selesai', () => {
    const cfg = makeConfig({
      startAt: '2026-11-25T22:00:00+08:00',
      endAt: '2026-11-26T00:00:00+08:00',
      noticeHoursBefore: 12,
    });

    // 20 jam sebelum mulai -> masih normal tapi punya upcomingWindow
    const early = evaluateMaintenance(cfg, new Date('2026-11-25T02:00:00+08:00'));
    assert.equal(early.phase, 'NORMAL');
    assert.ok(early.upcomingWindow);

    // 4 jam sebelum mulai -> banner pengumuman aktif
    const announce = evaluateMaintenance(cfg, new Date('2026-11-25T18:00:00+08:00'));
    assert.equal(announce.phase, 'ANNOUNCEMENT');
    assert.equal(announce.isAnnouncement, true);
    assert.equal(announce.isMaintenance, false);

    // Tepat di dalam jendela -> maintenance aktif
    const active = evaluateMaintenance(cfg, new Date('2026-11-25T23:00:00+08:00'));
    assert.equal(active.phase, 'MAINTENANCE');
    assert.equal(active.isMaintenance, true);
    assert.equal(active.source, 'SCHEDULED');
    assert.equal(active.retryAfterSeconds, 3600);

    // Lewat jam selesai -> otomatis normal kembali
    const after = evaluateMaintenance(cfg, new Date('2026-11-26T00:05:00+08:00'));
    assert.equal(after.phase, 'NORMAL');
    assert.equal(after.isMaintenance, false);
  });

  it('jadwal rutin mingguan WITA (termasuk lintas tengah malam)', () => {
    // Sabtu (6) 23:00 -> Minggu (0) 01:00 WITA
    const cfg = makeConfig({
      noticeHoursBefore: 6,
      recurring: {
        enabled: true,
        dayOfWeek: 6,
        startTime: '23:00',
        endTime: '01:00',
      },
    });

    // 2026-11-21 adalah hari Sabtu. Jam 20:00 WITA -> 3 jam sebelum mulai -> ANNOUNCEMENT
    const announce = evaluateMaintenance(cfg, new Date('2026-11-21T20:00:00+08:00'));
    assert.equal(announce.phase, 'ANNOUNCEMENT');
    assert.equal(announce.source, 'RECURRING');

    // Minggu 00:30 WITA -> masih di dalam jendela lintas tengah malam -> MAINTENANCE
    const activeAfterMidnight = evaluateMaintenance(cfg, new Date('2026-11-22T00:30:00+08:00'));
    assert.equal(activeAfterMidnight.phase, 'MAINTENANCE');
    assert.equal(activeAfterMidnight.source, 'RECURRING');
    assert.equal(activeAfterMidnight.retryAfterSeconds, 1800);

    // Minggu 01:05 WITA -> sudah normal
    const afterDone = evaluateMaintenance(cfg, new Date('2026-11-22T01:05:00+08:00'));
    assert.equal(afterDone.phase, 'NORMAL');
  });

  it('konversi input datetime-local WITA bolak-balik akurat', () => {
    const iso = witaInputToIso('2026-11-25T22:30');
    assert.equal(iso, '2026-11-25T14:30:00.000Z');
    assert.equal(isoToWitaInput(iso), '2026-11-25T22:30');
  });

  it('token bypass admin HMAC valid dan menolak token palsu / kedaluwarsa', async () => {
    const now = Date.now();
    const token = await createAdminBypassToken(now);
    assert.equal(await verifyAdminBypassToken(token, now + 1000), true);
    assert.equal(await verifyAdminBypassToken(`${token}tampered`, now + 1000), false);
    assert.equal(await verifyAdminBypassToken(token, now + 24 * 60 * 60 * 1000), false);
    assert.equal(await verifyAdminBypassToken('admin.9999999999.fakesig', now), false);
  });
});

describe('Format Log Aktivitas Admin ramah pengguna', () => {
  it('menerjemahkan kode aksi dan status enum di ringkasan', () => {
    assert.equal(formatAuditAction('ORDER_STATUS'), 'Status Pesanan');
    assert.equal(formatAuditAction('SETTINGS_MAINTENANCE'), 'Pemeliharaan Sistem');
    assert.equal(
      formatAuditSummary('Status pesanan #KOP-1: SIAP_DIAMBIL → SELESAI'),
      'Status pesanan #KOP-1: Siap Diambil → Selesai'
    );
  });

  it('mengubah detail transaksi menjadi baris Indonesia rapi tanpa JSON mentah', () => {
    const rows = formatAuditDetails({
      from: 'SIAP_DIAMBIL',
      to: 'SELESAI',
      totalAmount: 5000,
      pickupCodeVerified: true,
    });
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[0].transition, { from: 'Siap Diambil', to: 'Selesai' });
    assert.equal(rows[1].label, 'Total Transaksi');
    assert.equal(rows[1].value, 'Rp 5.000');
    assert.equal(rows[2].label, 'Verifikasi Kode Ambil');
    assert.equal(rows[2].value, 'Terverifikasi dengan kode');
  });

  it('memformat daftar field yang diubah & perbandingan produk before/after', () => {
    const userRows = formatAuditDetails({ fields: ['name', 'isActive', 'phone'] });
    assert.deepEqual(userRows[0].chips, ['Nama Lengkap', 'Status Aktif', 'Nomor Telepon']);

    const prodRows = formatAuditDetails({
      before: { hargaPerSatuan: 12000, stok: 10 },
      after: { hargaPerSatuan: 15000, stok: 10 },
    });
    assert.equal(prodRows.length, 1);
    assert.equal(prodRows[0].label, 'Harga Satuan');
    assert.deepEqual(prodRows[0].transition, { from: 'Rp 12.000', to: 'Rp 15.000' });
  });
});
