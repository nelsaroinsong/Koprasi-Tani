import { getSetting, setSetting, SETTING_KEYS } from '@/lib/app-settings';
import { getCache, setCache, delCache } from '@/lib/redis';
import {
  DEFAULT_MAINTENANCE_CONFIG,
  DAY_OF_WEEK_LABELS,
  evaluateMaintenance,
  formatWitaRange,
  normalizeMaintenanceConfig,
  type MaintenanceConfig,
  type MaintenanceEvaluation,
} from '@/lib/maintenance';
import { logAudit, type AuditActor } from '@/lib/audit-log';

const REDIS_CACHE_KEY = 'koperasi:system:maintenance:v1';
const REDIS_TTL_SECONDS = 30;
const MEMORY_TTL_MS = 10_000;

const g = globalThis as typeof globalThis & {
  __kspsMaintenanceMem?: { config: MaintenanceConfig; fetchedAt: number };
};

export function invalidateMaintenanceCache(): void {
  g.__kspsMaintenanceMem = undefined;
  void delCache(REDIS_CACHE_KEY);
}

/** Baca konfigurasi pemeliharaan dengan cache bertingkat (Memori 10d -> Redis 30d -> DB) */
export async function getMaintenanceConfig(bypassCache = false): Promise<MaintenanceConfig> {
  const now = Date.now();
  if (!bypassCache && g.__kspsMaintenanceMem && now - g.__kspsMaintenanceMem.fetchedAt < MEMORY_TTL_MS) {
    return g.__kspsMaintenanceMem.config;
  }

  if (!bypassCache) {
    try {
      const cached = await getCache<MaintenanceConfig>(REDIS_CACHE_KEY);
      if (cached) {
        const normalized = normalizeMaintenanceConfig(cached);
        g.__kspsMaintenanceMem = { config: normalized, fetchedAt: now };
        return normalized;
      }
    } catch {
      // Lanjut baca ke database
    }
  }

  try {
    const saved = await getSetting<MaintenanceConfig>(SETTING_KEYS.systemMaintenance);
    const config = saved ? normalizeMaintenanceConfig(saved) : { ...DEFAULT_MAINTENANCE_CONFIG };
    g.__kspsMaintenanceMem = { config, fetchedAt: now };
    void setCache(REDIS_CACHE_KEY, config, REDIS_TTL_SECONDS);
    return config;
  } catch (err) {
    console.warn('[Maintenance] Gagal membaca pengaturan dari DB, fallback normal:', err);
    return { ...DEFAULT_MAINTENANCE_CONFIG };
  }
}

export async function getMaintenanceStatus(
  now: Date = new Date(),
  bypassCache = false
): Promise<MaintenanceEvaluation> {
  const config = await getMaintenanceConfig(bypassCache);
  return evaluateMaintenance(config, now);
}

export async function saveMaintenanceConfig(
  rawInput: unknown,
  actor: AuditActor
): Promise<{ config: MaintenanceConfig; status: MaintenanceEvaluation }> {
  const normalized = normalizeMaintenanceConfig(rawInput);

  // Validasi rentang jadwal sekali jalan bila diisi
  if ((normalized.startAt && !normalized.endAt) || (!normalized.startAt && normalized.endAt)) {
    throw new Error('Waktu mulai dan selesai pemeliharaan terjadwal harus diisi keduanya.');
  }
  if (normalized.startAt && normalized.endAt) {
    if (new Date(normalized.endAt).getTime() <= new Date(normalized.startAt).getTime()) {
      throw new Error('Waktu selesai harus lebih akhir daripada waktu mulai.');
    }
  }

  if (normalized.recurring.enabled && normalized.recurring.startTime === normalized.recurring.endTime) {
    throw new Error('Jam mulai dan selesai jadwal rutin mingguan tidak boleh sama.');
  }

  const finalConfig: MaintenanceConfig = {
    ...normalized,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.name || actor.email || 'Admin',
  };

  await setSetting(SETTING_KEYS.systemMaintenance, finalConfig as any);
  invalidateMaintenanceCache();
  // Segarkan cache memori segera agar perubahan instan di instance ini
  g.__kspsMaintenanceMem = { config: finalConfig, fetchedAt: Date.now() };
  void setCache(REDIS_CACHE_KEY, finalConfig, REDIS_TTL_SECONDS);

  const status = evaluateMaintenance(finalConfig);

  // Susun ringkasan log aktivitas yang jelas untuk pengurus koperasi
  const summaryParts: string[] = [];
  if (finalConfig.forceEnabled) {
    summaryParts.push('mengaktifkan mode pemeliharaan darurat sekarang juga');
  } else if (finalConfig.startAt && finalConfig.endAt) {
    summaryParts.push(`menjadwalkan pemeliharaan (${formatWitaRange(finalConfig.startAt, finalConfig.endAt)})`);
  } else if (finalConfig.recurring.enabled) {
    summaryParts.push(
      `mengaktifkan jadwal rutin tiap ${DAY_OF_WEEK_LABELS[finalConfig.recurring.dayOfWeek]} ${finalConfig.recurring.startTime}–${finalConfig.recurring.endTime} WITA`
    );
  } else {
    summaryParts.push('menonaktifkan mode & jadwal pemeliharaan sistem');
  }

  await logAudit({
    actor,
    action: 'SETTINGS_MAINTENANCE',
    entityType: 'SETTINGS',
    entityLabel: 'Pemeliharaan Sistem',
    summary: `Memperbarui pemeliharaan sistem: ${summaryParts.join(', ')}`,
    details: {
      forceEnabled: finalConfig.forceEnabled,
      startAt: finalConfig.startAt,
      endAt: finalConfig.endAt,
      noticeHoursBefore: finalConfig.noticeHoursBefore,
      recurringEnabled: finalConfig.recurring.enabled,
      recurringSchedule: finalConfig.recurring.enabled
        ? `Setiap ${DAY_OF_WEEK_LABELS[finalConfig.recurring.dayOfWeek]}, ${finalConfig.recurring.startTime} – ${finalConfig.recurring.endTime} WITA`
        : undefined,
      title: finalConfig.title,
    },
  });

  return { config: finalConfig, status };
}
