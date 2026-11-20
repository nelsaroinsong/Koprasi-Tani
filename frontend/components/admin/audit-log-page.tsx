'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

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

// Aksi yang menyangkut uang atau data hilang disorot
const SENSITIVE = ['PAYOUT_CASH', 'ORDER_ARCHIVE', 'RENTAL_ARCHIVE', 'PRODUCT_DELETE', 'USER_DELETE', 'RENTAL_DP_REFUND'];

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

      {/* Filter */}
      <div className="px-3 pb-2.5 flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="inline-flex flex-wrap items-center p-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          {TYPES.map((t) => (
            <button
              key={t.key || 'all'}
              type="button"
              onClick={() => resetPageAnd(() => setType(t.key))}
              className={`h-7 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                type === t.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => resetPageAnd(() => setSearch(e.target.value))}
              placeholder="Cari no. pesanan, nama, atau admin..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => resetPageAnd(() => setFrom(e.target.value))}
            className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
            aria-label="Dari tanggal"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => resetPageAnd(() => setTo(e.target.value))}
            className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
            aria-label="Sampai tanggal"
          />
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              fetchLogs();
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer"
            title="Muat ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Daftar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="py-14 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat log aktivitas...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-14 text-center">
            <History className="w-6 h-6 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-600 mt-1.5">Belum ada aktivitas tercatat</div>
            <div className="text-[11.5px] text-slate-400">Aksi admin seperti mengubah status atau mencairkan bagi hasil akan muncul di sini.</div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => {
              const Icon = TYPE_ICON[log.entityType] || History;
              const sensitive = SENSITIVE.includes(log.action);
              const isOpen = expanded === log.id;
              const hasDetails = log.details && Object.keys(log.details).length > 0;
              return (
                <li key={log.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        sensitive ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] text-slate-900 font-medium leading-snug">{log.summary}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="tabular-nums">{formatWhen(log.createdAt)} WITA</span>
                        <span className="text-slate-300">•</span>
                        <span>
                          oleh <span className="font-medium text-slate-700">{log.actorName || log.actorEmail || 'Sistem'}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-[10.5px] text-slate-400">{log.action}</span>
                      </div>
                      {hasDetails && isOpen && (
                        <pre className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10.5px] text-slate-600 overflow-x-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    {hasDetails && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : log.id)}
                        className="h-7 px-2 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        Detail
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
