/**
 * Pindahkan data lama dari folder data/*.json ke PostgreSQL.
 * Aman dijalankan berulang kali: semua data di-upsert berdasarkan ID.
 *
 *   node scripts/migrate-json-to-db.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, '..', 'data');

function readJson(name, fallback) {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.warn(`  ! Gagal membaca ${name}:`, e.message);
    return fallback;
  }
}

const dateOnly = (s) => new Date(`${String(s).slice(0, 10)}T00:00:00.000Z`);
function addDays(s, n) {
  return new Date(dateOnly(s).getTime() + n * 86400000).toISOString().slice(0, 10);
}
function occupiedDays(satuan, durasi) {
  const d = Math.max(1, Math.floor(Number(durasi) || 1));
  const u = String(satuan || '').toLowerCase();
  if (u === 'hari') return d;
  if (u === 'minggu') return d * 7;
  if (u === 'bulan') return d * 30;
  return 1;
}

async function migrateCategories() {
  const product = readJson('categories.json', []);
  for (let i = 0; i < product.length; i++) {
    const c = product[i];
    const data = {
      name: c.name,
      slug: c.slug || c.name,
      emoji: c.emoji || null,
      imageUrl: c.imageUrl || null,
      description: c.description || null,
      mobileBg: c.mobileBg || null,
      isActive: c.isActive !== false,
      sortOrder: i,
    };
    await prisma.category.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  }
  console.log(`  ✓ Kategori produk: ${product.length}`);

  const equipment = readJson('equipment-categories.json', []);
  for (let i = 0; i < equipment.length; i++) {
    const c = equipment[i];
    const data = {
      name: c.name,
      slug: c.slug || c.name,
      emoji: c.emoji || null,
      imageUrl: c.imageUrl || null,
      description: c.description || null,
      isActive: c.isActive !== false,
      sortOrder: i,
    };
    await prisma.equipmentCategory.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  }
  console.log(`  ✓ Kategori alat: ${equipment.length}`);
}

async function migrateEquipments() {
  const list = readJson('equipments.json', []);
  for (const e of list) {
    const data = {
      nama: e.nama,
      kategori: e.kategori,
      deskripsi: e.deskripsi || null,
      spesifikasi: e.spesifikasi || null,
      hargaSewa: Number(e.hargaSewa) || 0,
      satuanSewa: e.satuanSewa || 'hari',
      biayaOperator: e.biayaOperator !== null && e.biayaOperator !== undefined ? Number(e.biayaOperator) : null,
      stokUnit: Number(e.stokUnit) || 1,
      kondisi: e.kondisi || 'Sangat Baik',
      imageUrl: e.imageUrl || null,
      isTersedia: e.isTersedia !== false,
      kontakPj: e.kontakPj || null,
    };
    // Data di database lebih baru (admin sudah menyimpan ke DB), jadi hanya buat jika belum ada
    await prisma.equipment.upsert({ where: { id: e.id }, create: { id: e.id, ...data }, update: {} });
  }
  console.log(`  ✓ Alat: ${list.length}`);
}

async function migrateRentals() {
  const list = readJson('equipment-rentals.json', []);
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const byId = new Map(users.map((u) => [u.id, u.id]));
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
  const equipmentIds = new Set((await prisma.equipment.findMany({ select: { id: true } })).map((e) => e.id));

  let ok = 0;
  for (const r of list) {
    const userId = byId.get(r.userId) || byEmail.get(String(r.userEmail || '').toLowerCase());
    if (!userId) {
      console.warn(`  ! Lewati sewa ${r.rentalCode}: pengguna ${r.userEmail} tidak ada di database`);
      continue;
    }
    const items = (r.items || []).filter((it) => equipmentIds.has(it.equipmentId));
    if (items.length === 0) {
      console.warn(`  ! Lewati sewa ${r.rentalCode}: alatnya tidak ada di database`);
      continue;
    }
    const itemRows = items.map((it) => {
      const end = addDays(r.startDate, occupiedDays(it.satuanSewa, it.durasi) - 1);
      return {
        equipmentId: it.equipmentId,
        nama: it.nama,
        kategori: it.kategori || '',
        hargaSewa: Number(it.hargaSewa) || 0,
        satuanSewa: it.satuanSewa || 'hari',
        jumlahUnit: Number(it.jumlahUnit) || 1,
        durasi: Number(it.durasi) || 1,
        includeOperator: Boolean(it.includeOperator),
        biayaOperator: it.biayaOperator !== null && it.biayaOperator !== undefined ? Number(it.biayaOperator) : null,
        subtotal: Number(it.subtotal) || 0,
        imageUrl: it.imageUrl || null,
        startDate: dateOnly(r.startDate),
        endDate: dateOnly(end),
      };
    });
    const endDate = itemRows.reduce((m, it) => (it.endDate > m ? it.endDate : m), dateOnly(r.startDate));

    const data = {
      rentalCode: r.rentalCode,
      userId,
      userName: r.userName || 'Anggota Koperasi',
      userEmail: r.userEmail,
      userPhone: r.userPhone || null,
      userRole: r.userRole || null,
      status: r.status,
      startDate: dateOnly(r.startDate),
      endDate,
      lokasiLahan: r.lokasiLahan || null,
      farmLat: r.farmLocationGps?.lat ?? null,
      farmLng: r.farmLocationGps?.lng ?? null,
      catatan: r.catatan || null,
      totalEstimasi: Number(r.totalEstimasi) || 0,
      paymentMethod: r.paymentMethod || 'CASH_KOPERASI',
      isPaid: Boolean(r.isPaid),
      paymentDeadline: r.paymentDeadline ? new Date(r.paymentDeadline) : null,
      paidAt: r.paidAt ? new Date(r.paidAt) : null,
      cashierName: r.cashierName || null,
      cashierNotes: r.cashierNotes || null,
      approvedAt: r.approvedAt ? new Date(r.approvedAt) : null,
      rejectedReason: r.rejectedReason || null,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
    };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.equipmentRental.findUnique({ where: { rentalCode: r.rentalCode } });
      if (existing) return; // sudah dimigrasi
      await tx.equipmentRental.create({ data: { id: r.id, ...data, items: { create: itemRows } } });
    });
    ok++;
  }
  console.log(`  ✓ Pengajuan sewa: ${ok} dari ${list.length}`);
}

async function migrateReviews() {
  const list = readJson('equipment-reviews.json', []);
  const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
  const equipmentIds = new Set((await prisma.equipment.findMany({ select: { id: true } })).map((e) => e.id));
  let ok = 0;
  for (const r of list) {
    if (!userIds.has(r.userId) || !equipmentIds.has(r.equipmentId)) {
      console.warn(`  ! Lewati ulasan ${r.id}: pengguna/alat tidak ditemukan`);
      continue;
    }
    await prisma.equipmentReview.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        equipmentId: r.equipmentId,
        userId: r.userId,
        rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
        komentar: r.komentar || null,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      },
      update: {},
    });
    ok++;
  }
  console.log(`  ✓ Ulasan alat: ${ok} dari ${list.length}`);
}

async function migrateSettings() {
  const settings = [
    ['partner_logos', readJson('partner-logos.json', null)],
    ['popular_searches', readJson('popular-searches.json', null)],
    ['warehouse_location', readJson('warehouse-location.json', null)],
  ];
  for (const [key, value] of settings) {
    if (value === null) continue;
    const existing = await prisma.appSetting.findUnique({ where: { key } });
    if (!existing) await prisma.appSetting.create({ data: { key, value } });
    console.log(`  ✓ Pengaturan ${key}${existing ? ' (sudah ada, dilewati)' : ''}`);
  }
}

async function main() {
  console.log('[Migrasi] Memindahkan data JSON ke PostgreSQL...');
  await migrateCategories();
  await migrateEquipments();
  await migrateRentals();
  await migrateReviews();
  await migrateSettings();
  console.log('[Migrasi] Selesai.');
}

main()
  .catch((e) => {
    console.error('[Migrasi] Gagal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
