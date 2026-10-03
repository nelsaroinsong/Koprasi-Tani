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
} from '@/components/ui/dialog';
import {
  Search,
  CheckCircle2,
  Clock,
  Check,
  XCircle,
  RefreshCw,
  Loader2,
  User,
  Phone,
  MapPin,
  Calendar,
  MessageCircle,
  Tractor,
  ExternalLink,
  ShieldCheck,
  Banknote,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';
import type { EquipmentRentalOrder, EquipmentRentalStatus } from '@/lib/equipment-rentals';

export function EquipmentRentalsTable() {
  const { showToast } = useToast();

  const [rentals, setRentals] = useState<EquipmentRentalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Selected Rental for Detail Modal
  const [selectedRental, setSelectedRental] = useState<EquipmentRentalOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch Rentals
  const fetchRentals = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') {
        params.set('status', filterStatus);
      }
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/equipment-rentals?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.rentals)) {
        setRentals(data.rentals);
      }
    } catch (err: any) {
      console.error('Error fetching admin rentals:', err);
      showToast({
        title: 'Gagal Memuat Data',
        message: 'Tidak dapat mengambil daftar pengajuan sewa alat.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, searchQuery, showToast]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  // Update Status Pengajuan Sewa (Approve / Tolak / Selesai)
  const handleUpdateStatus = async (rentalId: string, newStatus: EquipmentRentalStatus) => {
    try {
      setIsUpdatingStatus(true);
      const res = await fetch('/api/admin/equipment-rentals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rentalId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: 'Status Diperbarui',
          message: data.message || 'Status sewa berhasil diubah.',
          type: 'success',
        });
        fetchRentals();
        if (selectedRental && selectedRental.id === rentalId) {
          setSelectedRental(data.rental);
        }
      } else {
        showToast({
          title: 'Gagal Memperbarui',
          message: data.error || 'Terjadi kesalahan.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Kesalahan Sistem',
        message: 'Tidak dapat menghubungi server.',
        type: 'error',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: EquipmentRentalStatus) => {
    switch (status) {
      case 'MENUNGGU_PERSETUJUAN_ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Menunggu Approval Admin</span>
          </span>
        );
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Check className="w-3 h-3 text-blue-600" />
            <span>Disetujui Admin</span>
          </span>
        );
      case 'SIAP_DIAMBIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Tractor className="w-3 h-3 text-emerald-600" />
            <span>Siap Diambil</span>
          </span>
        );
      case 'SEDANG_DISEWA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Tractor className="w-3 h-3 text-purple-600" />
            <span>Sedang Digunakan</span>
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            <span>Selesai</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>Ditolak</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Tractor className="w-5 h-5 text-emerald-700" />
            <span>Persetujuan & Pengajuan Sewa Alat</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tinjau ketersediaan unit mesin pertanian dan setujui (approve) permohonan sewa anggota koperasi.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRentals}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode sewa, nama pemohon, lokasi..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none">
          {[
            { key: 'ALL', label: 'Semua Status' },
            { key: 'MENUNGGU_PERSETUJUAN_ADMIN', label: 'Perlu Approval' },
            { key: 'DISETUJUI', label: 'Disetujui' },
            { key: 'SIAP_DIAMBIL', label: 'Siap Diambil' },
            { key: 'SEDANG_DISEWA', label: 'Sedang Dipakai' },
            { key: 'SELESAI', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-[11px] ${
                filterStatus === tab.key
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Table Data Pengajuan Sewa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="text-[11px] font-bold">No. Pengajuan</TableHead>
              <TableHead className="text-[11px] font-bold">Pemohon</TableHead>
              <TableHead className="text-[11px] font-bold">Unit Alat & Durasi</TableHead>
              <TableHead className="text-[11px] font-bold">Mulai Sewa & Lokasi</TableHead>
              <TableHead className="text-[11px] font-bold">Total Tagihan</TableHead>
              <TableHead className="text-[11px] font-bold">Status</TableHead>
              <TableHead className="text-[11px] font-bold text-right">Aksi Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-700 mx-auto mb-2" />
                  <span>Memuat data pengajuan sewa alat...</span>
                </TableCell>
              </TableRow>
            ) : rentals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                  <Tractor className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Belum ada data pengajuan sewa alat</p>
                  <p className="text-[11px] mt-0.5">Pengajuan yang dibuat pengguna akan muncul di sini untuk Anda verifikasi.</p>
                </TableCell>
              </TableRow>
            ) : (
              rentals.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50/70 transition text-xs">
                  <TableCell className="font-bold text-slate-900">
                    #{r.rentalCode}
                  </TableCell>

                  <TableCell>
                    <div className="font-bold text-slate-800">{r.userName}</div>
                    <div className="text-[10px] text-slate-400">{r.userPhone || r.userEmail}</div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-0.5">
                      {r.items.map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-700 font-medium">
                          • {it.nama} ({it.jumlahUnit} unit • {it.durasi} {it.satuanSewa})
                        </div>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-semibold text-slate-800">{r.startDate}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                      {r.lokasiLahan || 'Kantor Koperasi'}
                    </div>
                  </TableCell>

                  <TableCell className="font-black text-emerald-800">
                    Rp {Number(r.totalEstimasi).toLocaleString('id-ID')}
                  </TableCell>

                  <TableCell>
                    {renderStatusBadge(r.status)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedRental(r)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                      >
                        Detail
                      </button>

                      {r.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(r.id, 'DISETUJUI')}
                            disabled={isUpdatingStatus}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(r.id, 'DITOLAK')}
                            disabled={isUpdatingStatus}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold transition cursor-pointer border border-red-200"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {r.status === 'DISETUJUI' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(r.id, 'SIAP_DIAMBIL')}
                          disabled={isUpdatingStatus}
                          className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                        >
                          Siap Diambil
                        </button>
                      )}

                      {r.status === 'SIAP_DIAMBIL' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(r.id, 'SEDANG_DISEWA')}
                          disabled={isUpdatingStatus}
                          className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                        >
                          Diserahkan
                        </button>
                      )}

                      {r.status === 'SEDANG_DISEWA' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(r.id, 'SELESAI')}
                          disabled={isUpdatingStatus}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                        >
                          Selesai
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. Modal Detail Pengajuan Sewa */}
      <Dialog open={Boolean(selectedRental)} onOpenChange={(open) => !open && setSelectedRental(null)}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl text-xs max-h-[90vh] overflow-y-auto">
          {selectedRental && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Tractor className="w-5 h-5 text-emerald-700" />
                    <span>Detail Sewa #{selectedRental.rentalCode}</span>
                  </DialogTitle>
                  <div>{renderStatusBadge(selectedRental.status)}</div>
                </div>
              </DialogHeader>

              {/* Data Pemohon */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="font-bold text-slate-900">{selectedRental.userName}</div>
                <div className="text-slate-600">Email: {selectedRental.userEmail}</div>
                <div className="text-slate-600">Telepon: {selectedRental.userPhone || '-'}</div>
                <div className="text-slate-600">Tanggal Mulai: <span className="font-bold text-slate-900">{selectedRental.startDate}</span></div>
                <div className="text-slate-600">Lokasi Lahan: {selectedRental.lokasiLahan || '-'}</div>
                {selectedRental.catatan && (
                  <div className="text-slate-600">Catatan: &quot;{selectedRental.catatan}&quot;</div>
                )}
              </div>

              {/* Rincian Alat */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800">Unit Alat yang Disewa:</div>
                {selectedRental.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{it.nama}</div>
                      <div className="text-[10px] text-slate-500">
                        {it.jumlahUnit} unit • {it.durasi} {it.satuanSewa} • {it.includeOperator ? '+ Operator' : 'Mandiri'}
                      </div>
                    </div>
                    <div className="font-black text-emerald-800">
                      Rp {Number(it.subtotal).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Tagihan */}
              <div className="p-3 bg-slate-100 rounded-2xl flex justify-between items-baseline font-black">
                <span className="text-slate-700">Total Estimasi Tagihan:</span>
                <span className="text-base text-emerald-900">
                  Rp {Number(selectedRental.totalEstimasi).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Aksi Persetujuan */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {selectedRental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedRental.id, 'DISETUJUI')}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      Setujui (Approve) Pengajuan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedRental.id, 'DITOLAK')}
                      disabled={isUpdatingStatus}
                      className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      Tolak
                    </button>
                  </>
                )}

                {selectedRental.status === 'DISETUJUI' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'SIAP_DIAMBIL')}
                    disabled={isUpdatingStatus}
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Tandai Unit Siap Diambil di Koperasi
                  </button>
                )}

                {selectedRental.status === 'SIAP_DIAMBIL' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'SEDANG_DISEWA')}
                    disabled={isUpdatingStatus}
                    className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Tandai Unit Sudah Diserahkan ke Penyewa
                  </button>
                )}

                {selectedRental.status === 'SEDANG_DISEWA' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedRental.id, 'SELESAI')}
                    disabled={isUpdatingStatus}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Tandai Unit Dikembalikan & Sewa Selesai
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
