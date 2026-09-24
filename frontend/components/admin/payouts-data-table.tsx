'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DollarSign,
  HandCoins,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  Calendar,
  Package,
  Check,
  User,
  Phone,
  FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/context/toast-context';

export function PayoutsDataTable() {
  const { showToast } = useToast();

  const [payoutList, setPayoutList] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalSiapDiserahkanCash: 0,
    totalSudahDiserahkanCash: 0,
    totalPetaniAktif: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [selectedPetaniPayout, setSelectedPetaniPayout] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Handler: Serahkan Cash ke Petani
  const handleConfirmPayCash = async () => {
    if (!petaniToPayCash) return;

    try {
      setIsPayingCash(true);
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petaniId: petaniToPayCash.petani.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyerahkan uang cash ke petani.');
      }

      showToast({
        title: 'Uang Cash Diserahkan',
        message: data.message || 'Dana cash telah berhasil diserahkan ke petani.',
        type: 'success',
      });

      setPetaniToPayCash(null);
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

  return (
    <div className="space-y-5">
      {/* 1. Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Penyerahan Uang Cash Hasil Panen Petani
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {summary.totalPetaniAktif} Petani Mitra
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekap keuntungan uang tunai milik petani yang komoditasnya sudah laku terjual di Koperasi Sinar Pagi Sejahtera.
          </p>
        </div>

        <button
          onClick={fetchPayouts}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Cash Siap Diserahkan */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-800 p-5 rounded-3xl text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
              Total Cash Siap Diserahkan ke Petani
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1">
              Rp {summary.totalSiapDiserahkanCash.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-emerald-100/90 mt-1">
              Uang tunai di kas koperasi yang menunggu diambil oleh para petani mitra.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
            <HandCoins className="w-7 h-7 text-emerald-200" />
          </div>
        </div>

        {/* Total Cash Sudah Diserahkan */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Cash yang Sudah Diserahkan
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">
              Rp {summary.totalSudahDiserahkanCash.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total keuntungan tunai yang telah berhasil diterima oleh petani binaan.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-7 h-7 text-emerald-700" />
          </div>
        </div>
      </div>

      {/* 3. Tabel Rekap Petani */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-emerald-50/70 border-b border-emerald-100">
            <TableRow className="hover:bg-transparent border-emerald-100">
              <TableHead className="w-12 text-center text-emerald-950 font-bold text-xs py-3.5">
                No
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Petani Mitra
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Total Panen Terjual
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Cash Siap Diserahkan
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Cash Sudah Diserahkan
              </TableHead>
              <TableHead className="text-right text-emerald-950 font-bold text-xs pr-4">
                Aksi Serah Terima
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat rekap cash petani...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : payoutList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HandCoins className="w-8 h-8 text-slate-300 stroke-1" />
                    <span className="text-xs font-bold text-slate-700">
                      Belum ada hasil panen petani yang terjual
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Saat pembeli membeli komoditas di toko online, rekap hak uang tunai petani akan otomatis muncul di sini.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payoutList.map((item, index) => (
                <TableRow
                  key={item.petani.id}
                  className="hover:bg-emerald-50/30 transition-colors border-slate-100"
                >
                  <TableCell className="text-center font-medium text-xs text-slate-400">
                    {index + 1}
                  </TableCell>

                  {/* Petani Info */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 rounded-xl border border-emerald-200 shrink-0">
                        <AvatarImage src={item.petani.avatarUrl || ''} alt={item.petani.name} />
                        <AvatarFallback className="rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                          {item.petani.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {item.petani.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.petani.phone || item.petani.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Total Panen Terjual */}
                  <TableCell>
                    <div className="text-xs font-bold text-slate-800">
                      {item.totalQtyTerjual.toLocaleString('id-ID')} unit
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.pendingItems.length + item.completedItems.length} transaksi
                    </div>
                  </TableCell>

                  {/* Cash Siap Diserahkan */}
                  <TableCell>
                    <div className="text-sm font-black text-emerald-800">
                      Rp {item.siapDicairkanCash.toLocaleString('id-ID')}
                    </div>
                    {item.siapDicairkanCash > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Menunggu Diambil</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Nihil / Sudah Lunas</span>
                    )}
                  </TableCell>

                  {/* Cash Sudah Diserahkan */}
                  <TableCell>
                    <div className="text-xs font-bold text-slate-700">
                      Rp {item.sudahDiserahkanCash.toLocaleString('id-ID')}
                    </div>
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3" />
                      <span>Telah Diterima Petani</span>
                    </span>
                  </TableCell>

                  {/* Aksi Serah Terima */}
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Tombol Serahkan Cash */}
                      {item.siapDicairkanCash > 0 && (
                        <button
                          onClick={() => setPetaniToPayCash(item)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                          title="Serahkan Uang Cash ke Petani"
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          <span>Serahkan Cash</span>
                        </button>
                      )}

                      {/* Tombol Rincian */}
                      <button
                        onClick={() => {
                          setSelectedPetaniPayout(item);
                          setIsDetailOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
                      >
                        Rincian
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Dialog Konfirmasi Serahkan Cash ke Petani */}
      {petaniToPayCash && (
        <Dialog open={Boolean(petaniToPayCash)} onOpenChange={(open) => !open && setPetaniToPayCash(null)}>
          <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-3xl shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <HandCoins className="w-6 h-6 text-emerald-700" />
              </div>

              <div className="space-y-1 flex-1">
                <DialogTitle className="text-base font-bold text-slate-900">
                  Konfirmasi Serahkan Uang Tunai
                </DialogTitle>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda sudah menyerahkan uang cash fisik sebesar:
                </p>

                <div className="p-3 my-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <div className="text-xs text-emerald-800 font-semibold">Total Uang Cash:</div>
                  <div className="text-2xl font-black text-emerald-900 mt-0.5">
                    Rp {petaniToPayCash.siapDicairkanCash.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                    Kepada Petani: <strong>{petaniToPayCash.petani.name}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Setelah dikonfirmasi, sistem akan mencatat transaksi ini lunas dan riwayat pembayaran akan langsung tercatat di akun petani.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPetaniToPayCash(null)}
                disabled={isPayingCash}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPayCash}
                disabled={isPayingCash}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                {isPayingCash ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sudah Diserahkan Tunai</span>
                  </>
                )}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Rincian Penjualan Komoditas Petani */}
      {selectedPetaniPayout && (
        <Dialog open={isDetailOpen} onOpenChange={(open) => !open && setIsDetailOpen(false)}>
          <DialogContent className="max-w-lg w-[95vw] p-0 bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white">
              <DialogTitle className="text-base font-bold text-white">
                Rincian Penjualan: {selectedPetaniPayout.petani.name}
              </DialogTitle>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Daftar komoditas panen yang terjual melalui Koperasi Sinar Pagi Sejahtera.
              </p>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Saldo Status */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Siap Diambil Cash:</span>
                  <strong className="text-base font-black text-emerald-800">
                    Rp {selectedPetaniPayout.siapDicairkanCash.toLocaleString('id-ID')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Sudah Diserahkan:</span>
                  <strong className="text-base font-black text-slate-800">
                    Rp {selectedPetaniPayout.sudahDiserahkanCash.toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              {/* Items Menunggu Cash */}
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Hasil Panen Terjual (Menunggu Cash):</span>
                  <span className="text-amber-700 font-semibold">{selectedPetaniPayout.pendingItems.length} item</span>
                </div>

                {selectedPetaniPayout.pendingItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Semua hasil panen yang terjual telah lunas diserahkan uang cash-nya.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPetaniPayout.pendingItems.map((it: any) => (
                      <div
                        key={it.id}
                        className="p-3 bg-amber-50/40 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{it.namaProduk}</div>
                          <div className="text-[11px] text-slate-500">
                            {it.quantity} {it.satuan} × Rp {it.hargaPerSatuan.toLocaleString('id-ID')}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            No. Pesanan: {it.orderNumber}
                          </div>
                        </div>
                        <div className="font-extrabold text-amber-800 text-sm">
                          Rp {it.subtotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Sudah Diserahkan */}
              {selectedPetaniPayout.completedItems.length > 0 && (
                <div>
                  <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Riwayat yang Sudah Diserahkan Cash:</span>
                    <span className="text-slate-500 font-normal">{selectedPetaniPayout.completedItems.length} item</span>
                  </div>
                  <div className="space-y-2">
                    {selectedPetaniPayout.completedItems.map((it: any) => (
                      <div
                        key={it.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-slate-600"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{it.namaProduk}</div>
                          <div className="text-[11px] text-slate-500">
                            {it.quantity} {it.satuan} • {it.orderNumber}
                          </div>
                          {it.payoutAt && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              Diserahkan: {new Date(it.payoutAt).toLocaleDateString('id-ID')}
                            </div>
                          )}
                        </div>
                        <div className="font-bold text-slate-800">
                          Rp {it.subtotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
