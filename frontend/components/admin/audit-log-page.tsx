'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Loader2,
  ShoppingBag,
  Tractor,
  HandCoins,
  Package,
  User,
  Settings,
  FolderTree,
  ChevronDown,
  CalendarDays,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { todayWita, addDays } from '@/lib/rental-schedule';
import {
  formatAuditAction,
  formatAuditDetails,
  formatAuditSummary,
} from '@/lib/audit-log-format';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

const TYPES = [
  { key: '', label: 'Semua' },
  { key: 'ORDER', label: 'Pesanan' },
  { key: 'RENTAL', label: 'Sewa Alat' },
  { key: 'PAYOUT', label: 'Bagi Hasil' },
  { key: 'PRODUCT', label: 'Produk' },
  { key: 'USER', label: 'Pengguna' },
  { key: 'SETTINGS', label: 'Pengaturan' },
];

type DatePreset = 'ALL' | 'TODAY' | 'LAST_7' | 'LAST_30';

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'TODAY', label: 'Hari ini' },
  { key: 'LAST_7', label: '7 hari' },
  { key: 'LAST_30', label: '30 hari' },
];

const TYPE_ICON: Record<string, React.ElementType> = {
  ORDER: ShoppingBag,
  RENTAL: Tractor,
  PAYOUT: HandCoins,
  PRODUCT: Package,
  EQUIPMENT: Tractor,
  USER: User,
  SETTINGS: Settings,
  CATEGORY: FolderTree,
};

// Aksi yang menyangkut uang, pemeliharaan, atau data terhapus disorot
const SENSITIVE = [
  'PAYOUT_CASH',
  'ORDER_ARCHIVE',
  'RENTAL_ARCHIVE',
  'PRODUCT_DELETE',
  'USER_DELETE',
  'RENTAL_DP_REFUND',
  'SETTINGS_MAINTENANCE',
];

interface LogRow {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityLabel: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(ymd: string) {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Halaman admin: jejak siapa melakukan apa & kapan */
export function AuditLogPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const today = useMemo(() => todayWita(), []);

  // Tentukan preset tanggal aktif secara otomatis dari nilai from/to
  const activePreset: DatePreset | 'CUSTOM' = useMemo(() => {
    if (!from && !to) return 'ALL';
    if (from === today && to === today) return 'TODAY';
    if (from === addDays(today, -6) && to === today) return 'LAST_7';
    if (from === addDays(today, -29) && to === today) return 'LAST_30';
    return 'CUSTOM';
  }, [from, to, today]);

  // Naikkan untuk memuat ulang; status "memuat" dinyalakan oleh aksi pengguna, bukan di dalam effect
  const [reloadKey, setReloadKey] = useState(0);
  const fetchLogs = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (type) params.set('type', type);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    fetch(`/api/admin/audit-logs?${params}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active || !ok || !data.success) return;
        setLogs(data.logs);
        setPagination({ total: data.pagination.total, totalPages: data.pagination.totalPages });
      })
      .catch(() => {})
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [page, type, debouncedSearch, from, to, reloadKey]);

  const resetPageAnd = (fn: () => void) => {
    fn();
    setPage(1);
    setIsLoading(true);
  };

  const applyPreset = (preset: DatePreset) => {
    resetPageAnd(() => {
      if (preset === 'ALL') {
        setFrom('');
        setTo('');
      } else if (preset === 'TODAY') {
        setFrom(today);
        setTo(today);
      } else if (preset === 'LAST_7') {
        setFrom(addDays(today, -6));
        setTo(today);
      } else if (preset === 'LAST_30') {
        setFrom(addDays(today, -29));
        setTo(today);
      }
    });
  };

  const hasDateFilter = Boolean(from || to);

  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
      <div className="px-3 pt-2 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600 stroke-[1.8]" />
          <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">Log Aktivitas Admin</h2>
          <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
            {pagination.total}
          </span>
        </div>
        <p className="text-[11.5px] text-slate-500">Catatan otomatis setiap aksi admin. Tidak bisa diubah atau dihapus.</p>
      </div>

      {/* Filter Bar — 2 baris rapi dan sejajar */}
      <div className="px-3 pb-3 space-y-2">
        {/* Baris 1: Kategori & Preset Rentang Cepat */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex flex-wrap items-center p-0.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            {TYPES.map((t) => (
              <button
                key={t.key || 'all'}
                type="button"
                onClick={() => resetPageAnd(() => setType(t.key))}
                className={`h-7 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  type === t.key ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center p-0.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={`h-7 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activePreset === p.key ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Baris 2: Pencarian + Rentang Tanggal Terpadu (Dari -> Sampai) + Muat Ulang */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => resetPageAnd(() => setSearch(e.target.value))}
              placeholder="Cari no. pesanan, nama pengguna, atau admin..."
              className="w-full h-9 pl-8.5 pr-8 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => resetPageAnd(() => setSearch(''))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                aria-label="Hapus pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Grup Rentang Tanggal Terpadu — tidak pernah terpisah menjadi dua baris acak */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-wrap sm:flex-nowrap items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1 sm:py-0 sm:h-9 gap-1.5 shadow-2xs flex-1 sm:flex-initial">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
              <label className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="text-slate-400">Dari</span>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => resetPageAnd(() => setFrom(e.target.value))}
                  className="h-7 px-1.5 text-xs font-medium text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg focus:outline-none focus:border-slate-400 cursor-pointer tabular-nums"
                  aria-label="Dari tanggal"
                />
              </label>

              <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />

              <label className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="text-slate-400">Sampai</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => resetPageAnd(() => setTo(e.target.value))}
                  className="h-7 px-1.5 text-xs font-medium text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg focus:outline-none focus:border-slate-400 cursor-pointer tabular-nums"
                  aria-label="Sampai tanggal"
                />
              </label>

              {hasDateFilter && (
                <button
                  type="button"
                  onClick={() => applyPreset('ALL')}
                  className="ml-0.5 w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
                  title="Hapus filter tanggal"
                  aria-label="Hapus filter tanggal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                fetchLogs();
              }}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer shrink-0 shadow-2xs transition"
              title="Muat ulang"
              aria-label="Muat ulang log aktivitas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Ringkasan periode aktif bila sedang difilter tanggal */}
        {hasDateFilter && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200/80 text-[11.5px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              Menampilkan aktivitas{' '}
              <b className="text-slate-800">
                {from && to
                  ? from === to
                    ? formatDateLabel(from)
                    : `${formatDateLabel(from)} – ${formatDateLabel(to)}`
                  : from
                    ? `mulai ${formatDateLabel(from)}`
                    : `sampai ${formatDateLabel(to)}`}
              </b>
              <span className="text-slate-400">(WITA)</span>
            </span>
            <button
              type="button"
              onClick={() => applyPreset('ALL')}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Reset tanggal
            </button>
          </div>
        )}
      </div>

      {/* Daftar Log */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="py-14 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat log aktivitas...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-14 text-center">
            <History className="w-6 h-6 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-600 mt-1.5">Belum ada aktivitas tercatat</div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">
              Aksi admin seperti mengubah status atau mencairkan bagi hasil akan muncul di sini.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => {
              const Icon = TYPE_ICON[log.entityType] || History;
              const sensitive = SENSITIVE.includes(log.action);
              const isOpen = expanded === log.id;
              const detailRows = formatAuditDetails(log.details);
              const hasDetails = detailRows.length > 0;
              const actionLabel = formatAuditAction(log.action);
              const readableSummary = formatAuditSummary(log.summary);

              return (
                <li key={log.id} className="px-4 py-3 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        sensitive ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] text-slate-900 font-medium leading-snug">{readableSummary}</div>
                      <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="tabular-nums">{formatWhen(log.createdAt)} WITA</span>
                        <span className="text-slate-300">•</span>
                        <span>
                          oleh <span className="font-medium text-slate-700">{log.actorName || log.actorEmail || 'Sistem'}</span>
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                          {actionLabel}
                        </span>
                      </div>

                      {/* Rincian Ramah Admin (tanpa JSON mentah) */}
                      {hasDetails && isOpen && (
                        <div className="mt-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 p-3">
                          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Rincian Perubahan
                          </div>
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                            {detailRows.map((row, idx) => (
                              <div key={`${row.label}-${idx}`} className="min-w-0">
                                <dt className="text-[11px] text-slate-500 leading-tight">{row.label}</dt>
                                <dd className="mt-0.5 text-[12px] font-medium text-slate-800 break-words">
                                  {row.transition ? (
                                    <span className="inline-flex flex-wrap items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px] font-medium">
                                        {row.transition.from}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                                        {row.transition.to}
                                      </span>
                                    </span>
                                  ) : row.chips ? (
                                    <span className="inline-flex flex-wrap gap-1 mt-0.5">
                                      {row.chips.map((chip) => (
                                        <span
                                          key={chip}
                                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium"
                                        >
                                          {chip}
                                        </span>
                                      ))}
                                    </span>
                                  ) : row.tone === 'success' ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>{row.value}</span>
                                    </span>
                                  ) : row.tone === 'warning' ? (
                                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{row.value}</span>
                                    </span>
                                  ) : row.tone === 'danger' ? (
                                    <span className="text-rose-700 font-semibold">{row.value}</span>
                                  ) : row.tone === 'money' ? (
                                    <span className="font-semibold text-slate-900 tabular-nums">{row.value}</span>
                                  ) : (
                                    <span>{row.value}</span>
                                  )}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </div>
                    {hasDetails && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : log.id)}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0 transition ${
                          isOpen
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {isOpen ? 'Tutup' : 'Detail'}
                        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-4 py-3 border-t border-[#F1F3F5] flex items-center justify-between text-xs text-slate-500">
          <span>
            Halaman <b className="text-slate-800">{page}</b> dari {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => {
                setIsLoading(true);
                setPage((p) => Math.max(1, p - 1));
              }}
              className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 font-medium text-slate-700 cursor-pointer"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages || isLoading}
              onClick={() => {
                setIsLoading(true);
                setPage((p) => p + 1);
              }}
              className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 font-medium text-slate-700 cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
