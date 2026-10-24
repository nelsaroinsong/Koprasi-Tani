'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Phone,
  RefreshCw,
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Mail,
  Calendar,
  XCircle,
  ExternalLink,
  Download,
  Eye,
  MapPin,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserDeleteDialog } from '@/components/admin/user-delete-dialog';
import { PembeliFormPage } from '@/components/admin/pembeli-form-page';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

export interface PembeliUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address?: string | null;
  role: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export function PembeliDataTable() {
  const { showToast } = useToast();

  const [pembeliList, setPembeliList] = useState<PembeliUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterWithPhone, setFilterWithPhone] = useState<'ALL' | 'WITH_PHONE'>('ALL');

  // Full-page form viewMode: 'TABLE' | 'FORM'
  const [viewMode, setViewMode] = useState<'TABLE' | 'FORM'>('TABLE');
  const [selectedPembeli, setSelectedPembeli] = useState<PembeliUser | null>(null);

  // Multi-select & Bulk Delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Single Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pembeliToDelete, setPembeliToDelete] = useState<PembeliUser | null>(null);

  // Quick Detail Drawer / Modal
  const [detailPembeli, setDetailPembeli] = useState<PembeliUser | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset page saat filter/search berubah
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, limit, filterWithPhone]);

  const fetchPembeli = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        role: 'PEMBELI',
        page: String(currentPage),
        limit: String(limit),
      });

      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.users)) {
        setPembeliList(data.users);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching pembeli:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, debouncedSearch]);

  useEffect(() => {
    fetchPembeli();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPembeli]);

  // Filter client-side untuk tab "Semua" vs "Punya No. WhatsApp"
  const displayedList = useMemo(() => {
    if (filterWithPhone === 'WITH_PHONE') {
      return pembeliList.filter((p) => p.phone && p.phone.trim().length > 0);
    }
    return pembeliList;
  }, [pembeliList, filterWithPhone]);

  // Bulk Selection Handlers
  const isAllCurrentPageSelected =
    displayedList.length > 0 &&
    displayedList.every((p) => selectedIds.includes(p.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = displayedList.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIdsSet = new Set(displayedList.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdsSet.has(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Bulk Delete Confirm Handler
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus data pembeli terpilih.');
      }

      showToast({
        title: 'Berhasil Dihapus',
        message: `${selectedIds.length} data pembeli berhasil dihapus dari sistem.`,
        type: 'success',
      });

      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      fetchPembeli();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus',
        message: err.message || 'Terjadi kesalahan sistem saat menghapus banyak pembeli.',
        type: 'error',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Ekspor CSV Data Pembeli
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        role: 'PEMBELI',
        page: '1',
        limit: '1000',
      });
      if (debouncedSearch) params.set('q', debouncedSearch);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      const exportList: PembeliUser[] =
        data.success && Array.isArray(data.users) ? data.users : pembeliList;

      const headers = [
        'No',
        'Nama Pembeli',
        'Email',
        'No. WhatsApp',
        'Alamat Pengiriman',
        'Status Akun',
        'Terdaftar Sejak',
      ];
      const escapeCell = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

      const rows = exportList.map((p, idx) => [
        idx + 1,
        escapeCell(p.name),
        escapeCell(p.email),
        escapeCell(p.phone || '-'),
        escapeCell(p.address || '-'),
        'Aktif',
        escapeCell(new Date(p.createdAt).toISOString().split('T')[0]),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data-pembeli-koperasi-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast({
        title: 'Ekspor Berhasil',
        message: `${exportList.length} data pembeli berhasil diekspor ke CSV.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      showToast({
        title: 'Gagal Ekspor',
        message: 'Terjadi kendala saat mengekspor data pembeli.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Render Full-page Form saat viewMode === 'FORM'
  if (viewMode === 'FORM') {
    return (
      <PembeliFormPage
        initialData={selectedPembeli}
        onCancel={() => {
          setViewMode('TABLE');
          setSelectedPembeli(null);
        }}
        onSuccess={() => {
          setViewMode('TABLE');
          setSelectedPembeli(null);
          fetchPembeli();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Kravio Outer Double-Container Shell */}
      <div
        className="rounded-2xl border border-[#E5E7EB] p-1.5"
        style={HATCHED_BG_STYLE}
      >
        {/* Header Bar */}
        <div className="px-3 pt-2 pb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
                  Data Pembeli & Pelanggan
                </h1>
                <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
                  {pagination.totalCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Konsumen dan pelaku usaha pembeli hasil agribisnis koperasi
              </p>
            </div>
          </div>

          {/* Action Buttons: Export, Refresh, Tambah Pembeli */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || pembeliList.length === 0}
              className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50"
              title="Ekspor CSV Data Pembeli"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={fetchPembeli}
              disabled={isLoading}
              className="h-8 px-2.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              title="Segarkan Data Pembeli"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoading ? 'animate-spin text-slate-900' : 'text-slate-500'
                }`}
              />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedPembeli(null);
                setViewMode('FORM');
              }}
              className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pembeli</span>
            </button>
          </div>
        </div>

        {/* Tab Filter & Search Row */}
        <div className="px-3 pt-1 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Segmented Filter Pills */}
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <button
              type="button"
              onClick={() => setFilterWithPhone('ALL')}
              className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                filterWithPhone === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Semua Pembeli</span>
              <span className="text-[10px] tabular-nums font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-700">
                {pagination.totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterWithPhone('WITH_PHONE')}
              className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                filterWithPhone === 'WITH_PHONE'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>Punya No. WhatsApp</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, atau no. WA..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            />
          </div>
        </div>

        {/* Bulk Action Bar saat ada pembeli yang dicentang */}
        {selectedIds.length > 0 && (
          <div className="mx-3 mb-2 px-3.5 py-2.5 bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs tabular-nums shadow-2xs">
                {selectedIds.length}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                  {selectedIds.length} pembeli dipilih
                </span>
                <span className="hidden sm:inline-block text-xs text-slate-400 font-normal">
                  • dari {displayedList.length} di halaman ini
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Batalkan Pilihan</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Terpilih ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Inner White Table Card */}
        <div className="bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#FAFBFD] border-b border-[#F1F3F5]">
                <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                  {/* Checkbox Header */}
                  <TableHead className="w-10 text-center py-3 pl-3">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer transition"
                      aria-label="Pilih semua pembeli"
                    />
                  </TableHead>

                  <TableHead className="w-12 text-center py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    No
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Pembeli
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Email
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Nomor WhatsApp / HP
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Status Akun
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Terdaftar Sejak
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap text-right pr-4">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">Memuat data pembeli...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : displayedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <ShoppingBag className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">
                          {searchQuery
                            ? 'Tidak ada pembeli yang cocok dengan pencarian'
                            : 'Belum ada data pembeli terdaftar'}
                        </span>
                        <span className="text-[11.5px] text-slate-400 max-w-sm">
                          {searchQuery
                            ? 'Coba sesuaikan kata kunci pencarian nama atau email.'
                            : 'Daftarkan pembeli pertama dengan menekan tombol Tambah Pembeli di atas.'}
                        </span>
                        {!searchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPembeli(null);
                              setViewMode('FORM');
                            }}
                            className="mt-2 h-7 px-3 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition cursor-pointer"
                          >
                            + Tambah Pembeli
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedList.map((pembeli, index) => {
                    const isChecked = selectedIds.includes(pembeli.id);
                    const rowNumber = (currentPage - 1) * limit + (index + 1);
                    const initial = pembeli.name ? pembeli.name.charAt(0).toUpperCase() : 'P';
                    const joinedDate = new Date(pembeli.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    // Format nomor WA untuk link wa.me
                    const cleanWaDigits = pembeli.phone
                      ? pembeli.phone.replace(/[^0-9]/g, '')
                      : '';
                    const waHref = cleanWaDigits.startsWith('0')
                      ? `https://wa.me/62${cleanWaDigits.slice(1)}`
                      : `https://wa.me/${cleanWaDigits}`;

                    return (
                      <TableRow
                        key={pembeli.id}
                        className={`transition-colors border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer ${
                          isChecked ? 'bg-slate-50/80' : ''
                        }`}
                        onClick={() => setDetailPembeli(pembeli)}
                      >
                        {/* Checkbox Row */}
                        <TableCell className="w-10 text-center py-3 pl-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleSelectRow(pembeli.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer transition"
                            aria-label={`Pilih ${pembeli.name}`}
                          />
                        </TableCell>

                        {/* No */}
                        <TableCell className="text-center font-medium text-xs text-slate-400 py-3">
                          {rowNumber}
                        </TableCell>

                        {/* Pembeli Info */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 rounded-full border border-slate-200 shrink-0">
                              <AvatarImage
                                src={pembeli.avatarUrl || ''}
                                alt={pembeli.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-semibold text-slate-900 truncate">
                                {pembeli.name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                <ShoppingBag className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Konsumen Komoditas</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{pembeli.email}</span>
                          </div>
                        </TableCell>

                        {/* Nomor WhatsApp / HP dengan Link Aktif */}
                        <TableCell className="py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {pembeli.phone ? (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-2xs group"
                              title="Klik untuk chat WhatsApp langsung"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                              <span className="tabular-nums">{pembeli.phone}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-emerald-500 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum diisi</span>
                          )}
                        </TableCell>

                        {/* Status Akun */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11.5px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        </TableCell>

                        {/* Terdaftar Sejak */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{joinedDate}</span>
                          </div>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="py-3 pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailPembeli(pembeli)}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                              title="Lihat Rincian Pembeli"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPembeli(pembeli);
                                setViewMode('FORM');
                              }}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                              title="Edit Data Pembeli"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPembeliToDelete(pembeli);
                                setDeleteDialogOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition cursor-pointer"
                              title="Hapus Pembeli"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                  {displayedList.length > 0 ? (currentPage - 1) * limit + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-800 font-semibold">
                  {Math.min(currentPage * limit, pagination.totalCount)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-800 font-semibold">
                  {pagination.totalCount}
                </strong>{' '}
                total pembeli terdaftar
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
                {currentPage} / {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= pagination.totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Quick Detail Pembeli */}
      <Dialog
        open={Boolean(detailPembeli)}
        onOpenChange={(open) => !open && setDetailPembeli(null)}
      >
        <DialogContent className="max-w-md p-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {detailPembeli && (
            <>
              {/* Header Drawer */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 rounded-2xl border-2 border-slate-200 shadow-xs">
                    <AvatarImage src={detailPembeli.avatarUrl || ''} alt={detailPembeli.name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-blue-100 text-blue-800 text-lg font-bold">
                      {detailPembeli.name ? detailPembeli.name.charAt(0).toUpperCase() : 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900">
                      {detailPembeli.name}
                    </DialogTitle>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Konsumen Komoditas Aktif
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Body */}
              <div className="p-5 space-y-3.5 text-xs">
                {/* Chat WA Langsung Button */}
                {detailPembeli.phone && (
                  <a
                    href={
                      detailPembeli.phone.replace(/[^0-9]/g, '').startsWith('0')
                        ? `https://wa.me/62${detailPembeli.phone.replace(/[^0-9]/g, '').slice(1)}`
                        : `https://wa.me/${detailPembeli.phone.replace(/[^0-9]/g, '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Hubungi via WhatsApp ({detailPembeli.phone})</span>
                  </a>
                )}

                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2.5 border border-slate-200">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 font-medium">Email:</span>
                    <span className="font-semibold text-slate-800">{detailPembeli.email}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 font-medium">WhatsApp:</span>
                    <span className="font-semibold text-slate-800">{detailPembeli.phone || 'Belum diisi'}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 font-medium">Alamat:</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[200px]">
                      {detailPembeli.address || 'Belum diisi'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 font-medium">Terdaftar:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(detailPembeli.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Drawer Actions */}
              <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = detailPembeli;
                    setDetailPembeli(null);
                    setPembeliToDelete(toDelete);
                    setDeleteDialogOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailPembeli(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = detailPembeli;
                      setDetailPembeli(null);
                      setSelectedPembeli(toEdit);
                      setViewMode('FORM');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Data</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 2: Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <span>Konfirmasi Hapus Massal Pembeli</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 leading-relaxed">
            Anda akan menghapus <strong className="text-red-600 font-bold">{selectedIds.length} data pembeli</strong> yang dipilih dari sistem koperasi.
            <p className="mt-2 text-slate-500">
              Tindakan ini tidak dapat dibatalkan. Akun pelanggan yang dihapus tidak akan dapat masuk kembali ke sistem.
            </p>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleBulkDeleteConfirm}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isBulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Hapus {selectedIds.length} Pembeli</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Single Delete Confirmation Dialog dengan Toast Notification */}
      <UserDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={fetchPembeli}
        user={pembeliToDelete}
      />
    </div>
  );
}
