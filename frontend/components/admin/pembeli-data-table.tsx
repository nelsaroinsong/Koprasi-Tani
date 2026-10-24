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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserFormModal } from '@/components/admin/user-form-modal';
import { UserDeleteDialog } from '@/components/admin/user-delete-dialog';
import { useDebounce } from '@/hooks/use-debounce';

interface PembeliUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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

  // Optimasi 1: Debounce 300ms pada pencarian teks agar tidak membebani server
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Optimasi 2: AbortController untuk membatalkan request sebelumnya jika user mengetik cepat
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedPembeli, setSelectedPembeli] = useState<PembeliUser | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pembeliToDelete, setPembeliToDelete] = useState<PembeliUser | null>(null);

  // Reset page saat pencarian atau limit berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, limit]);

  const fetchPembeli = useCallback(async () => {
    // Batalkan request yang sedang berjalan jika ada
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

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Data Pembeli & Pelanggan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {pagination.totalCount} Pembeli Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Daftar konsumen dan pelaku usaha pembeli hasil agribisnis Koperasi Sinar Pagi Sejahtera.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPembeli}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>

          {/* Button Tambah Pembeli */}
          <button
            onClick={() => {
              setSelectedPembeli(null);
              setFormMode('CREATE');
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pembeli</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search input */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pembeli, email, atau nomor telepon..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs transition"
          />
        </div>

        <div className="text-xs text-slate-500 hidden sm:block shrink-0">
          Total Terdata: <strong className="text-emerald-700 font-semibold">{pagination.totalCount}</strong>
        </div>
      </div>

      {/* Shadcn Data Table (Kolom Peran Akun Dihapus Sesuai Permintaan) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-emerald-50/70 border-b border-emerald-100">
            <TableRow className="hover:bg-transparent border-emerald-100">
              <TableHead className="w-12 text-center text-emerald-950 font-bold text-xs py-3.5">
                No
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Pembeli
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Email
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Nomor Telepon / WhatsApp
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Status Akun
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Terdaftar Sejak
              </TableHead>
              <TableHead className="text-right text-emerald-950 font-bold text-xs pr-4">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat data pembeli...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : pembeliList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-slate-300" />
                    <span className="text-xs font-bold text-slate-800">
                      {searchQuery
                        ? 'Tidak ada data pembeli yang cocok dengan pencarian'
                        : 'Belum ada data pembeli terdaftar di database'}
                    </span>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      {searchQuery
                        ? 'Coba sesuaikan kata kunci pencarian.'
                        : 'Daftarkan pembeli pertama dengan menekan tombol Tambah Pembeli.'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => {
                          setSelectedPembeli(null);
                          setFormMode('CREATE');
                          setFormModalOpen(true);
                        }}
                        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Pembeli Sekarang</span>
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pembeliList.map((pembeli, index) => {
                const initial = pembeli.name.charAt(0).toUpperCase();
                const rowNumber = (pagination.currentPage - 1) * pagination.limit + (index + 1);
                const joinedDate = new Date(pembeli.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <TableRow
                    key={pembeli.id}
                    className="hover:bg-emerald-50/30 transition-colors border-slate-100"
                  >
                    {/* No */}
                    <TableCell className="text-center font-medium text-xs text-slate-400">
                      {rowNumber}
                    </TableCell>

                    {/* Pembeli Info */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9 rounded-xl border border-blue-200 shrink-0">
                          <AvatarImage src={pembeli.avatarUrl || ''} alt={pembeli.name} className="object-cover" />
                          <AvatarFallback className="rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {pembeli.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-emerald-600" />
                            <span>Konsumen Komoditas</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{pembeli.email}</span>
                      </div>
                    </TableCell>

                    {/* Kontak */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{pembeli.phone || '-'}</span>
                      </div>
                    </TableCell>

                    {/* Status Akun */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Aktif</span>
                      </span>
                    </TableCell>

                    {/* Tanggal Terdaftar */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{joinedDate}</span>
                      </div>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPembeli(pembeli);
                            setFormMode('EDIT');
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 transition cursor-pointer"
                          title="Edit Data Pembeli"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setPembeliToDelete(pembeli);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-400 hover:text-red-600 transition cursor-pointer"
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

        {/* Footer Pagination Persis Gambar 3 & Gambar 4 */}
        <div className="px-4 py-3 border-t border-[#F1F3F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
          <div className="flex items-center gap-3">
            <div>
              Menampilkan{' '}
              <strong className="text-slate-800 font-semibold">
                {pembeliList.length > 0 ? (currentPage - 1) * limit + 1 : 0}
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

      {/* Modal 1: Create & Edit Form Dialog */}
      <UserFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={fetchPembeli}
        mode={formMode}
        role="PEMBELI"
        initialData={
          selectedPembeli
            ? {
                id: selectedPembeli.id,
                name: selectedPembeli.name,
                email: selectedPembeli.email,
                phone: selectedPembeli.phone,
                avatarUrl: selectedPembeli.avatarUrl,
                isVerified: selectedPembeli.isVerified,
              }
            : null
        }
      />

      {/* Modal 2: Delete Confirmation Dialog */}
      <UserDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={fetchPembeli}
        user={pembeliToDelete}
      />
    </div>
  );
}
