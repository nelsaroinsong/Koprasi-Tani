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
  Search,
  Package,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Check,
  Layers,
  EyeOff,
  Tag,
  ShoppingBag,
  User,
  Calendar,
  MapPin,
  Camera,
  Upload,
  LocateFixed,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/context/toast-context';
import { useAdmin } from '@/components/admin/admin-context';
import defaultCategoriesData from '@/data/categories.json';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  const { setActiveTab } = useAdmin();

  const [categoriesList, setCategoriesList] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('koperasi_categories_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultCategoriesData;
  });

  const [productList, setProductList] = useState<AdminProductData[]>([]);
  const [petaniOptions, setPetaniOptions] = useState<PetaniOption[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Checkbox Select & Bulk Delete States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  // Quick Photo Upload States
  const [quickPhotoProduct, setQuickPhotoProduct] = useState<AdminProductData | null>(null);
  const [isQuickPhotoOpen, setIsQuickPhotoOpen] = useState(false);
  const [quickUploadingSource, setQuickUploadingSource] = useState<'CAMERA' | 'GALLERY' | null>(null);
  const quickCameraInputRef = useRef<HTMLInputElement>(null);
  const quickGalleryInputRef = useRef<HTMLInputElement>(null);

  // Warehouse Address States
  const [warehouseAddress, setWarehouseAddress] = useState(
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara'
  );
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Fetch cooperative warehouse address
  const fetchCoopInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/koperasi/info');
      const data = await res.json();
      if (data?.alamat) {
        setWarehouseAddress(data.alamat);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCoopInfo();
  }, [fetchCoopInfo]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempAddress.trim()) return;
    try {
      setIsSavingAddress(true);
      const res = await fetch('/api/koperasi/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alamat: tempAddress.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah alamat gudang.');
      setWarehouseAddress(data.alamat);
      setIsEditAddressOpen(false);
      showToast({
        title: 'Alamat Gudang Diperbarui',
        message: 'Alamat serah terima barang di toko online telah berhasil diperbarui.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Simpan Alamat',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  // State & Handler untuk Fitur 'Gunakan Lokasi Sekarang' (Geolocation GPS & Reverse Geocode)
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast({
        title: 'Lokasi Tidak Didukung',
        message: 'Peramban Anda tidak mendukung deteksi lokasi (Geolocation).',
        type: 'error',
      });
      return;
    }

    try {
      setIsLocating(true);

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Panggil endpoint reverse geocode server internal
      const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();

      if (res.ok && data?.address) {
        setTempAddress(`Koperasi Sinar Pagi Sejahtera — ${data.address}`);
        showToast({
          title: 'Lokasi Berhasil Dideteksi',
          message: 'Alamat gudang telah otomatis disesuaikan dengan posisi GPS Anda saat ini.',
          type: 'success',
        });
      } else {
        setTempAddress(
          `Koperasi Sinar Pagi Sejahtera — Titik GPS (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
        );
        showToast({
          title: 'Koordinat GPS Ditemukan',
          message: 'Titik koordinat berhasil dimasukkan ke kolom alamat.',
          type: 'info',
        });
      }
    } catch (err: any) {
      // Jika pengguna membatalkan (cancel / block) izin akses lokasi browser
      if (err?.code === 1) {
        showToast({
          title: 'Akses Lokasi Dibatalkan',
          message: 'Permintaan lokasi dibatalkan. Anda tetap dapat mengetikkan alamat secara manual.',
          type: 'info',
        });
        return;
      }

      console.warn('Geolocation notice:', err?.message || err);
      let errMsg = 'Gagal mendeteksi lokasi saat ini.';
      if (err?.code === 2) {
        errMsg = 'Informasi sinyal lokasi GPS tidak tersedia pada perangkat.';
      } else if (err?.code === 3) {
        errMsg = 'Waktu permintaan deteksi lokasi habis. Silakan coba kembali.';
      }

      showToast({
        title: 'Gagal Deteksi Lokasi',
        message: errMsg,
        type: 'error',
      });
    } finally {
      setIsLocating(false);
    }
  };

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
  const kategoriOptions: ComboboxOption[] = useMemo(() => {
    const all = [{ value: 'SEMUA', label: 'Semua Kategori' }];
    const items = categoriesList.map((c: any) => ({
      value: c.name,
      label: `${c.emoji ? c.emoji + ' ' : ''}${c.name}`,
    }));
    return [...all, ...items];
  }, [categoriesList]);

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
        limit: String(limit),
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
        if (data.stats) {
          setStats(data.stats);
        }
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
  }, [currentPage, limit, debouncedSearch, filterKategori, filterStatus]);

  // Bulk Selection Helpers
  const isAllCurrentPageSelected =
    productList.length > 0 &&
    productList.every((p) => (p.id ? selectedIds.includes(p.id) : false));

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(productList.map((p) => p.id).filter(Boolean) as string[]);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newSet = new Set(selectedIds);
      productList.forEach((p) => {
        if (p.id) newSet.add(p.id);
      });
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Konfirmasi Hapus Massal Produk
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus produk terpilih');
      }

      showToast({
        title: 'Penghapusan Massal Berhasil',
        message: `${selectedIds.length} komoditas berhasil dihapus dari katalog toko online.`,
        type: 'success',
      });

      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Menghapus Banyak',
        message: err.message || 'Terjadi gangguan saat menghapus komoditas.',
        type: 'error',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProducts]);

  // Handler Upload Foto Cepat Tanpa Buka Modal Edit Penuh
  const handleQuickPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    source: 'CAMERA' | 'GALLERY'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !quickPhotoProduct) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format Salah',
        message: 'Berkas harus berupa gambar (JPG, PNG, atau WebP).',
        type: 'error',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: 'Ukuran Terlalu Besar',
        message: 'Ukuran gambar maksimal 5 MB.',
        type: 'error',
      });
      return;
    }

    try {
      setQuickUploadingSource(source);
      const formData = new FormData();
      formData.append('file', file);

      // 1. Upload ke Cloudflare R2
      const res = await fetch('/api/upload/product', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto produk.');
      }

      const newImageUrl = data.url;

      // 2. Langsung update kolom imageUrl di database tanpa perlu isi form lainnya
      const updateRes = await fetch(`/api/admin/products/${quickPhotoProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: newImageUrl,
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.error || 'Gagal memperbarui foto komoditas di database.');
      }

      showToast({
        title: 'Foto Komoditas Berhasil Diperbarui',
        message: `Foto fisik untuk "${quickPhotoProduct.nama}" berhasil disimpan & tayang.`,
        type: 'success',
      });

      // Update state lokal langsung
      setProductList((prev) =>
        prev.map((p) => (p.id === quickPhotoProduct.id ? { ...p, imageUrl: newImageUrl } : p))
      );

      setIsQuickPhotoOpen(false);
      setQuickPhotoProduct(null);
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Memperbarui Foto',
        message: err.message || 'Terjadi gangguan saat mengunggah foto.',
        type: 'error',
      });
    } finally {
      setQuickUploadingSource(null);
      if (quickCameraInputRef.current) quickCameraInputRef.current.value = '';
      if (quickGalleryInputRef.current) quickGalleryInputRef.current.value = '';
    }
  };

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
      {/* 1. Stat Cards: Sesuai Desain Halaman Sewa Alat & Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.total || pagination.totalCount}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Total Komoditas (Gudang)
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.active}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Stok Siap Jual / Aktif
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.inactive}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Nonaktif / Habis
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-800 text-white rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] text-emerald-200 font-medium">Layanan Toko Online</div>
          <div className="text-sm font-bold flex items-center justify-between mt-1">
            <span>Katalog Publik</span>
            <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar: Search, Filter Kategori, Filter Status, Refresh, Kelola Kategori, Tambah */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari komoditas, kategori, atau nama petani..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Combobox Filter Kategori */}
          <Combobox
            options={kategoriOptions}
            value={filterKategori}
            onValueChange={(val) => setFilterKategori(val)}
            placeholder="Pilih Kategori..."
            searchPlaceholder="Cari kategori..."
            className="w-full sm:w-44"
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

          <button
            onClick={fetchProducts}
            disabled={isLoading}
            title="Segarkan Data"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer shrink-0 self-center sm:self-auto shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('Produk dan Layanan', 'Kategori Komoditas')}
            className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs whitespace-nowrap"
            title="Buka Manajemen Kategori Komoditas"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kelola Kategori</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Produk dan Layanan', 'Tambah Komoditas')}
            className="flex-1 sm:flex-none py-2 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Input Komoditas Masuk Gudang</span>
          </button>
        </div>
      </div>

      {/* 3. Floating Bulk Action Bar (Saat Ada Komoditas Dipilih) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-bold text-emerald-900">
              {selectedIds.length} komoditas dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
            >
              Batal Pilihan
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.length}) Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Shadcn Data Table dengan Checkbox & Pagination Max 10 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-emerald-50/70 border-b border-emerald-100">
            <TableRow className="hover:bg-transparent border-emerald-100">
              <TableHead className="w-10 text-center py-3.5">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  onChange={toggleSelectAllCurrentPage}
                  aria-label="Pilih semua di halaman ini"
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
              </TableHead>
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
                <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat katalog komoditas dari database...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : productList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-44 text-center text-slate-500">
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
                    {/* Checkbox Select Row */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={prod.id ? selectedIds.includes(prod.id) : false}
                        onChange={() => prod.id && toggleSelectRow(prod.id)}
                        aria-label={`Pilih ${prod.nama}`}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                    </TableCell>

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

                    {/* Action Buttons: Quick Photo, Edit & Hapus */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setQuickPhotoProduct(prod);
                            setIsQuickPhotoOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-800 transition cursor-pointer shadow-2xs group"
                          title="Ganti Foto Cepat (Kamera HP / Galeri)"
                        >
                          <Camera className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('Produk dan Layanan', 'Tambah Komoditas', prod);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 transition cursor-pointer"
                          title="Edit Data Komoditas Lengkap"
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

        {/* Table Footer with Info & Pagination Persis Gambar 3 & Gambar 4 */}
        <div className="px-4 py-3 border-t border-[#F1F3F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
          <div className="flex items-center gap-3">
            <div>
              Menampilkan{' '}
              <strong className="text-slate-800 font-semibold">
                {productList.length > 0 ? (currentPage - 1) * limit + 1 : 0}
              </strong>{' '}
              -{' '}
              <strong className="text-slate-800 font-semibold">
                {Math.min(currentPage * limit, pagination.totalCount)}
              </strong>{' '}
              dari{' '}
              <strong className="text-slate-800 font-semibold">
                {pagination.totalCount}
              </strong>{' '}
              total komoditas
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

      {/* Modal 2.1: Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <span>Konfirmasi Hapus Massal Komoditas</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 leading-relaxed">
            Anda akan menghapus <strong className="text-red-600 font-bold">{selectedIds.length} komoditas</strong> yang dipilih dari katalog toko online koperasi.
            <p className="mt-2 text-slate-500">
              Tindakan ini tidak dapat dibatalkan. Riwayat ulasan dan rincian transaksi terkait komoditas ini akan dibersihkan secara aman.
            </p>
          </div>

          <DialogFooter className="mt-4 flex gap-2 justify-end">
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
              <span>Hapus {selectedIds.length} Komoditas</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Edit Warehouse Address Dialog */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <span>Ubah Alamat Kantor & Gudang Koperasi</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAddress} className="space-y-4 my-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Alamat ini akan ditampilkan kepada pembeli di halaman checkout sebagai lokasi pengambilan fisik komoditas pesanan.
            </p>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Alamat Lengkap Pengambilan *
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating || isSavingAddress}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200/70 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Deteksi alamat secara otomatis dari GPS saat ini"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      <span>Mendeteksi Lokasi...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Gunakan Lokasi Sekarang</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="Contoh: Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Minahasa Utara"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditAddressOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingAddress || !tempAddress.trim()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSavingAddress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Alamat Gudang</span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Quick Photo Upload Dialog (Mobile & Quick Action) */}
      <Dialog
        open={isQuickPhotoOpen}
        onOpenChange={(open) => {
          if (!quickUploadingSource) {
            setIsQuickPhotoOpen(open);
            if (!open) setQuickPhotoProduct(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div>Foto Fisik Komoditas</div>
                <p className="text-xs font-normal text-slate-500 mt-0.5">
                  Perbarui foto cepat tanpa membuka form edit
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {quickPhotoProduct && (
            <div className="space-y-4 my-2">
              {/* Product Info & Current Preview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shrink-0 relative">
                  <img
                    src={quickPhotoProduct.imageUrl || 'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=300&q=80'}
                    alt={quickPhotoProduct.nama}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=300&q=80';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {quickPhotoProduct.nama}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold text-[10px]">
                      {quickPhotoProduct.kategori}
                    </span>
                    <span>•</span>
                    <span className="truncate">{quickPhotoProduct.petani?.name || 'Petani Koperasi'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Foto saat ini ditampilkan di katalog toko
                  </div>
                </div>
              </div>

              {/* Hidden file inputs for Camera & Gallery */}
              <input
                ref={quickCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={quickUploadingSource !== null}
                onChange={(e) => handleQuickPhotoUpload(e, 'CAMERA')}
              />
              <input
                ref={quickGalleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={quickUploadingSource !== null}
                onChange={(e) => handleQuickPhotoUpload(e, 'GALLERY')}
              />

              {/* Upload Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Tombol Kamera HP */}
                <button
                  type="button"
                  onClick={() => quickCameraInputRef.current?.click()}
                  disabled={quickUploadingSource !== null}
                  className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-600 transition cursor-pointer text-center group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                    {quickUploadingSource === 'CAMERA' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {quickUploadingSource === 'CAMERA' ? 'Mengunggah Foto...' : 'Jepret Kamera HP'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Kamera belakang ponsel
                  </span>
                </button>

                {/* 2. Tombol Galeri Foto */}
                <button
                  type="button"
                  onClick={() => quickGalleryInputRef.current?.click()}
                  disabled={quickUploadingSource !== null}
                  className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer text-center group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    {quickUploadingSource === 'GALLERY' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {quickUploadingSource === 'GALLERY' ? 'Mengunggah Foto...' : 'Pilih dari Galeri'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    JPG, PNG, atau WebP
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Foto akan otomatis dioptimasi, disimpan aman, dan langsung diperbarui di toko.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={quickUploadingSource !== null}
              onClick={() => {
                setIsQuickPhotoOpen(false);
                setQuickPhotoProduct(null);
              }}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              Tutup
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
