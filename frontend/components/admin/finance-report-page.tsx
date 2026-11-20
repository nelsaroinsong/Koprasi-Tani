'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileBarChart2,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Landmark,
  Download,
  Printer,
  Loader2,
  AlertTriangle,
  HandCoins,
  RotateCcw,
} from 'lucide-react';
import { todayWita, addDays } from '@/lib/rental-schedule';
import type { FinanceReport, LedgerKind } from '@/lib/finance-report';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

const LEDGER_LABEL: Record<LedgerKind, string> = {
  PENJUALAN_TOKO: 'Penjualan toko',
  DP_SEWA: 'DP sewa',
  PELUNASAN_SEWA: 'Pelunasan sewa',
  DENDA_SEWA: 'Denda/kerusakan',
  BAGI_HASIL: 'Bagi hasil petani',
  REFUND_DP: 'Pengembalian DP',
};

const rp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

type Preset = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'CUSTOM';

function presetRange(p: Preset): { from: string; to: string } {
  const today = todayWita();
  const [y, m] = today.split('-').map(Number);
  if (p === 'LAST_MONTH') {
    const first = new Date(Date.UTC(y, m - 2, 1));
    const last = new Date(Date.UTC(y, m - 1, 0));
    return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }
  if (p === 'LAST_30') return { from: addDays(today, -29), to: today };
  if (p === 'THIS_YEAR') return { from: `${y}-01-01`, to: today };
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'THIS_MONTH', label: 'Bulan ini' },
  { key: 'LAST_MONTH', label: 'Bulan lalu' },
  { key: 'LAST_30', label: '30 hari' },
  { key: 'THIS_YEAR', label: 'Tahun ini' },
  { key: 'CUSTOM', label: 'Pilih tanggal' },
];

/** Unduh file Excel (.xlsx) yang dibuat server: Ringkasan, Buku Kas, Per Petani, Komoditas */
async function downloadXlsx(from: string, to: string) {
  const res = await fetch(`/api/admin/reports/finance/export?from=${from}&to=${to}`, { cache: 'no-store' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal mengunduh laporan');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-keuangan-${from}_${to}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function FinanceReportPage() {
  const [preset, setPreset] = useState<Preset>('THIS_MONTH');
  const [range, setRange] = useState(() => presetRange('THIS_MONTH'));
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [isDownloading, setIsDownloading] = useState(false);
  const handleDownload = async () => {
    if (!report) return;
    setIsDownloading(true);
    try {
      await downloadXlsx(report.period.from, report.period.to);
    } catch (e: any) {
      setError(e.message || 'Gagal mengunduh laporan');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/reports/finance?from=${range.from}&to=${range.to}`, { cache: 'no-store' })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!active) return;
        if (!ok || !d.success) setError(d.error || 'Gagal memuat laporan');
        else {
          setReport(d.report);
          setError(null);
        }
      })
      .catch(() => active && setError('Gagal memuat laporan'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'CUSTOM') {
      setIsLoading(true);
      setRange(presetRange(p));
    }
  };

  const ledgerRows = useMemo(() => {
    if (!report) return [];
    let bal = 0;
    const withBal = report.ledger.map((e) => {
      bal += e.in - e.out;
      return { ...e, balance: bal };
    });
    const filtered = withBal.filter((e) => (ledgerFilter === 'IN' ? e.in > 0 : ledgerFilter === 'OUT' ? e.out > 0 : true));
    return filtered.reverse(); // terbaru di atas
  }, [report, ledgerFilter]);

  const s = report?.summary;

  return (
    <div className="space-y-4 print:space-y-3">
      {/* Header + periode */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5 print:border-0 print:p-0" style={HATCHED_BG_STYLE}>
        <div className="px-3 pt-2 pb-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-slate-600 stroke-[1.8]" />
              <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">Laporan Keuangan</h2>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              Kas tunai koperasi {report ? `${fmtDate(report.period.from)} – ${fmtDate(report.period.to)}` : ''} (WITA)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="inline-flex flex-wrap p-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => choosePreset(p.key)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                    preset === p.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === 'CUSTOM' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={range.from}
                  max={range.to}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setIsLoading(true);
                    setRange((r) => ({ ...r, from: e.target.value }));
                  }}
                  className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg"
                  aria-label="Dari tanggal"
                />
                <span className="text-xs text-slate-400">–</span>
                <input
                  type="date"
                  value={range.to}
                  min={range.from}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setIsLoading(true);
                    setRange((r) => ({ ...r, to: e.target.value }));
                  }}
                  className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg"
                  aria-label="Sampai tanggal"
                />
              </div>
            )}
            <button
              type="button"
              disabled={!report || isDownloading}
              onClick={handleDownload}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Unduh Excel
            </button>
            <button
              type="button"
              disabled={!report}
              onClick={() => window.print()}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">{error}</div>
      ) : !report || !s ? (
        <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Menyusun laporan...
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Kas Masuk', value: s.cashIn, hint: `${s.tokoOrders} pesanan · ${s.rentalsCompleted} sewa lunas`, icon: ArrowDownLeft, tone: 'text-emerald-700' },
              { label: 'Kas Keluar', value: s.cashOut, hint: 'Bagi hasil & pengembalian DP', icon: ArrowUpRight, tone: 'text-rose-700' },
              { label: 'Saldo Kas Bersih', value: s.netCash, hint: 'Masuk − keluar periode ini', icon: Wallet, tone: s.netCash < 0 ? 'text-rose-700' : 'text-slate-900' },
              { label: 'Pendapatan Koperasi', value: s.koperasiRevenue, hint: 'Dari sewa alat (DP, pelunasan, denda)', icon: Landmark, tone: 'text-slate-900' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[12px] font-medium">{k.label}</span>
                  <k.icon className="w-4 h-4" />
                </div>
                <div className={`mt-2 text-[19px] sm:text-[22px] font-semibold tabular-nums tracking-tight ${k.tone}`}>{rp(k.value)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{k.hint}</div>
              </div>
            ))}
          </div>

          {/* Rincian + posisi saat ini */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] font-semibold text-slate-800">Rincian Arus Kas</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-xs">
                <dl className="p-4 space-y-2">
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Masuk</div>
                  {[
                    ['Penjualan toko', s.tokoSales, 'titipan petani'],
                    ['DP sewa alat', s.rentalDp, ''],
                    ['Pelunasan sewa', s.rentalSettlement, ''],
                    ['Denda & kerusakan', s.rentalFees, ''],
                  ].map(([l, v, h]) => (
                    <div key={String(l)} className="flex justify-between gap-2">
                      <dt className="text-slate-600">
                        {l} {h && <span className="text-[10.5px] text-slate-400">({h})</span>}
                      </dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{rp(Number(v))}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 font-semibold">
                    <dt>Total masuk</dt>
                    <dd className="tabular-nums text-emerald-700">{rp(s.cashIn)}</dd>
                  </div>
                </dl>
                <dl className="p-4 space-y-2">
                  <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Keluar</div>
                  {[
                    ['Bagi hasil ke petani', s.payoutPaid],
                    ['Pengembalian DP', s.dpRefunded],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between gap-2">
                      <dt className="text-slate-600">{l}</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{rp(Number(v))}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 font-semibold">
                    <dt>Total keluar</dt>
                    <dd className="tabular-nums text-rose-700">{rp(s.cashOut)}</dd>
                  </div>
                  <p className="text-[10.5px] text-slate-400 pt-1">{s.ordersCancelled} pesanan dibatalkan pada periode ini.</p>
                </dl>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] font-semibold text-slate-800">
                Kewajiban Saat Ini
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <HandCoins className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-slate-600">Bagi hasil belum diserahkan</div>
                    <div className="text-[16px] font-semibold tabular-nums text-amber-700">{rp(report.outstanding.payoutOwed)}</div>
                    <div className="text-[10.5px] text-slate-400">{report.outstanding.payoutOwedPetani} petani menunggu di kasir</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-slate-600">DP sewa perlu dikembalikan</div>
                    <div className="text-[16px] font-semibold tabular-nums text-amber-700">{rp(report.outstanding.dpToRefund)}</div>
                    <div className="text-[10.5px] text-slate-400">{report.outstanding.dpToRefundCount} penyewa</div>
                  </div>
                </div>
                {(report.outstanding.payoutOwed > 0 || report.outstanding.dpToRefund > 0) && (
                  <p className="flex items-start gap-1.5 text-[10.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Sisihkan kas sejumlah ini — uangnya milik petani/penyewa.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Per petani & produk terlaris */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] font-semibold text-slate-800">Penjualan per Petani</div>
              {report.perPetani.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">Belum ada penjualan pada periode ini.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-[11px] text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="text-left font-medium px-4 py-2">Petani</th>
                      <th className="text-right font-medium px-4 py-2">Penjualan</th>
                      <th className="text-right font-medium px-4 py-2">Diserahkan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.perPetani.map((p) => (
                      <tr key={p.name}>
                        <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{rp(p.sales)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-500">{rp(p.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[12px] font-semibold text-slate-800">Komoditas Terlaris</div>
              {report.topProducts.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">Belum ada penjualan pada periode ini.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-[11px] text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="text-left font-medium px-4 py-2">Komoditas</th>
                      <th className="text-right font-medium px-4 py-2">Terjual</th>
                      <th className="text-right font-medium px-4 py-2">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.topProducts.map((p) => (
                      <tr key={`${p.nama}-${p.satuan}`}>
                        <td className="px-4 py-2 font-medium text-slate-800">{p.nama}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {p.quantity.toLocaleString('id-ID')} {p.satuan}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{rp(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {/* Buku kas */}
          <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-800">Buku Kas ({report.ledger.length} transaksi)</span>
              <div className="inline-flex p-0.5 rounded-lg bg-white border border-slate-200 print:hidden">
                {(['ALL', 'IN', 'OUT'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLedgerFilter(k)}
                    className={`h-6 px-2 rounded-md text-[11px] font-medium cursor-pointer ${
                      ledgerFilter === k ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    {k === 'ALL' ? 'Semua' : k === 'IN' ? 'Masuk' : 'Keluar'}
                  </button>
                ))}
              </div>
            </div>
            {ledgerRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">Tidak ada transaksi kas pada periode ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead className="text-[11px] text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="text-left font-medium px-4 py-2">Tanggal</th>
                      <th className="text-left font-medium px-4 py-2">Jenis</th>
                      <th className="text-left font-medium px-4 py-2">Keterangan</th>
                      <th className="text-right font-medium px-4 py-2">Masuk</th>
                      <th className="text-right font-medium px-4 py-2">Keluar</th>
                      <th className="text-right font-medium px-4 py-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerRows.map((e, i) => (
                      <tr key={`${e.at}-${e.ref}-${i}`}>
                        <td className="px-4 py-2 whitespace-nowrap tabular-nums text-slate-600">{fmtDate(e.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{LEDGER_LABEL[e.kind]}</td>
                        <td className="px-4 py-2">
                          <span className="font-medium text-slate-800">{e.ref}</span> · {e.party}
                          <div className="text-[10.5px] text-slate-400">{e.description}</div>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{e.in ? rp(e.in) : ''}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-rose-700">{e.out ? rp(e.out) : ''}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-800">{rp(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
