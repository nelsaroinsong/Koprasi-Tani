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
  Package,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  EyeOff,
  Tag,
  ShoppingBag,
  User,
  Calendar,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/context/toast-context';
import {
  ProductFormModal,
  AdminProductData,
  PetaniOption,
} from './product-form-modal';
import { ProductDeleteDialog } from './product-delete-dialog';

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export function TokoOnlineDataTable() {
  const { showToast } = useToast();

  const [productList, setProductList] = useState<AdminProductData[]>([]);
  const [petaniOptions, setPetaniOptions] = useState<PetaniOption[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 8,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedProduct, setSelectedProduct] = useState<AdminProductData | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<AdminProductData | null>(null);

  // Status Filter Options
  const statusOptions: ComboboxOption[] = useMemo(
    () => [
      {
        value: 'ALL',
        label: 'Semua Status',
        icon: <span className="w-2 h-2 rounded-full bg-slate-400" />,
      },
      {
        value: 'AVAILABLE',
        label: 'Aktif Dijual',
        icon: <span className="w-2 h-2 rounded-full bg-emerald-500" />,
      },
      {
        value: 'UNAVAILABLE',
        label: 'Nonaktif',
        icon: <span className="w-2 h-2 rounded-full bg-slate-300" />,
      },
    ],
    []
  );

  // Kategori Filter Options
  const kategoriOptions: ComboboxOption[] = useMemo(
    () => [
      { value: 'SEMUA', label: 'Semua Kategori' },
      { value: 'Kelapa', label: 'Kelapa' },
      { value: 'Jagung', label: 'Jagung' },
      { value: 'Turunan', label: 'Turunan' },
      { value: 'Olahan', label: 'Olahan' },
    ],
    []
  );

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterKategori, filterStatus]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '8',
      });

      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      if (filterKategori !== 'SEMUA') {
        params.set('kategori', filterKategori);
      }

      if (filterStatus !== 'ALL') {
        params.set('status', filterStatus);
      }

      const res = await fetch(`/api/admin/products?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.products)) {
        setProductList(data.products);
        if (data.petaniOptions) {
          setPetaniOptions(data.petaniOptions);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching admin products:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, filterKategori, filterStatus]);

  useEffect(() => {
    fetchProducts();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProducts]);

  // Toggle Status Cepat
  const handleToggleStatus = async (product: AdminProductData) => {
    const nextStatus = !product.isTersedia;
    try {
      // Optimistic update
      setProductList((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isTersedia: nextStatus } : p))
      );

      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTersedia: nextStatus }),
      });

      if (!res.ok) {
        throw new Error('Gagal memperbarui status ketersediaan');
      }

      showToast({
        title: nextStatus ? 'Komoditas Diaktifkan' : 'Komoditas Dinonaktifkan',
        message: `Produk "${product.nama}" sekarang ${
          nextStatus ? 'aktif dijual di toko koperasi.' : 'dinonaktifkan sementara dari toko.'
        }`,
        type: 'info',
      });
    } catch (err: any) {
      // Revert optimistic update
      setProductList((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isTersedia: !nextStatus } : p))
      );
      showToast({
        title: 'Gagal Ubah Status',
        message: err.message || 'Terjadi kesalahan.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Katalog & Stok Fisik Gudang Komoditas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {pagination.totalCount} Komoditas di Gudang
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan fisik hasil panen yang dibawa petani ke gudang koperasi. Produk yang didata admin otomatis tayang di Toko Online Koperasi.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchProducts}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-2xs"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>

          {/* Button Input Komoditas Masuk Gudang */}
          <button
            onClick={() => {
              setSelectedProduct(null);
              setFormMode('CREATE');
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Input Komoditas Masuk Gudang</span>
          </button>
        </div>
      </div>

      {/* Info Banner Alur B Satu Pintu */}
      <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5 text-xs">
        <Package className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-slate-700 leading-relaxed text-[11px]">
          <strong className="text-emerald-900">Alur Masuk Fisik Barang:</strong> Petani membawa hasil panen ke gudang koperasi. Admin menimbang dan menginput data komoditas dengan memilih nama petani pemilik. Uang tunai hasil penjualan komoditas akan otomatis dialokasikan ke petani tersebut.
        </div>
      </div>

      {/* Toolbar: Search & Combobox Filtering */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari komoditas, kategori, atau nama petani..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs transition"
            />
          </div>

          {/* Combobox Filter Kategori */}
          <Combobox
            options={kategoriOptions}
            value={filterKategori}
            onValueChange={(val) => setFilterKategori(val)}
            placeholder="Pilih Kategori..."
            searchPlaceholder="Cari kategori..."
            className="w-full sm:w-40"
          />

          {/* Combobox Filter Status */}
          <Combobox
            options={statusOptions}
            value={filterStatus}
            onValueChange={(val) => setFilterStatus(val as any)}
            placeholder="Status Ketersediaan..."
            searchPlaceholder="Cari status..."
            className="w-full sm:w-44"
          />
        </div>

        <div className="text-xs text-slate-500 hidden sm:block shrink-0">
          Total Komoditas: <strong className="text-emerald-700 font-semibold">{pagination.totalCount}</strong>
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
              <TableHead className="text-emerald-950 font-bold text-xs min-w-[220px]">
                Komoditas
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Petani / Pemilik
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Harga per Satuan
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Stok Tersedia
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Status Ketersediaan
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
                    <span className="text-xs">Memuat katalog komoditas dari database...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : productList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {searchQuery || filterKategori !== 'SEMUA' || filterStatus !== 'ALL'
                        ? 'Tidak ada produk komoditas yang cocok dengan filter'
                        : 'Belum ada data komoditas di katalog toko online'}
                    </span>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      {searchQuery || filterKategori !== 'SEMUA' || filterStatus !== 'ALL'
                        ? 'Coba ubah kata kunci pencarian atau reset filter kategori/status.'
                        : 'Mulai daftarkan hasil panen kelapa, jagung, atau kopra ke toko koperasi.'}
                    </p>
                    {!searchQuery && filterKategori === 'SEMUA' && filterStatus === 'ALL' && (
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setFormMode('CREATE');
                          setFormModalOpen(true);
                        }}
                        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Komoditas Sekarang</span>
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              productList.map((prod, index) => {
                const rowNumber = (pagination.currentPage - 1) * pagination.limit + (index + 1);

                return (
                  <TableRow
                    key={prod.id}
                    className="hover:bg-emerald-50/30 transition-colors border-slate-100"
                  >
                    {/* No */}
                    <TableCell className="text-center font-medium text-xs text-slate-400">
                      {rowNumber}
                    </TableCell>

                    {/* Komoditas: Image + Name + Badge Kategori */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              prod.imageUrl ||
                              'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=300&q=80'
                            }
                            alt={prod.nama}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=300&q=80';
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                            {prod.nama}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              <Tag className="w-2.5 h-2.5" />
                              {prod.kategori}
                            </span>
                            {prod.deskripsi && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                {prod.deskripsi}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Petani / Pemilik */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 rounded-lg border border-slate-200 shrink-0">
                          <AvatarImage src={prod.petani?.avatarUrl || ''} alt={prod.petani?.name || ''} />
                          <AvatarFallback className="rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {prod.petani?.name ? prod.petani.name.charAt(0).toUpperCase() : 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {prod.petani?.name || 'Petani Binaan'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {prod.petani?.email || '-'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Harga Satuan */}
                    <TableCell>
                      <div className="text-xs font-bold text-slate-900">
                        Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                        <span className="font-normal text-slate-500 text-[11px]"> /{prod.satuan}</span>
                      </div>
                    </TableCell>

                    {/* Stok */}
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                          {Number(prod.stok).toLocaleString('id-ID')} {prod.satuan}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status Ketersediaan (Klik Cepat untuk Toggle) */}
                    <TableCell>
                      <button
                        onClick={() => handleToggleStatus(prod)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer hover:scale-105 active:scale-95 ${
                          prod.isTersedia
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status ketersediaan"
                      >
                        {prod.isTersedia ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Aktif Dijual</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </button>
                    </TableCell>

                    {/* Action Buttons: Edit & Hapus */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedProduct(prod);
                            setFormMode('EDIT');
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 transition cursor-pointer"
                          title="Edit Data Komoditas"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setProductToDelete(prod);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Hapus Komoditas"
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

        {/* Table Footer with Info & Shadcn Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Menampilkan{' '}
            <strong className="text-slate-800">
              {productList.length > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0}
            </strong>
            -
            <strong className="text-slate-800">
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
            </strong>{' '}
            dari <strong className="text-slate-800">{pagination.totalCount}</strong> komoditas
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

      {/* Modal 1: Create & Edit Form Modal */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={fetchProducts}
        mode={formMode}
        initialData={selectedProduct}
        petaniOptions={petaniOptions}
      />

      {/* Modal 2: Delete Confirmation Dialog */}
      <ProductDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={fetchProducts}
        product={productToDelete}
      />
    </div>
  );
}
