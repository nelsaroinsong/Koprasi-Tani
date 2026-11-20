import { prisma } from '@/lib/prisma';
import { delCachePattern } from '@/lib/redis';
import { logAudit, type AuditActor } from '@/lib/audit-log';

/**
 * Pengganti hapus permanen: transaksi tidak pernah dihapus dari database
 * (laporan penjualan, bagi hasil petani & DP tetap utuh), hanya disembunyikan dari daftar admin.
 * Hanya transaksi yang sudah final yang boleh diarsipkan; transaksi aktif harus dibatalkan dulu.
 */

const ORDER_FINAL = ['SELESAI', 'DIBATALKAN'];
const RENTAL_FINAL = ['SELESAI', 'DITOLAK', 'DIBATALKAN', 'KADALUARSA'];

export interface ArchiveResult {
  archived: string[]; // label, mis. "#KOP-..."
  skipped: { label: string; reason: string }[];
}

export async function archiveOrders(ids: string[], actor: AuditActor | null): Promise<ArchiveResult> {
  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, orderNumber: true, status: true, archivedAt: true, totalAmount: true },
  });
  const result: ArchiveResult = { archived: [], skipped: [] };
  const toArchive: string[] = [];

  for (const o of orders) {
    const label = `#${o.orderNumber}`;
    if (o.archivedAt) continue;
    if (!ORDER_FINAL.includes(o.status)) {
      result.skipped.push({ label, reason: 'masih aktif — batalkan atau selesaikan dulu' });
      continue;
    }
    toArchive.push(o.id);
    result.archived.push(label);
  }

  if (toArchive.length > 0) {
    await prisma.order.updateMany({ where: { id: { in: toArchive }, archivedAt: null }, data: { archivedAt: new Date() } });
    await delCachePattern('admin:orders:*').catch(() => {});
    for (const o of orders.filter((x) => toArchive.includes(x.id))) {
      await logAudit({
        actor,
        action: 'ORDER_ARCHIVE',
        entityType: 'ORDER',
        entityId: o.id,
        entityLabel: `#${o.orderNumber}`,
        summary: `Mengarsipkan pesanan #${o.orderNumber} (${o.status})`,
        details: { status: o.status, totalAmount: Number(o.totalAmount) },
      });
    }
  }
  return result;
}

export async function archiveRentals(ids: string[], actor: AuditActor | null): Promise<ArchiveResult> {
  const rentals = await prisma.equipmentRental.findMany({
    where: { id: { in: ids } },
    select: { id: true, rentalCode: true, status: true, archivedAt: true, totalEstimasi: true, userName: true },
  });
  const result: ArchiveResult = { archived: [], skipped: [] };
  const toArchive: string[] = [];

  for (const r of rentals) {
    const label = `#${r.rentalCode}`;
    if (r.archivedAt) continue;
    if (!RENTAL_FINAL.includes(r.status)) {
      result.skipped.push({ label, reason: 'masih aktif — tolak/batalkan atau selesaikan dulu' });
      continue;
    }
    toArchive.push(r.id);
    result.archived.push(label);
  }

  if (toArchive.length > 0) {
    await prisma.equipmentRental.updateMany({
      where: { id: { in: toArchive }, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    await delCachePattern('admin:equipment-rentals:*').catch(() => {});
    for (const r of rentals.filter((x) => toArchive.includes(x.id))) {
      await logAudit({
        actor,
        action: 'RENTAL_ARCHIVE',
        entityType: 'RENTAL',
        entityId: r.id,
        entityLabel: `#${r.rentalCode}`,
        summary: `Mengarsipkan sewa #${r.rentalCode} (${r.status}) — ${r.userName}`,
        details: { status: r.status, totalEstimasi: Number(r.totalEstimasi) },
      });
    }
  }
  return result;
}

/** Pesan ringkas untuk admin */
export function archiveMessage(kind: 'pesanan' | 'sewa', r: ArchiveResult) {
  const parts: string[] = [];
  if (r.archived.length) parts.push(`${r.archived.length} ${kind} diarsipkan`);
  if (r.skipped.length) {
    parts.push(`${r.skipped.length} dilewati (${r.skipped.map((s) => s.label).join(', ')}: ${r.skipped[0].reason})`);
  }
  return parts.join('. ') || `Tidak ada ${kind} yang diarsipkan.`;
}

/** Kembalikan pesanan dari arsip ke daftar admin */
export async function unarchiveOrders(ids: string[], actor: AuditActor | null): Promise<string[]> {
  const orders = await prisma.order.findMany({
    where: { id: { in: ids }, archivedAt: { not: null } },
    select: { id: true, orderNumber: true },
  });
  if (orders.length === 0) return [];
  await prisma.order.updateMany({ where: { id: { in: orders.map((o) => o.id) } }, data: { archivedAt: null } });
  await delCachePattern('admin:orders:*').catch(() => {});
  for (const o of orders) {
    await logAudit({
      actor,
      action: 'ORDER_UNARCHIVE',
      entityType: 'ORDER',
      entityId: o.id,
      entityLabel: `#${o.orderNumber}`,
      summary: `Memulihkan pesanan #${o.orderNumber} dari arsip`,
    });
  }
  return orders.map((o) => `#${o.orderNumber}`);
}

/** Kembalikan sewa dari arsip ke daftar admin */
export async function unarchiveRentals(ids: string[], actor: AuditActor | null): Promise<string[]> {
  const rentals = await prisma.equipmentRental.findMany({
    where: { id: { in: ids }, archivedAt: { not: null } },
    select: { id: true, rentalCode: true },
  });
  if (rentals.length === 0) return [];
  await prisma.equipmentRental.updateMany({ where: { id: { in: rentals.map((r) => r.id) } }, data: { archivedAt: null } });
  for (const r of rentals) {
    await logAudit({
      actor,
      action: 'RENTAL_UNARCHIVE',
      entityType: 'RENTAL',
      entityId: r.id,
      entityLabel: `#${r.rentalCode}`,
      summary: `Memulihkan sewa #${r.rentalCode} dari arsip`,
    });
  }
  return rentals.map((r) => `#${r.rentalCode}`);
}
