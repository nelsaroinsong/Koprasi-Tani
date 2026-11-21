/**
 * Logika inti Mode Pemeliharaan Sistem (murni, tanpa ketergantungan DB/Node).
 * Aman dipakai di Edge Middleware, Server Components, API Route, dan Client.
 * Seluruh jadwal dievaluasi dalam zona waktu WITA (UTC+8 / Asia/Makassar).
 */

export const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface RecurringMaintenanceRule {
  enabled: boolean;
  /** 0 = Minggu, 1 = Senin, ..., 6 = Sabtu (WITA) */
  dayOfWeek: number;
  /** Format 24 jam "HH:mm" (WITA) */
  startTime: string;
  /** Format 24 jam "HH:mm" (WITA). Jika <= startTime, dianggap melewati tengah malam ke hari berikutnya */
  endTime: string;
}

export interface MaintenanceConfig {
  /** Sakelar darurat: aktifkan mode pemeliharaan seketika tanpa menunggu jadwal */
  forceEnabled: boolean;
  /** Jadwal sekali jalan (ISO timestamp, misal "2026-11-25T22:00:00+08:00") */
  startAt: string | null;
  endAt: string | null;
  /** Jadwal rutin mingguan opsional (WITA) */
  recurring: RecurringMaintenanceRule;
  /** Berapa jam sebelum jadwal dimulai banner notifikasi muncul di web (0 = tidak pakai banner) */
  noticeHoursBefore: number;
  /** Judul pemberitahuan di banner & halaman pemeliharaan */
  title: string;
  /** Pesan penjelasan yang dibaca pengguna */
  message: string;
  /** Kontak bantuan opsional (mis. nomor WhatsApp / telepon koperasi) */
  contactInfo: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type MaintenancePhase = 'NORMAL' | 'ANNOUNCEMENT' | 'MAINTENANCE';
export type MaintenanceSource = 'FORCE' | 'SCHEDULED' | 'RECURRING' | null;

export interface MaintenanceWindow {
  startAt: string | null;
  endAt: string | null;
}

export interface MaintenanceEvaluation {
  phase: MaintenancePhase;
  isMaintenance: boolean;
  isAnnouncement: boolean;
  source: MaintenanceSource;
  activeWindow: MaintenanceWindow | null;
  upcomingWindow: { startAt: string; endAt: string; source: 'SCHEDULED' | 'RECURRING' } | null;
  retryAfterSeconds: number;
  title: string;
  message: string;
  contactInfo: string;
  evaluatedAt: string;
}

export const DAY_OF_WEEK_LABELS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  forceEnabled: false,
  startAt: null,
  endAt: null,
  recurring: {
    enabled: false,
    dayOfWeek: 0, // Minggu
    startTime: '01:00',
    endTime: '02:00',
  },
  noticeHoursBefore: 12,
  title: 'Pemeliharaan Sistem Terjadwal',
  message:
    'Kami sedang melakukan pembaruan dan perawatan server agar layanan transaksi serta sewa alat Koperasi Sinar Pagi Sejahtera tetap cepat dan aman.',
  contactInfo: '',
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTimeMinutes(hhmm: string): number | null {
  const m = TIME_RE.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function parseIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Normalisasi input mentah (dari DB atau API) menjadi MaintenanceConfig yang aman */
export function normalizeMaintenanceConfig(raw: unknown): MaintenanceConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const recRaw =
    obj.recurring && typeof obj.recurring === 'object'
      ? (obj.recurring as Record<string, unknown>)
      : {};

  const day = Number(recRaw.dayOfWeek);
  const startTime =
    typeof recRaw.startTime === 'string' && TIME_RE.test(recRaw.startTime.trim())
      ? recRaw.startTime.trim()
      : DEFAULT_MAINTENANCE_CONFIG.recurring.startTime;
  const endTime =
    typeof recRaw.endTime === 'string' && TIME_RE.test(recRaw.endTime.trim())
      ? recRaw.endTime.trim()
      : DEFAULT_MAINTENANCE_CONFIG.recurring.endTime;

  const noticeRaw = Number(obj.noticeHoursBefore);
  const noticeHoursBefore = Number.isFinite(noticeRaw)
    ? Math.max(0, Math.min(168, Math.round(noticeRaw)))
    : DEFAULT_MAINTENANCE_CONFIG.noticeHoursBefore;

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim().slice(0, 120)
      : DEFAULT_MAINTENANCE_CONFIG.title;

  const message =
    typeof obj.message === 'string' && obj.message.trim()
      ? obj.message.trim().slice(0, 600)
      : DEFAULT_MAINTENANCE_CONFIG.message;

  const contactInfo =
    typeof obj.contactInfo === 'string' ? obj.contactInfo.trim().slice(0, 160) : '';

  return {
    forceEnabled: Boolean(obj.forceEnabled),
    startAt: parseIsoOrNull(obj.startAt),
    endAt: parseIsoOrNull(obj.endAt),
    recurring: {
      enabled: Boolean(recRaw.enabled),
      dayOfWeek: Number.isInteger(day) && day >= 0 && day <= 6 ? day : 0,
      startTime,
      endTime,
    },
    noticeHoursBefore,
    title,
    message,
    contactInfo,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
    updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
  };
}

/**
 * Menghitung jendela waktu rutin mingguan (WITA) yang sedang aktif atau paling dekat berikutnya.
 * Mendukung jadwal yang melewati tengah malam (mis. Sabtu 23:00 -> Minggu 01:00 WITA).
 */
function computeRecurringWindows(
  rule: RecurringMaintenanceRule,
  now: Date
): { active: { start: Date; end: Date } | null; next: { start: Date; end: Date } | null } {
  if (!rule.enabled) return { active: null, next: null };
  const startMin = parseTimeMinutes(rule.startTime);
  const endMin = parseTimeMinutes(rule.endTime);
  if (startMin === null || endMin === null || startMin === endMin) {
    return { active: null, next: null };
  }

  const durationMin = endMin > startMin ? endMin - startMin : 24 * 60 - startMin + endMin;

  // Geser timestamp ke jam dinding WITA agar perhitungan hari & tanggal murni di UTC
  const witaNowMs = now.getTime() + WITA_OFFSET_MS;
  const witaNow = new Date(witaNowMs);
  const currentDay = witaNow.getUTCDay();
  const witaMidnightMs = Date.UTC(
    witaNow.getUTCFullYear(),
    witaNow.getUTCMonth(),
    witaNow.getUTCDate()
  );

  // Periksa jendela minggu lalu (-7), minggu ini (0), dan minggu depan (+7) relatif terhadap hari target
  const deltaToTarget = rule.dayOfWeek - currentDay;
  const candidates: { start: Date; end: Date }[] = [];
  for (const weekOffset of [-7, 0, 7]) {
    const startWitaMs = witaMidnightMs + (deltaToTarget + weekOffset) * 86_400_000 + startMin * 60_000;
    const endWitaMs = startWitaMs + durationMin * 60_000;
    candidates.push({
      start: new Date(startWitaMs - WITA_OFFSET_MS),
      end: new Date(endWitaMs - WITA_OFFSET_MS),
    });
  }

  const nowMs = now.getTime();
  let active: { start: Date; end: Date } | null = null;
  let next: { start: Date; end: Date } | null = null;

  for (const c of candidates) {
    if (c.start.getTime() <= nowMs && nowMs < c.end.getTime()) {
      active = c;
    } else if (c.start.getTime() > nowMs) {
      if (!next || c.start.getTime() < next.start.getTime()) {
        next = c;
      }
    }
  }

  return { active, next };
}

/**
 * Evaluasi status pemeliharaan pada waktu `now`.
 * Prioritas:
 * 1. Sakelar darurat (`forceEnabled`)
 * 2. Jadwal sekali jalan (`startAt <= now < endAt`)
 * 3. Jadwal rutin mingguan WITA
 * 4. Pengumuman pra-pemeliharaan (`now` dalam `noticeHoursBefore` sebelum jadwal terdekat)
 */
export function evaluateMaintenance(
  rawConfig: MaintenanceConfig | null | undefined,
  now: Date = new Date()
): MaintenanceEvaluation {
  const config = normalizeMaintenanceConfig(rawConfig || DEFAULT_MAINTENANCE_CONFIG);
  const nowMs = now.getTime();

  const schedStart = config.startAt ? new Date(config.startAt) : null;
  const schedEnd = config.endAt ? new Date(config.endAt) : null;
  const validScheduled =
    schedStart &&
    schedEnd &&
    !Number.isNaN(schedStart.getTime()) &&
    !Number.isNaN(schedEnd.getTime()) &&
    schedEnd.getTime() > schedStart.getTime();

  const recurring = computeRecurringWindows(config.recurring, now);

  // Kumpulkan kandidat jadwal terdekat di masa depan
  const upcomingCandidates: { start: Date; end: Date; source: 'SCHEDULED' | 'RECURRING' }[] = [];
  if (validScheduled && schedStart!.getTime() > nowMs) {
    upcomingCandidates.push({ start: schedStart!, end: schedEnd!, source: 'SCHEDULED' });
  }
  if (recurring.next) {
    upcomingCandidates.push({ ...recurring.next, source: 'RECURRING' });
  }
  upcomingCandidates.sort((a, b) => a.start.getTime() - b.start.getTime());
  const earliestUpcoming = upcomingCandidates[0] || null;

  // 1. Sakelar Darurat (Paksa Aktif)
  if (config.forceEnabled) {
    const endMs = validScheduled && schedEnd!.getTime() > nowMs ? schedEnd!.getTime() : null;
    const retryAfterSeconds = endMs ? Math.max(60, Math.ceil((endMs - nowMs) / 1000)) : 1800;
    return {
      phase: 'MAINTENANCE',
      isMaintenance: true,
      isAnnouncement: false,
      source: 'FORCE',
      activeWindow: {
        startAt: config.updatedAt || now.toISOString(),
        endAt: endMs ? schedEnd!.toISOString() : null,
      },
      upcomingWindow: null,
      retryAfterSeconds,
      title: config.title,
      message: config.message,
      contactInfo: config.contactInfo,
      evaluatedAt: now.toISOString(),
    };
  }

  // 2. Jadwal Sekali Jalan sedang aktif
  if (validScheduled && schedStart!.getTime() <= nowMs && nowMs < schedEnd!.getTime()) {
    return {
      phase: 'MAINTENANCE',
      isMaintenance: true,
      isAnnouncement: false,
      source: 'SCHEDULED',
      activeWindow: {
        startAt: schedStart!.toISOString(),
        endAt: schedEnd!.toISOString(),
      },
      upcomingWindow: null,
      retryAfterSeconds: Math.max(30, Math.ceil((schedEnd!.getTime() - nowMs) / 1000)),
      title: config.title,
      message: config.message,
      contactInfo: config.contactInfo,
      evaluatedAt: now.toISOString(),
    };
  }

  // 3. Jadwal Rutin Mingguan sedang aktif
  if (recurring.active) {
    return {
      phase: 'MAINTENANCE',
      isMaintenance: true,
      isAnnouncement: false,
      source: 'RECURRING',
      activeWindow: {
        startAt: recurring.active.start.toISOString(),
        endAt: recurring.active.end.toISOString(),
      },
      upcomingWindow: null,
      retryAfterSeconds: Math.max(30, Math.ceil((recurring.active.end.getTime() - nowMs) / 1000)),
      title: config.title,
      message: config.message,
      contactInfo: config.contactInfo,
      evaluatedAt: now.toISOString(),
    };
  }

  // 4. Fase Pengumuman Pra-Pemeliharaan
  if (earliestUpcoming && config.noticeHoursBefore > 0) {
    const noticeLeadMs = config.noticeHoursBefore * 60 * 60 * 1000;
    if (earliestUpcoming.start.getTime() - nowMs <= noticeLeadMs) {
      return {
        phase: 'ANNOUNCEMENT',
        isMaintenance: false,
        isAnnouncement: true,
        source: earliestUpcoming.source,
        activeWindow: null,
        upcomingWindow: {
          startAt: earliestUpcoming.start.toISOString(),
          endAt: earliestUpcoming.end.toISOString(),
          source: earliestUpcoming.source,
        },
        retryAfterSeconds: 0,
        title: config.title,
        message: config.message,
        contactInfo: config.contactInfo,
        evaluatedAt: now.toISOString(),
      };
    }
  }

  // 5. Normal (bisa tetap membawa info upcomingWindow bila ada jadwal di masa depan)
  return {
    phase: 'NORMAL',
    isMaintenance: false,
    isAnnouncement: false,
    source: null,
    activeWindow: null,
    upcomingWindow: earliestUpcoming
      ? {
          startAt: earliestUpcoming.start.toISOString(),
          endAt: earliestUpcoming.end.toISOString(),
          source: earliestUpcoming.source,
        }
      : null,
    retryAfterSeconds: 0,
    title: config.title,
    message: config.message,
    contactInfo: config.contactInfo,
    evaluatedAt: now.toISOString(),
  };
}

/** Format timestamp ISO ke tampilan lengkap WITA: "25 Nov 2026, 22.00 WITA" */
export function formatWitaDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} WITA`;
}

/** Format rentang waktu WITA ringkas (bila di hari yang sama, tanggal tidak diulang) */
export function formatWitaRange(startIso: string | null | undefined, endIso: string | null | undefined): string {
  if (!startIso && !endIso) return 'Hingga selesai';
  if (!startIso) return `Hingga ${formatWitaDateTime(endIso)}`;
  if (!endIso) return `Mulai ${formatWitaDateTime(startIso)}`;

  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return `${formatWitaDateTime(startIso)} – ${formatWitaDateTime(endIso)}`;
  }

  const sDay = s.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', year: 'numeric' });
  const eDay = e.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', year: 'numeric' });
  const sTime = s.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' });
  const eTime = e.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' });

  if (sDay === eDay) {
    return `${sDay}, ${sTime} – ${eTime} WITA`;
  }
  return `${sDay} ${sTime} – ${eDay} ${eTime} WITA`;
}

/** Format hitung mundur manusiawi: "2 jam 15 menit", "45 menit 12 detik", dst. */
export function formatCountdown(targetIso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!targetIso) return '';
  const diffSec = Math.max(0, Math.floor((new Date(targetIso).getTime() - nowMs) / 1000));
  if (diffSec <= 0) return 'sebentar lagi';
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  if (minutes > 0) return `${minutes} menit ${seconds} detik`;
  return `${seconds} detik`;
}

/** Konversi ISO UTC -> string untuk `<input type="datetime-local">` dalam jam WITA */
export function isoToWitaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const wita = new Date(d.getTime() + WITA_OFFSET_MS);
  return wita.toISOString().slice(0, 16);
}

/** Konversi nilai `<input type="datetime-local">` (dianggap WITA) -> ISO UTC */
export function witaInputToIso(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const d = new Date(`${trimmed}:00+08:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
