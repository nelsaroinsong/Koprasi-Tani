import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { addDays, eachDate, todayWita, toDateOnly } from '@/lib/rental-schedule';

export type EquipmentRentalStatus =
  | 'MENUNGGU_PERSETUJUAN_ADMIN'
  | 'DISETUJUI'
  | 'DIKONFIRMASI'
  | 'SIAP_DIAMBIL'
  | 'SEDANG_DISEWA'
  | 'SELESAI'
  | 'DITOLAK'
  | 'DIBATALKAN'
  | 'KADALUARSA';

export interface EquipmentRentalOrderItem {
  equipmentId: string;
  nama: string;
  kategori: string;
  hargaSewa: number;
  satuanSewa: string;
  jumlahUnit: number;
  durasi: number;
  includeOperator: boolean;
  biayaOperator?: number | null;
  subtotal: number;
  imageUrl?: string | null;
  startDate?: string;
  endDate?: string;
}

export interface EquipmentRentalOrder {
  id: string;
  rentalCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userRole?: string;
  status: EquipmentRentalStatus;
  startDate: string;
  endDate?: string;
  lokasiLahan?: string;
  farmLocationGps?: { lat: number; lng: number } | null;
  catatan?: string;
  totalEstimasi: number;
  paymentMethod: string;
  isPaid: boolean;
  paymentDeadline?: string | null;
  paidAt?: string | null;
  cashierName?: string | null;
  cashierNotes?: string | null;
  items: EquipmentRentalOrderItem[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  // DP tunai di kasir
  dpAmount?: number | null;
  dpPaidAt?: string | null;
  dpForfeited?: boolean;
  dpRefundedAt?: string | null;
  // Serah terima, pengembalian, denda & kerusakan
  pickedUpAt?: string | null;
  returnedAt?: string | null;
  lateDays?: number;
  lateFee?: number;
  damageFee?: number;
  damageNotes?: string | null;
  inspections?: RentalInspection[];
  /** Hanya untuk admin: peringatan bentrok jadwal pada pengajuan yang menunggu */
  conflict?: PendingConflict | null;
}

export interface RentalInspection {
  id: string;
  type: 'SERAH_TERIMA' | 'PENGEMBALIAN';
  kondisi: string;
  jamMesin: number | null;
  bbmLevel: string | null;
  catatan: string | null;
  fotoUrls: string[];
  petugas: string | null;
  createdAt: string;
}

type Db = Prisma.TransactionClient | typeof prisma;

export const RENTAL_INCLUDE = {
  items: true,
  inspections: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.EquipmentRentalInclude;
type RentalRow = Prisma.EquipmentRentalGetPayload<{ include: typeof RENTAL_INCLUDE }>;

/** Ubah baris database menjadi bentuk data yang dipakai UI */
export function toRentalDTO(r: RentalRow): EquipmentRentalOrder {
  return {
    id: r.id,
    rentalCode: r.rentalCode,
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    userPhone: r.userPhone || '',
    userRole: r.userRole || undefined,
    status: r.status as EquipmentRentalStatus,
    startDate: toDateOnly(r.startDate),
    endDate: toDateOnly(r.endDate),
    lokasiLahan: r.lokasiLahan || '',
    farmLocationGps:
      r.farmLat !== null && r.farmLng !== null ? { lat: r.farmLat, lng: r.farmLng } : null,
    catatan: r.catatan || '',
    totalEstimasi: Number(r.totalEstimasi),
    paymentMethod: r.paymentMethod,
    isPaid: r.isPaid,
    paymentDeadline: r.paymentDeadline?.toISOString() || null,
    paidAt: r.paidAt?.toISOString() || null,
    cashierName: r.cashierName,
    cashierNotes: r.cashierNotes,
    approvedAt: r.approvedAt?.toISOString() || null,
    rejectedReason: r.rejectedReason,
    dpAmount: r.dpAmount !== null ? Number(r.dpAmount) : null,
    dpPaidAt: r.dpPaidAt?.toISOString() || null,
    dpForfeited: r.dpForfeited,
    dpRefundedAt: r.dpRefundedAt?.toISOString() || null,
    pickedUpAt: r.pickedUpAt?.toISOString() || null,
    returnedAt: r.returnedAt?.toISOString() || null,
    lateDays: r.lateDays,
    lateFee: Number(r.lateFee),
    damageFee: Number(r.damageFee),
    damageNotes: r.damageNotes,
    inspections: r.inspections.map((i) => ({
      id: i.id,
      type: i.type as RentalInspection['type'],
      kondisi: i.kondisi,
      jamMesin: i.jamMesin,
      bbmLevel: i.bbmLevel,
      catatan: i.catatan,
      fotoUrls: i.fotoUrls,
      petugas: i.petugas,
      createdAt: i.createdAt.toISOString(),
    })),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    items: r.items.map((it) => ({
      equipmentId: it.equipmentId,
      nama: it.nama,
      kategori: it.kategori,
      hargaSewa: Number(it.hargaSewa),
      satuanSewa: it.satuanSewa,
      jumlahUnit: it.jumlahUnit,
      durasi: it.durasi,
      includeOperator: it.includeOperator,
      biayaOperator: it.biayaOperator !== null ? Number(it.biayaOperator) : null,
      subtotal: Number(it.subtotal),
      imageUrl: it.imageUrl,
      startDate: toDateOnly(it.startDate),
      endDate: toDateOnly(it.endDate),
    })),
  };
}

/**
 * Pengajuan DISETUJUI yang belum membayar DP / lunas dan sudah lewat batas bayar -> KADALUARSA.
 * Dipanggil sebelum membaca data sewa / menghitung ketersediaan.
 */
export async function expireOverdueRentals(db: Db = prisma): Promise<number> {
  const res = await db.equipmentRental.updateMany({
    where: { status: 'DISETUJUI', isPaid: false, dpPaidAt: null, paymentDeadline: { lt: new Date() } },
    data: { status: 'KADALUARSA', rejectedReason: 'Melewati batas pembayaran DP di kasir koperasi' },
  });
  return res.count;
}

/**
 * Status yang mengunci unit pada tanggal sewanya:
 * - DISETUJUI      : selama batas bayar DP belum lewat (atau DP/lunas sudah dibayar)
 * - DIKONFIRMASI   : DP sudah dibayar
 * - SIAP_DIAMBIL   : sudah lunas
 * - SEDANG_DISEWA  : sedang dipakai; jika terlambat kembali tetap mengunci sampai dikembalikan
 * MENUNGGU_PERSETUJUAN_ADMIN belum mengunci apa pun.
 */
function blockingRentalWhere(now: Date): Prisma.EquipmentRentalWhereInput {
  return {
    OR: [
      { status: { in: ['DIKONFIRMASI', 'SIAP_DIAMBIL', 'SEDANG_DISEWA'] } },
      {
        status: 'DISETUJUI',
        OR: [
          { isPaid: true },
          { dpPaidAt: { not: null } },
          { paymentDeadline: null },
          { paymentDeadline: { gt: now } },
        ],
      },
    ],
  };
}

/** Jeda maksimum yang boleh diatur admin per alat */
export const MAX_JEDA_HARI = 7;

export function clampJeda(v: unknown): number {
  return Math.min(MAX_JEDA_HARI, Math.max(0, Math.floor(Number(v) || 0)));
}

/**
 * Rentang hari sebuah item mengunci unit: tanggal pemakaian + jeda pengecekan sesudahnya.
 * Unit yang terlambat dikembalikan (SEDANG_DISEWA lewat tanggal selesai) dianggap masih
 * terpakai sampai hari ini, ditambah jeda.
 */
function occupiedRange(start: string, end: string, jeda: number, status: string, today: string) {
  const realEnd = status === 'SEDANG_DISEWA' && end < today ? today : end;
  return { start, end: addDays(realEnd, jeda) };
}

interface DayUsage {
  units: number;
  rentalCodes: Set<string>;
  servis?: boolean;
}

/** Pemakaian unit (termasuk jeda) per alat per tanggal dalam rentang [from, to] */
async function loadUsagePerDay(
  db: Db,
  from: string,
  to: string,
  opts: { equipmentIds?: string[]; excludeRentalId?: string } = {}
): Promise<Record<string, Record<string, DayUsage>>> {
  const now = new Date();
  const today = todayWita(now);

  const items = await db.equipmentRentalItem.findMany({
    where: {
      ...(opts.equipmentIds ? { equipmentId: { in: opts.equipmentIds } } : {}),
      startDate: { lte: new Date(`${to}T00:00:00.000Z`) },
      rental: {
        AND: [
          blockingRentalWhere(now),
          ...(opts.excludeRentalId ? [{ id: { not: opts.excludeRentalId } }] : []),
        ],
      },
      OR: [
        // Sewa yang selesai beberapa hari sebelum `from` masih bisa mengunci lewat jedanya
        { endDate: { gte: new Date(`${addDays(from, -MAX_JEDA_HARI)}T00:00:00.000Z`) } },
        { rental: { status: 'SEDANG_DISEWA' } },
      ],
    },
    select: {
      equipmentId: true,
      jumlahUnit: true,
      startDate: true,
      endDate: true,
      equipment: { select: { jedaHari: true } },
      rental: { select: { status: true, rentalCode: true } },
    },
  });

  const perDay: Record<string, Record<string, DayUsage>> = {};
  for (const it of items) {
    const range = occupiedRange(
      toDateOnly(it.startDate),
      toDateOnly(it.endDate),
      clampJeda(it.equipment.jedaHari),
      it.rental.status,
      today
    );
    const start = range.start < from ? from : range.start;
    const end = range.end > to ? to : range.end;
    if (start > end) continue;
    const map = (perDay[it.equipmentId] ||= {});
    for (const day of eachDate(start, end)) {
      const u = (map[day] ||= { units: 0, rentalCodes: new Set() });
      u.units += it.jumlahUnit;
      u.rentalCodes.add(it.rental.rentalCode);
    }
  }

  // Blokir jadwal servis/perawatan
  const blocks = await db.equipmentMaintenance.findMany({
    where: {
      ...(opts.equipmentIds ? { equipmentId: { in: opts.equipmentIds } } : {}),
      startDate: { lte: new Date(`${to}T00:00:00.000Z`) },
      endDate: { gte: new Date(`${from}T00:00:00.000Z`) },
    },
    select: { equipmentId: true, jumlahUnit: true, startDate: true, endDate: true, alasan: true },
  });
  for (const bl of blocks) {
    const bStart = toDateOnly(bl.startDate);
    const bEnd = toDateOnly(bl.endDate);
    const start = bStart < from ? from : bStart;
    const end = bEnd > to ? to : bEnd;
    if (start > end) continue;
    const map = (perDay[bl.equipmentId] ||= {});
    for (const day of eachDate(start, end)) {
      const u = (map[day] ||= { units: 0, rentalCodes: new Set() });
      u.units += bl.jumlahUnit;
      u.rentalCodes.add(`SERVIS (${bl.alasan})`);
      u.servis = true;
    }
  }
  return perDay;
}

export interface DayAvailability {
  date: string;
  stokUnit: number;
  terpakai: number;
  sisa: number;
  servis: boolean;
}

/** Ketersediaan harian sebuah alat (untuk kalender), sudah termasuk jeda & servis */
export async function getDailyAvailability(
  equipmentId: string,
  from: string,
  to: string
): Promise<{ jedaHari: number; stokUnit: number; isTersedia: boolean; days: DayAvailability[] } | null> {
  const eq = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { stokUnit: true, isTersedia: true, jedaHari: true },
  });
  if (!eq) return null;
  const usage = (await loadUsagePerDay(prisma, from, to, { equipmentIds: [equipmentId] }))[equipmentId] || {};
  const days = eachDate(from, to).map((date) => {
    const terpakai = usage[date]?.units || 0;
    return {
      date,
      stokUnit: eq.stokUnit,
      terpakai,
      sisa: eq.isTersedia ? Math.max(0, eq.stokUnit - terpakai) : 0,
      servis: Boolean(usage[date]?.servis),
    };
  });
  return { jedaHari: clampJeda(eq.jedaHari), stokUnit: eq.stokUnit, isTersedia: eq.isTersedia, days };
}

/** Jumlah unit maksimum yang terpakai per alat pada satu hari mana pun dalam rentang [from, to] */
export async function getUnitsInUse(
  from: string,
  to: string,
  opts: { equipmentIds?: string[]; excludeRentalId?: string; db?: Db } = {}
): Promise<Record<string, number>> {
  const perDay = await loadUsagePerDay(opts.db || prisma, from, to, opts);
  const result: Record<string, number> = {};
  for (const [eqId, days] of Object.entries(perDay)) {
    result[eqId] = Math.max(0, ...Object.values(days).map((d) => d.units));
  }
  return result;
}

/** Unit yang terpakai HARI INI per alat, termasuk unit yang sedang dalam jeda pengecekan (untuk katalog) */
export async function getActiveRentedUnitsMap(): Promise<Record<string, number>> {
  const today = todayWita();
  return getUnitsInUse(today, today);
}

export class RentalConflictError extends Error {}

export interface RequestedUnit {
  equipmentId: string;
  nama: string;
  jumlahUnit: number;
  startDate: string;
  endDate: string;
}

interface EquipmentStock {
  nama: string;
  stokUnit: number;
  isTersedia: boolean;
  jedaHari: number;
}

interface AvailabilityProblem {
  blockedBy: string[];
  message: string;
}

/** Cari hari pertama yang kekurangan unit (tanpa mengunci). null jika semua cukup. */
async function findAvailabilityProblem(
  db: Db,
  equipments: Map<string, EquipmentStock>,
  requested: RequestedUnit[],
  excludeRentalId?: string,
  withJeda = true
): Promise<AvailabilityProblem | null> {
  const ids = [...new Set(requested.map((r) => r.equipmentId))];

  for (const eqId of ids) {
    const eq = equipments.get(eqId);
    const reqs = requested.filter((r) => r.equipmentId === eqId);
    const name = eq?.nama || reqs[0].nama;
    if (!eq) return { blockedBy: [], message: `Alat "${name}" sudah tidak tersedia di katalog.` };
    if (!eq.isTersedia) return { blockedBy: [], message: `Alat "${name}" sedang tidak disewakan.` };

    const jeda = withJeda ? clampJeda(eq.jedaHari) : 0;
    // Permintaan baru juga butuh jeda sesudahnya agar tidak menabrak sewa berikutnya
    const ranges = reqs.map((r) => ({ ...r, endDate: addDays(r.endDate, jeda) }));
    const from = ranges.reduce((m, r) => (r.startDate < m ? r.startDate : m), ranges[0].startDate);
    const to = ranges.reduce((m, r) => (r.endDate > m ? r.endDate : m), ranges[0].endDate);
    const usedPerDay =
      (await loadUsagePerDay(db, from, to, { equipmentIds: [eqId], excludeRentalId }))[eqId] || {};

    for (const day of eachDate(from, to)) {
      const asked = ranges
        .filter((r) => r.startDate <= day && r.endDate >= day)
        .reduce((sum, r) => sum + r.jumlahUnit, 0);
      if (asked === 0) continue;
      const used = usedPerDay[day]?.units || 0;
      if (used + asked > eq.stokUnit) {
        const sisa = Math.max(0, eq.stokUnit - used);
        const blockedBy = [...(usedPerDay[day]?.rentalCodes || [])];
        const jedaInfo =
          jeda > 0 ? ` (sudah termasuk jeda ${jeda} hari untuk pengembalian & pengecekan unit)` : '';
        const byInfo = blockedBy.length
          ? `, terpakai oleh ${blockedBy.map((c) => (c.startsWith('SERVIS') ? c : `#${c}`)).join(', ')}`
          : '';
        return {
          blockedBy,
          message: `Unit "${name}" pada tanggal ${day} hanya tersisa ${sisa} dari ${eq.stokUnit} unit${jedaInfo}${byInfo}. Pilih tanggal lain atau kurangi jumlah unit.`,
        };
      }
    }
  }
  return null;
}

/**
 * Pastikan unit cukup untuk setiap hari dalam jadwal yang diminta (termasuk jeda).
 * Jalankan di dalam transaksi: baris alat dikunci (FOR UPDATE) agar dua persetujuan
 * bersamaan tidak bisa memesan unit terakhir yang sama.
 */
export async function assertAvailability(
  tx: Prisma.TransactionClient,
  requested: RequestedUnit[],
  excludeRentalId?: string,
  opts: { withJeda?: boolean } = {}
): Promise<void> {
  if (requested.length === 0) return;
  const ids = [...new Set(requested.map((r) => r.equipmentId))];

  const locked = await tx.$queryRaw<
    { id: string; nama: string; stokUnit: number; isTersedia: boolean; jedaHari: number }[]
  >`
    SELECT id, nama, "stokUnit", "isTersedia", "jedaHari" FROM equipments
    WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;

  const problem = await findAvailabilityProblem(
    tx,
    new Map(locked.map((e) => [e.id, e])),
    requested,
    excludeRentalId,
    opts.withJeda ?? true
  );
  if (problem) throw new RentalConflictError(problem.message);
}

export interface PendingConflict {
  /** Tidak bisa disetujui karena bentrok dengan sewa yang sudah disetujui/lunas */
  blocked: boolean;
  message?: string;
  blockedBy: string[];
  /** Pengajuan lain yang masih menunggu dan memperebutkan unit di tanggal yang sama */
  competingWith: string[];
}

function toRequested(r: EquipmentRentalOrder): RequestedUnit[] {
  return r.items.map((it) => ({
    equipmentId: it.equipmentId,
    nama: it.nama,
    jumlahUnit: it.jumlahUnit,
    startDate: it.startDate || r.startDate,
    endDate: it.endDate || r.endDate || r.startDate,
  }));
}

/** Analisis bentrok untuk pengajuan yang masih menunggu persetujuan (peringatan di admin) */
export async function getPendingConflicts(
  rentals: EquipmentRentalOrder[]
): Promise<Record<string, PendingConflict>> {
  const pending = rentals.filter((r) => r.status === 'MENUNGGU_PERSETUJUAN_ADMIN');
  if (pending.length === 0) return {};

  const eqIds = [...new Set(pending.flatMap((r) => r.items.map((it) => it.equipmentId)))];
  const equipments = await prisma.equipment.findMany({
    where: { id: { in: eqIds } },
    select: { id: true, nama: true, stokUnit: true, isTersedia: true, jedaHari: true },
  });
  const eqMap = new Map(equipments.map((e) => [e.id, e]));

  const result: Record<string, PendingConflict> = {};
  for (const r of pending) {
    const mine = toRequested(r);
    const problem = await findAvailabilityProblem(prisma, eqMap, mine, r.id);

    // Pengajuan menunggu lain yang, jika keduanya disetujui, melebihi stok pada hari yang sama
    const competingWith = pending
      .filter((other) => other.id !== r.id)
      .filter((other) =>
        mine.some((a) =>
          toRequested(other).some((b) => {
            if (a.equipmentId !== b.equipmentId) return false;
            const eq = eqMap.get(a.equipmentId);
            const jeda = clampJeda(eq?.jedaHari);
            const intersects =
              a.startDate <= addDays(b.endDate, jeda) && b.startDate <= addDays(a.endDate, jeda);
            return intersects && a.jumlahUnit + b.jumlahUnit > (eq?.stokUnit || 0);
          })
        )
      )
      .map((other) => other.rentalCode);

    if (problem || competingWith.length > 0) {
      result[r.id] = {
        blocked: Boolean(problem),
        message: problem?.message,
        blockedBy: problem?.blockedBy || [],
        competingWith,
      };
    }
  }
  return result;
}

/** Alur status sewa yang sah (admin) */
export const RENTAL_TRANSITIONS: Record<EquipmentRentalStatus, EquipmentRentalStatus[]> = {
  MENUNGGU_PERSETUJUAN_ADMIN: ['DISETUJUI', 'DITOLAK', 'DIBATALKAN'],
  DISETUJUI: ['DIKONFIRMASI', 'SIAP_DIAMBIL', 'DITOLAK', 'DIBATALKAN', 'KADALUARSA'],
  DIKONFIRMASI: ['SIAP_DIAMBIL', 'SEDANG_DISEWA', 'DIBATALKAN'],
  SIAP_DIAMBIL: ['SEDANG_DISEWA', 'DIBATALKAN'],
  SEDANG_DISEWA: ['SELESAI'],
  SELESAI: [],
  DITOLAK: ['MENUNGGU_PERSETUJUAN_ADMIN'],
  DIBATALKAN: ['MENUNGGU_PERSETUJUAN_ADMIN'],
  KADALUARSA: ['MENUNGGU_PERSETUJUAN_ADMIN'],
};
