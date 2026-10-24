'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Search,
  CheckCircle2,
  Clock,
  Sprout,
  Phone,
  RefreshCw,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Mail,
  Calendar,
  XCircle,
  X,
  Download,
  ExternalLink,
  ShieldCheck,
  Eye,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PetaniFormPage } from '@/components/admin/petani-form-page';
import { UserDeleteDialog } from '@/components/admin/user-delete-dialog';
import { UserVerifyDialog } from '@/components/admin/user-verify-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/context/toast-context';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

interface PetaniUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isOnboarded: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface UserStats {
  total: number;
  verified: number;
  pending: number;
}

type FilterKey = 'ALL' | 'VERIFIED' | 'PENDING';

export function PetaniDataTable() {
  const { showToast } = useToast();

  // Mode Tampilan: 'TABLE' atau 'FORM' (Halaman Penuh untuk Tambah & Edit Petani)
  const [viewMode, setViewMode] = useState<'TABLE' | 'FORM'>('TABLE');
  const [selectedPetani, setSelectedPetani] = useState<PetaniUser | null>(null);

  const [petaniList, setPetaniList] = useState<PetaniUser[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    verified: 0,
    pending: 0,
  });
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterKey>('ALL');

  // Debounce 300ms untuk search
  const debouncedSearch = useDebounce(searchQuery, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal Dialogs (Delete & Verify)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [petaniToDelete, setPetaniToDelete] = useState<PetaniUser | null>(null);

  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [petaniToVerify, setPetaniToVerify] = useState<PetaniUser | null>(null);

  // Detail Modal
  const [detailPetani, setDetailPetani] = useState<PetaniUser | null>(null);

  // Reset ke halaman 1 saat filter, limit, atau search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, limit]);

  const fetchPetani = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        role: 'PETANI',
        page: String(currentPage),
        limit: String(limit),
      });

      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      if (filterStatus !== 'ALL') {
        params.set('status', filterStatus);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.users)) {
        setPetaniList(data.users);
        if (data.pagination) {
          setPagination(data.pagination);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching petani:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, debouncedSearch, filterStatus]);

  useEffect(() => {
    fetchPetani();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPetani]);

  // Ekspor CSV Data Petani
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        role: 'PETANI',
        page: '1',
        limit: '500',
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      const exportList: PetaniUser[] =
        data.success && Array.isArray(data.users) ? data.users : petaniList;

      const headers = [
        'No',
        'Nama Petani',
        'Email',
        'No. WhatsApp',
        'Alamat',
        'Status Verifikasi',
        'Terdaftar Sejak',
      ];
      const escapeCell = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

      const rows = exportList.map((p, idx) => [
        idx + 1,
        escapeCell(p.name),
        escapeCell(p.email),
        escapeCell(p.phone || '-'),
        escapeCell(p.address || '-'),
        escapeCell(p.isVerified ? 'Terverifikasi' : 'Menunggu Verifikasi'),
        escapeCell(new Date(p.createdAt).toISOString().split('T')[0]),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data-petani-mitra-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Berhasil mengekspor ${exportList.length} data petani mitra`);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor data petani');
    } finally {
      setIsExporting(false);
    }
  };

  const TABS: { key: FilterKey; label: string; dot?: string; count: number }[] = [
    { key: 'ALL', label: 'Semua', count: stats.total },
    { key: 'VERIFIED', label: 'Terverifikasi', dot: 'bg-emerald-500', count: stats.verified },
    { key: 'PENDING', label: 'Menunggu Verifikasi', dot: 'bg-amber-500', count: stats.pending },
  ];

  // Jika sedang membuka Form Tambah / Edit Petani, render Halaman Penuh Form
  if (viewMode === 'FORM') {
    return (
      <PetaniFormPage
        initialData={selectedPetani}
        onCancel={() => {
          setViewMode('TABLE');
          setSelectedPetani(null);
        }}
        onSuccess={() => {
          setViewMode('TABLE');
          setSelectedPetani(null);
          fetchPetani();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Kravio Outer Double-Container Shell */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        {/* Header: Judul + Counter */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Sprout className="w-4 h-4 text-slate-600 stroke-[1.8]" />
            <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
              Data Petani Mitra
            </h2>
            <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
              {pagination.totalCount}
            </span>
          </div>
        </div>

        {/* Status Filter Tabs (Pill Style) */}
        <div className="px-3 py-2 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {TABS.map((tab) => {
              const isActive = filterStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterStatus(tab.key)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10.5px] tabular-nums ${
                      isActive ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar: Search, Reset, Ekspor, Refresh, Tambah (Buka Halaman Baru) */}
        <div className="px-3 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama petani, kontak, alamat..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[#E5E7EB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            {(searchQuery || filterStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('ALL');
                  setSearchQuery('');
                }}
                className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900 font-medium rounded-lg hover:bg-white transition cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isExporting ? 'Mengekspor...' : 'Ekspor'}</span>
            </button>

            <button
              type="button"
              onClick={fetchPetani}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
              title="Segarkan data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`}
              />
            </button>

            {/* Tombol Buka Halaman Baru Tambah Petani */}
            <button
              type="button"
              onClick={() => {
                setSelectedPetani(null);
                setViewMode('FORM');
              }}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Petani</span>
            </button>
          </div>
        </div>

        {/* Inner White Table Box */}
        <div className="bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#FAFBFD] border-b border-[#F1F3F5]">
                <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                  <TableHead className="w-12 text-center py-3 text-[11.5px] font-medium text-slate-500">
                    No
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Petani Mitra
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Kontak & WhatsApp
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Wilayah / Alamat
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Terdaftar
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Status Verifikasi
                  </TableHead>
                  <TableHead className="w-28 py-3 text-right pr-4 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">
                          Memuat data petani mitra...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : petaniList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Sprout className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">
                          {searchQuery
                            ? 'Tidak ada petani yang cocok dengan pencarian'
                            : 'Belum ada data petani terdaftar'}
                        </span>
                        <span className="text-[11.5px] text-slate-400 max-w-sm">
                          {searchQuery
                            ? 'Coba sesuaikan kata kunci pencarian Anda'
                            : 'Mulai daftarkan petani binaan dengan menekan tombol Tambah Petani.'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  petaniList.map((petani, index) => {
                    const initial = petani.name.charAt(0).toUpperCase();
                    const rowNumber = (currentPage - 1) * limit + (index + 1);

                    return (
                      <TableRow
                        key={petani.id}
                        onClick={() => setDetailPetani(petani)}
                        className="cursor-pointer transition-colors border-[#F3F4F6] hover:bg-[#F9FAFB]"
                      >
                        {/* No */}
                        <TableCell className="text-center font-medium text-xs text-slate-400 py-3">
                          {rowNumber}
                        </TableCell>

                        {/* 1. Petani Mitra (Avatar, Name, Email) */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 rounded-full border border-slate-200 shrink-0">
                              <AvatarImage
                                src={petani.avatarUrl || ''}
                                alt={petani.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-emerald-700 text-white font-semibold text-xs">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-medium text-slate-900 truncate">
                                {petani.name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{petani.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Kontak & WhatsApp */}
                        <TableCell className="py-3 whitespace-nowrap">
                          {petani.phone ? (
                            <a
                              href={`https://wa.me/${petani.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[12px] text-emerald-700 hover:underline inline-flex items-center gap-1.5 font-medium"
                              title="Hubungi via WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{petani.phone}</span>
                              <ExternalLink className="w-3 h-3 text-emerald-500 opacity-70" />
                            </a>
                          ) : (
                            <span className="text-[12px] text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* 3. Wilayah & Alamat */}
                        <TableCell className="py-3">
                          {petani.address ? (
                            <div className="flex items-center gap-1.5 text-[12px] text-slate-600 max-w-[220px]">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate" title={petani.address}>
                                {petani.address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* 4. Terdaftar Sejak */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <span className="text-[12px] text-slate-600">
                            {new Date(petani.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>

                        {/* 5. Status Verifikasi (Klik untuk ubah cepat) */}
                        <TableCell className="py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setPetaniToVerify(petani);
                              setVerifyDialogOpen(true);
                            }}
                            className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11.5px] font-medium transition cursor-pointer hover:opacity-80 ${
                              petani.isVerified
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                            title="Klik untuk mengubah status verifikasi"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                petani.isVerified ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            <span>{petani.isVerified ? 'Terverifikasi' : 'Menunggu'}</span>
                          </button>
                        </TableCell>

                        {/* 6. Aksi & Pengelolaan */}
                        <TableCell className="py-3 pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailPetani(petani)}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                              title="Lihat Detail Profil"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Edit Buka Halaman Penuh */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPetani(petani);
                                setViewMode('FORM');
                              }}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                              title="Edit Data Petani (Halaman Baru)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPetaniToDelete(petani);
                                setDeleteDialogOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                              title="Hapus Petani"
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
                  {pagination.totalCount > 0 ? (currentPage - 1) * limit + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-800 font-semibold">
                  {Math.min(currentPage * limit, pagination.totalCount)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-800 font-semibold">
                  {pagination.totalCount}
                </strong>{' '}
                total petani mitra
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

            {/* Pagination Nav Persis Gambar 3 */}
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

      {/* Modal Detail Profil Petani Mitra */}
      <Dialog open={Boolean(detailPetani)} onOpenChange={(open) => !open && setDetailPetani(null)}>
        <DialogContent
          showCloseButton={false}
          data-lenis-prevent="true"
          className="max-w-md w-[95vw] p-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {detailPetani && (
            <>
              {/* Header Modal */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-[#FAFBFD]">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 rounded-full border border-slate-200 shrink-0">
                    <AvatarImage src={detailPetani.avatarUrl || ''} alt={detailPetani.name} />
                    <AvatarFallback className="bg-emerald-700 text-white font-semibold text-sm">
                      {detailPetani.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="text-[15px] font-semibold text-slate-900 truncate">
                      {detailPetani.name}
                    </DialogTitle>
                    <span className="text-[11px] text-slate-400">Petani Mitra Koperasi</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[11px] font-medium ${
                      detailPetani.isVerified
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        detailPetani.isVerified ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    {detailPetani.isVerified ? 'Terverifikasi' : 'Menunggu'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setDetailPetani(null)}
                    className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body Modal Detail */}
              <div
                className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0 text-xs"
                onWheel={(e) => e.stopPropagation()}
              >
                <section className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-[12px] font-semibold text-slate-800">
                      Informasi Kontak & Akun
                    </h3>
                  </div>

                  <dl className="divide-y divide-slate-100">
                    <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                      <dt className="text-slate-500">Nama Lengkap</dt>
                      <dd className="font-medium text-slate-900">{detailPetani.name}</dd>
                    </div>

                    <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                      <dt className="text-slate-500">Email</dt>
                      <dd className="font-medium text-slate-900">{detailPetani.email}</dd>
                    </div>

                    <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                      <dt className="text-slate-500">No. Telp / WA</dt>
                      <dd className="font-medium">
                        {detailPetani.phone ? (
                          <a
                            href={`https://wa.me/${detailPetani.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                            title="Hubungi via WhatsApp"
                          >
                            {detailPetani.phone}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </dd>
                    </div>

                    <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                      <dt className="text-slate-500">Alamat Lengkap</dt>
                      <dd className="font-medium text-slate-900 leading-relaxed">
                        {detailPetani.address || '-'}
                      </dd>
                    </div>

                    <div className="px-4 py-2.5 grid grid-cols-[120px_1fr] gap-3">
                      <dt className="text-slate-500">Terdaftar Sejak</dt>
                      <dd className="font-medium text-slate-900">
                        {new Date(detailPetani.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              {/* Footer Modal Actions */}
              <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = detailPetani;
                    setDetailPetani(null);
                    setPetaniToDelete(toDelete);
                    setDeleteDialogOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = detailPetani;
                      setDetailPetani(null);
                      setSelectedPetani(toEdit);
                      setViewMode('FORM');
                    }}
                    className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Data</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const toVerify = detailPetani;
                      setDetailPetani(null);
                      setPetaniToVerify(toVerify);
                      setVerifyDialogOpen(true);
                    }}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                      detailPetani.isVerified
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{detailPetani.isVerified ? 'Batalkan Verifikasi' : 'Verifikasi Akun'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Petani */}
      <UserDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={fetchPetani}
        user={petaniToDelete}
      />

      {/* Modal Konfirmasi Verifikasi Petani */}
      <UserVerifyDialog
        isOpen={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
        onSuccess={fetchPetani}
        user={petaniToVerify}
      />
    </div>
  );
}
