'use client';

import { waLink } from '@/lib/utils';
import { notifyAdminDataChanged, useRefetchOnNewActivity } from '@/components/admin/admin-notifications';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  HandCoins,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  Check,
  Search,
  XCircle,
  X,
  Wallet,
  Users,
  ExternalLink,
  Package,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/context/toast-context';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

type FilterKey = 'ALL' | 'PENDING' | 'LUNAS';

const rp = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export function PayoutsDataTable() {
  const { showToast } = useToast();

  const [payoutList, setPayoutList] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalSiapDiserahkanCash: 0,
    totalSudahDiserahkanCash: 0,
    totalMenungguPembeliCash: 0,
    totalPetaniAktif: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [selectedPetaniPayout, setSelectedPetaniPayout] = useState<any | null>(null);
  const [petaniToPayCash, setPetaniToPayCash] = useState<any | null>(null);
  const [isPayingCash, setIsPayingCash] = useState(false);

  const fetchPayouts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/payouts');
      const data = await res.json();

      if (data.success && Array.isArray(data.petaniPayouts)) {
        setPayoutList(data.petaniPayouts);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetch payouts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pesanan/data baru masuk -> tabel memuat ulang otomatis
  useRefetchOnNewActivity('bagiHasil', fetchPayouts);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const counts = useMemo(() => {
    const pending = payoutList.filter((p) => p.siapDicairkanCash > 0).length;
    return { all: payoutList.length, pending, lunas: payoutList.length - pending };
  }, [payoutList]);

  const filteredList = useMemo(() => {
    let list = payoutList;
    if (filter === 'PENDING') list = list.filter((p) => p.siapDicairkanCash > 0);
    if (filter === 'LUNAS') list = list.filter((p) => p.siapDicairkanCash <= 0);
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.petani.name?.toLowerCase().includes(q) ||
          p.petani.phone?.includes(q) ||
          p.petani.email?.toLowerCase().includes(q)
      );
    }
    // Yang menunggu diserahkan selalu di atas, terbesar dulu
    return [...list].sort((a, b) => b.siapDicairkanCash - a.siapDicairkanCash);
  }, [payoutList, filter, searchQuery]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Pagination Calculation
  const totalPages = Math.max(1, Math.ceil(filteredList.length / limit));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredList.slice(start, start + limit);
  }, [filteredList, currentPage, limit]);

  // Handler: Serahkan Cash ke Petani
  const handleConfirmPayCash = async () => {
    if (!petaniToPayCash) return;

    try {
      setIsPayingCash(true);
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petaniId: petaniToPayCash.petani.id,
          // Persis item yang tampil di konfirmasi -> total yang dicatat = uang yang diserahkan
          itemIds: petaniToPayCash.pendingItems.map((it: any) => it.id),
        }),
      });
      notifyAdminDataChanged();

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setPetaniToPayCash(null);
          setSelectedPetaniPayout(null);
          fetchPayouts();
        }
        throw new Error(data.error || 'Gagal menyerahkan uang cash ke petani.');
      }

      showToast({
        title: 'Uang Cash Diserahkan',
        message: data.message || 'Dana cash telah berhasil diserahkan ke petani.',
        type: 'success',
      });

      setPetaniToPayCash(null);
      setSelectedPetaniPayout(null);
      fetchPayouts();
    } catch (err: any) {
      showToast({
        title: 'Gagal Memproses',
        message: err.message || 'Terjadi kesalahan.',
        type: 'error',
      });
    } finally {
      setIsPayingCash(false);
    }
  };

  const TABS: { key: FilterKey; label: string; dot?: string; count: number }[] = [
    { key: 'ALL', label: 'Semua', count: counts.all },
    { key: 'PENDING', label: 'Menunggu Diserahkan', dot: 'bg-amber-500', count: counts.pending },
    { key: 'LUNAS', label: 'Sudah Lunas', dot: 'bg-emerald-500', count: counts.lunas },
  ];

  const totalHak = summary.totalSiapDiserahkanCash + summary.totalSudahDiserahkanCash;
  const progressPct = totalHak > 0 ? Math.round((summary.totalSudahDiserahkanCash / totalHak) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Cash Siap Diserahkan</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {rp(summary.totalSiapDiserahkanCash)}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            {counts.pending} petani menunggu pengambilan di kas
          </p>
          {summary.totalMenungguPembeliCash > 0 && (
            <p className="text-[11px] text-slate-500 mt-1">
              + {rp(summary.totalMenungguPembeliCash)} menunggu pesanan pembeli selesai
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Cash Sudah Diserahkan</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {rp(summary.totalSudahDiserahkanCash)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 tabular-nums">{progressPct}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Petani Mitra Aktif</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-slate-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {summary.totalPetaniAktif}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Total hak petani: {rp(totalHak)}
          </p>
        </div>
      </div>

      {/* 2. Outer Shell */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        {/* Header */}
        <div className="px-3 pt-2 pb-1 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-slate-600 stroke-[1.8]" />
          <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
            Bagi Hasil Petani
          </h2>
          <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
            {counts.all}
          </span>
        </div>

        {/* Tabs */}
        <div className="px-3 py-2 overflow-x-auto">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {TABS.map((tab) => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span className={`text-[10.5px] tabular-nums ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-3 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama petani, no. telp..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[#E5E7EB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>
            {(searchQuery || filter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilter('ALL');
                }}
                className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900 font-medium rounded-lg hover:bg-white transition cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={fetchPayouts}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 self-end sm:self-auto"
            title="Segarkan data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#FAFBFD] border-b border-[#F1F3F5]">
                <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                  <TableHead className="py-3 pl-4 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Petani Mitra</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Panen Terjual</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">Status</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap text-right">Siap Diserahkan</TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap text-right">Sudah Diserahkan</TableHead>
                  <TableHead className="py-3 pr-4 text-[11.5px] font-medium text-slate-500 whitespace-nowrap text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">Memuat rekap bagi hasil petani...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <HandCoins className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">
                          {payoutList.length === 0
                            ? 'Belum ada hasil panen petani yang terjual'
                            : 'Tidak ada data yang cocok'}
                        </span>
                        <span className="text-[11.5px] text-slate-400 max-w-sm">
                          {payoutList.length === 0
                            ? 'Rekap hak uang tunai petani otomatis muncul setelah pesanan komoditas selesai.'
                            : 'Coba sesuaikan kata kunci atau filter di atas.'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((item) => {
                    const isPending = item.siapDicairkanCash > 0;
                    const trxCount =
                      item.pendingItems.length + (item.awaitingItems?.length || 0) + item.completedItems.length;
                    return (
                      <TableRow
                        key={item.petani.id}
                        onClick={() => setSelectedPetaniPayout(item)}
                        className="cursor-pointer transition-colors border-[#F3F4F6] hover:bg-[#F9FAFB]"
                      >
                        <TableCell className="py-3 pl-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 rounded-full border border-slate-200 shrink-0">
                              <AvatarImage src={item.petani.avatarUrl || ''} alt={item.petani.name} />
                              <AvatarFallback className="bg-emerald-600 text-white text-[11px] font-semibold">
                                {item.petani.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-medium text-slate-800 truncate">
                                {item.petani.name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {item.petani.phone || item.petani.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="text-[12.5px] font-medium text-slate-800 tabular-nums">
                            {item.totalQtyTerjual.toLocaleString('id-ID')} unit
                          </div>
                          <div className="text-[11px] text-slate-400">{trxCount} transaksi</div>
                        </TableCell>

                        <TableCell className="py-3 whitespace-nowrap">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11.5px] font-medium bg-amber-50 text-amber-700 border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Menunggu Diambil
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11.5px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Lunas
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 whitespace-nowrap text-right">
                          <span
                            className={`text-[13px] font-semibold tabular-nums ${
                              isPending ? 'text-slate-900' : 'text-slate-300'
                            }`}
                          >
                            {rp(item.siapDicairkanCash)}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 whitespace-nowrap text-right">
                          <span className="text-[12.5px] text-slate-600 tabular-nums">
                            {rp(item.sudahDiserahkanCash)}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => setPetaniToPayCash(item)}
                                className="h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11.5px] font-medium flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <HandCoins className="w-3.5 h-3.5" />
                                Serahkan
                              </button>
                            ) : (
                              <span className="h-7 px-2 inline-flex items-center gap-1 text-[11.5px] text-emerald-600">
                                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                Selesai
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedPetaniPayout(item)}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                              title="Lihat rincian"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Pagination Persis Gambar 3 & Gambar 4 */}
          <div className="px-4 py-3 border-t border-[#F1F3F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
            <div className="flex items-center gap-3">
              <div>
                Menampilkan{' '}
                <strong className="text-slate-800 font-semibold">
                  {filteredList.length > 0 ? (currentPage - 1) * limit + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-800 font-semibold">
                  {Math.min(currentPage * limit, filteredList.length)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-800 font-semibold">
                  {filteredList.length}
                </strong>{' '}
                total bagi hasil petani
              </div>

              {/* Limit Dropdown Persis Gambar 4 */}
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-400">Limit:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Sebelumnya
              </button>
              <span className="px-2 text-slate-600 font-semibold tabular-nums">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Serahkan Cash */}
      <Dialog open={Boolean(petaniToPayCash)} onOpenChange={(open) => !open && !isPayingCash && setPetaniToPayCash(null)}>
        <DialogContent showCloseButton={false} className="max-w-md p-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {petaniToPayCash && (
            <>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <HandCoins className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <DialogTitle className="text-[15px] font-semibold text-slate-900">
                      Konfirmasi Serah Terima Cash
                    </DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pastikan uang fisik sudah diterima petani.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-slate-500">Penerima</span>
                    <span className="font-medium text-slate-900">{petaniToPayCash.petani.name}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-slate-500">Jumlah item</span>
                    <span className="font-medium text-slate-900">{petaniToPayCash.pendingItems.length} item</span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center bg-slate-50/60">
                    <span className="text-slate-700 font-medium">Total diserahkan</span>
                    <span className="text-lg font-semibold text-slate-900 tabular-nums">
                      {rp(petaniToPayCash.siapDicairkanCash)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  Setelah dikonfirmasi, transaksi dicatat lunas dan muncul di riwayat akun petani. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPetaniToPayCash(null)}
                  disabled={isPayingCash}
                  className="h-8 px-3.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayCash}
                  disabled={isPayingCash}
                  className="h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer disabled:opacity-60"
                >
                  {isPayingCash ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Ya, Sudah Diserahkan
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Rincian */}
      <Dialog open={Boolean(selectedPetaniPayout)} onOpenChange={(open) => !open && setSelectedPetaniPayout(null)}>
        <DialogContent
          showCloseButton={false}
          data-lenis-prevent="true"
          className="max-w-lg w-[95vw] p-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {selectedPetaniPayout && (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 rounded-full border border-slate-200 shrink-0">
                    <AvatarImage src={selectedPetaniPayout.petani.avatarUrl || ''} />
                    <AvatarFallback className="bg-emerald-600 text-white text-sm font-semibold">
                      {selectedPetaniPayout.petani.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="text-[15px] font-semibold text-slate-900 truncate">
                      {selectedPetaniPayout.petani.name}
                    </DialogTitle>
                    {selectedPetaniPayout.petani.phone ? (
                      <a
                        href={waLink(selectedPetaniPayout.petani.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        {selectedPetaniPayout.petani.phone}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">{selectedPetaniPayout.petani.email}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPetaniPayout(null)}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div
                className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0 text-xs"
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Siap diserahkan
                    </div>
                    <div className="text-base font-semibold text-slate-900 mt-1 tabular-nums">
                      {rp(selectedPetaniPayout.siapDicairkanCash)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah diserahkan
                    </div>
                    <div className="text-base font-semibold text-slate-900 mt-1 tabular-nums">
                      {rp(selectedPetaniPayout.sudahDiserahkanCash)}
                    </div>
                  </div>
                </div>

                {/* Pending items */}
                <section className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-slate-500" />
                      <h3 className="text-[12px] font-semibold text-slate-800">Menunggu Diserahkan</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">{selectedPetaniPayout.pendingItems.length} item</span>
                  </div>
                  {selectedPetaniPayout.pendingItems.length === 0 ? (
                    <div className="px-4 py-5 text-center text-slate-400">
                      Semua hasil panen sudah lunas diserahkan.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {selectedPetaniPayout.pendingItems.map((it: any) => (
                        <li key={it.id} className="px-4 py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-[12.5px]">{it.namaProduk}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                              {it.quantity} {it.satuan} × {rp(it.hargaPerSatuan)}
                            </div>
                            <div className="text-[10.5px] text-slate-400 mt-0.5">#{it.orderNumber}</div>
                          </div>
                          <div className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            {rp(it.subtotal)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Items whose buyer order is not finished yet: cannot be paid out */}
                {(selectedPetaniPayout.awaitingItems?.length || 0) > 0 && (
                  <section className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <h3 className="text-[12px] font-semibold text-slate-800">Menunggu Pesanan Pembeli Selesai</h3>
                      </div>
                      <span className="text-[11px] text-slate-400">{selectedPetaniPayout.awaitingItems.length} item</span>
                    </div>
                    <p className="px-4 pt-2.5 text-[11px] text-slate-500">
                      Belum bisa dicairkan sampai pembeli melunasi dan pesanan berstatus Selesai.
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {selectedPetaniPayout.awaitingItems.map((it: any) => (
                        <li key={it.id} className="px-4 py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-700 text-[12.5px]">{it.namaProduk}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {it.quantity} {it.satuan} • #{it.orderNumber} • {String(it.orderStatus).replace(/_/g, ' ').toLowerCase()}
                            </div>
                          </div>
                          <div className="font-medium text-slate-500 tabular-nums whitespace-nowrap">
                            {rp(it.subtotal)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Completed items */}
                {selectedPetaniPayout.completedItems.length > 0 && (
                  <section className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <h3 className="text-[12px] font-semibold text-slate-800">Riwayat Diserahkan</h3>
                      </div>
                      <span className="text-[11px] text-slate-400">{selectedPetaniPayout.completedItems.length} item</span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {selectedPetaniPayout.completedItems.map((it: any) => (
                        <li key={it.id} className="px-4 py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-700 text-[12.5px]">{it.namaProduk}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {it.quantity} {it.satuan} • #{it.orderNumber}
                            </div>
                            {it.payoutAt && (
                              <div className="text-[10.5px] text-emerald-700 mt-0.5 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                                {new Date(it.payoutAt).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                            )}
                          </div>
                          <div className="font-medium text-slate-600 tabular-nums whitespace-nowrap">
                            {rp(it.subtotal)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedPetaniPayout(null)}
                  className="h-8 px-3.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Tutup
                </button>
                {selectedPetaniPayout.siapDicairkanCash > 0 && (
                  <button
                    type="button"
                    onClick={() => setPetaniToPayCash(selectedPetaniPayout)}
                    className="h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    Serahkan {rp(selectedPetaniPayout.siapDicairkanCash)}
                  </button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
