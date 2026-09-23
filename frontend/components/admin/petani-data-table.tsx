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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserFormModal } from '@/components/admin/user-form-modal';
import { UserDeleteDialog } from '@/components/admin/user-delete-dialog';
import { UserVerifyDialog } from '@/components/admin/user-verify-dialog';
import { useDebounce } from '@/hooks/use-debounce';

interface PetaniUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  kelompokTani: {
    id: string;
    nama: string;
    desa: string;
    kecamatan: string;
    komoditasUtama: string;
  } | null;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export function PetaniDataTable() {
  const [petaniList, setPetaniList] = useState<PetaniUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 8,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Optimasi 1: Debounce 300ms untuk input pencarian
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Optimasi 2: AbortController untuk membatalkan request lama
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedPetani, setSelectedPetani] = useState<PetaniUser | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [petaniToDelete, setPetaniToDelete] = useState<PetaniUser | null>(null);

  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [petaniToVerify, setPetaniToVerify] = useState<PetaniUser | null>(null);

  // Reset ke halaman 1 saat filter atau search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

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
        limit: '8',
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
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching petani:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, filterStatus]);

  useEffect(() => {
    fetchPetani();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPetani]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Data Petani Koperasi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {pagination.totalCount} Petani Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data dan verifikasi anggota petani binaan Koperasi Sinar Pagi Sejahtera Minahasa Utara.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPetani}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>

          {/* Button Tambah Petani */}
          <button
            onClick={() => {
              setSelectedPetani(null);
              setFormMode('CREATE');
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Petani</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama petani, kelompok tani, atau desa..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterStatus('VERIFIED')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'VERIFIED'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Terverifikasi</span>
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'PENDING'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Menunggu</span>
          </button>
        </div>
      </div>

      {/* Shadcn Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-emerald-50/70 border-b border-emerald-100">
            <TableRow className="hover:bg-transparent border-emerald-100">
              <TableHead className="w-12 text-center text-emerald-950 font-bold text-xs py-3.5">
                No
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Petani
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Kontak Telepon
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Kelompok Tani & Wilayah
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Komoditas Utama
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Status Verifikasi
              </TableHead>
              <TableHead className="text-right text-emerald-950 font-bold text-xs pr-4">
                Aksi & Pengelolaan
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat data petani dari backend...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : petaniList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {searchQuery
                        ? 'Tidak ada data petani yang cocok dengan pencarian'
                        : 'Belum ada data petani terdaftar di database'}
                    </span>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      {searchQuery
                        ? 'Coba gunakan kata kunci pencarian lain.'
                        : 'Mulai daftarkan petani anggota binaan koperasi dengan menekan tombol di bawah.'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => {
                          setSelectedPetani(null);
                          setFormMode('CREATE');
                          setFormModalOpen(true);
                        }}
                        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Petani Sekarang</span>
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              petaniList.map((petani, index) => {
                const initial = petani.name.charAt(0).toUpperCase();
                const rowNumber = (pagination.currentPage - 1) * pagination.limit + (index + 1);

                return (
                  <TableRow
                    key={petani.id}
                    className="hover:bg-emerald-50/30 transition-colors border-slate-100"
                  >
                    {/* No */}
                    <TableCell className="text-center font-medium text-xs text-slate-400">
                      {rowNumber}
                    </TableCell>

                    {/* Petani Info */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9 rounded-xl border border-emerald-200 shrink-0">
                          <AvatarImage src={petani.avatarUrl || ''} alt={petani.name} className="object-cover" />
                          <AvatarFallback className="rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {petani.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{petani.email}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Kontak */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{petani.phone || '-'}</span>
                      </div>
                    </TableCell>

                    {/* Kelompok Tani */}
                    <TableCell>
                      {petani.kelompokTani ? (
                        <div>
                          <div className="font-semibold text-xs text-slate-800">
                            {petani.kelompokTani.nama}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-emerald-700 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>
                              Desa {petani.kelompokTani.desa}, Kec. {petani.kelompokTani.kecamatan}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Petani Mandiri
                        </span>
                      )}
                    </TableCell>

                    {/* Komoditas */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                        <Sprout className="w-3 h-3 text-emerald-600" />
                        <span>{petani.kelompokTani?.komoditasUtama || 'Komoditas Umum'}</span>
                      </span>
                    </TableCell>

                    {/* Status Verifikasi (Clickable for quick modal verification) */}
                    <TableCell>
                      <button
                        onClick={() => {
                          setPetaniToVerify(petani);
                          setVerifyDialogOpen(true);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer hover:scale-105 active:scale-95 ${
                          petani.isVerified
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title="Klik untuk mengubah status verifikasi"
                      >
                        {petani.isVerified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Terverifikasi</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Menunggu</span>
                          </>
                        )}
                      </button>
                    </TableCell>

                    {/* Action Buttons (Edit & Delete with pop-up modal dialogs) */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPetani(petani);
                            setFormMode('EDIT');
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 transition cursor-pointer"
                          title="Edit Data Petani"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setPetaniToDelete(petani);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-400 hover:text-red-600 transition cursor-pointer"
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

        {/* Footer with shadcn Pagination Component */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan{' '}
            <strong className="text-slate-800">
              {petaniList.length > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0}
            </strong>
            -
            <strong className="text-slate-800">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
            </strong>{' '}
            dari <strong className="text-slate-800">{pagination.totalCount}</strong> petani
          </div>

          {pagination.totalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading}
                  />
                </PaginationItem>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === currentPage}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage >= pagination.totalPages || isLoading}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Modal 1: Create & Edit Form Dialog */}
      <UserFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={fetchPetani}
        mode={formMode}
        role="PETANI"
        initialData={
          selectedPetani
            ? {
                id: selectedPetani.id,
                name: selectedPetani.name,
                email: selectedPetani.email,
                phone: selectedPetani.phone,
                kelompokTaniId: selectedPetani.kelompokTani?.id || null,
                isVerified: selectedPetani.isVerified,
              }
            : null
        }
      />

      {/* Modal 2: Delete Confirmation Dialog */}
      <UserDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={fetchPetani}
        user={petaniToDelete}
      />

      {/* Modal 3: Verification Confirmation Dialog */}
      <UserVerifyDialog
        isOpen={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
        onSuccess={fetchPetani}
        user={petaniToVerify}
      />
    </div>
  );
}
