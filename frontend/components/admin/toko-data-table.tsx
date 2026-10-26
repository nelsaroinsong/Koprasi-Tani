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
  EyeOff,
  Tag,
  ShoppingBag,
  MapPin,
  Camera,
  Upload,
  LocateFixed,
  Download,
  XCircle,
  ExternalLink,
  Store,
  ArrowUpDown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
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
import { ProductDeleteDialog } from './product-delete-dialog';
import { AdminProductData, PetaniOption } from './product-form-modal';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

type FilterStatusKey = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';

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
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<FilterStatusKey>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Checkbox Select & Bulk Delete States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // Single Delete Dialog
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
  const [isLocating, setIsLocating] = useState(false);

  // Fetch warehouse address
  const fetchCoopInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/koperasi/info');
      const data = await res.json();
      if (data?.alamat) {
        setWarehouseAddress(data.alamat);
      }
    } catch {}
  }, []);

  // Fetch updated categories list
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategoriesList(data.categories);
        try {
          localStorage.setItem('koperasi_categories_cache', JSON.stringify(data.categories));
        } catch {}
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCoopInfo();
    fetchCategories();
  }, [fetchCoopInfo, fetchCategories]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, filterKategori, filterStatus, limit]);

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

  useEffect(() => {
    fetchProducts();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProducts]);

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
        message: `${selectedIds.length} komoditas berhasil dihapus dari katalog toko.`,
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

  // Toggle Status Cepat (Aktif / Nonaktif)
  const handleToggleStatus = async (product: AdminProductData) => {
    const nextStatus = !product.isTersedia;
    try {
      // Optimistic update
      setProductList((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isTersedia: nextStatus } : p))
      );
      setStats((prev) => ({
        ...prev,
        active: nextStatus ? prev.active + 1 : Math.max(0, prev.active - 1),
        inactive: nextStatus ? Math.max(0, prev.inactive - 1) : prev.inactive + 1,
      }));

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
        message: `Produk "${product.nama}" ${
          nextStatus ? 'kini aktif tayang di toko koperasi.' : 'dinonaktifkan sementara dari toko.'
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
        message: err.message || 'Terjadi kesalahan sistem.',
        type: 'error',
      });
      fetchProducts();
    }
  };

  // Upload Foto Cepat
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

      const res = await fetch('/api/upload/product', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto produk.');
      }

      const newImageUrl = data.url;

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
        title: 'Foto Komoditas Diperbarui',
        message: `Foto fisik untuk "${quickPhotoProduct.nama}" berhasil disimpan & tayang.`,
        type: 'success',
      });

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

  // Simpan Alamat Gudang
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

  // Deteksi Lokasi Sekarang (GPS Geolocation)
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
      const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();

      if (res.ok && data?.address) {
        setTempAddress(`Koperasi Sinar Pagi Sejahtera — ${data.address}`);
        showToast({
          title: 'Lokasi Dideteksi',
          message: 'Alamat gudang disesuaikan dengan posisi GPS Anda saat ini.',
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
      if (err?.code === 1) {
        showToast({
          title: 'Akses Lokasi Dibatalkan',
          message: 'Permintaan lokasi dibatalkan. Anda tetap dapat mengetik alamat secara manual.',
          type: 'info',
        });
        return;
      }
      showToast({
        title: 'Gagal Deteksi Lokasi',
        message: 'Pastikan izin akses lokasi peramban telah diaktifkan.',
        type: 'error',
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Ekspor Data Komoditas ke CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '500',
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (filterKategori !== 'SEMUA') params.set('kategori', filterKategori);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await res.json();
      const exportList: AdminProductData[] =
        data.success && Array.isArray(data.products) ? data.products : productList;

      if (exportList.length === 0) {
        showToast({
          title: 'Data Kosong',
          message: 'Tidak ada data komoditas untuk diekspor.',
          type: 'info',
        });
        return;
      }

      const headers = [
        'No',
        'Nama Komoditas',
        'Kategori',
        'Petani / Pemilik',
        'Kontak Petani',
        'Harga Satuan (Rp)',
        'Satuan',
        'Stok Tersedia',
        'Status Ketersediaan',
      ];
      const escapeCell = (val: string | number | null | undefined) =>
        `"${String(val ?? '').replace(/"/g, '""')}"`;

      const rows = exportList.map((p, idx) => [
        idx + 1,
        escapeCell(p.nama),
        escapeCell(p.kategori),
        escapeCell(p.petani?.name || 'Petani Koperasi'),
        escapeCell(p.petani?.phone || p.petani?.email || '-'),
        escapeCell(Number(p.hargaPerSatuan || 0)),
        escapeCell(p.satuan),
        escapeCell(Number(p.stok || 0)),
        escapeCell(p.isTersedia ? 'Aktif Dijual' : 'Nonaktif'),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `katalog-komoditas-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast({
        title: 'Ekspor Berhasil',
        message: `Berhasil mengunduh ${exportList.length} data komoditas ke CSV.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Export CSV error:', err);
      showToast({
        title: 'Gagal Ekspor',
        message: 'Terjadi gangguan saat mengekspor data komoditas.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Status Filter Tabs
  const TABS: { key: FilterStatusKey; label: string; dot?: string; count: number }[] = useMemo(
    () => [
      { key: 'ALL', label: 'Semua', count: stats.total || pagination.totalCount },
      { key: 'AVAILABLE', label: 'Aktif Dijual', dot: 'bg-emerald-500', count: stats.active },
      { key: 'UNAVAILABLE', label: 'Nonaktif / Habis', dot: 'bg-amber-500', count: stats.inactive },
    ],
    [stats, pagination.totalCount]
  );

  return (
    <div className="space-y-4">
      {/* 1. Stat Cards: Presisi & Serasi dengan Halaman Payouts, Petani & Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Komoditas */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Total Komoditas (Gudang)</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-slate-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {stats.total || pagination.totalCount}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Total ragam hasil panen di gudang
          </p>
        </div>

        {/* Card 2: Stok Siap Jual */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Stok Siap Jual / Aktif</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {stats.active}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Komoditas tayang aktif di toko online
          </p>
        </div>

        {/* Card 3: Nonaktif / Habis */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Nonaktif / Habis</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {stats.inactive}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Perlu restok panen atau penyesuaian
          </p>
        </div>

        {/* Card 4: Alamat Gudang Pengambilan & Serah Terima */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Alamat Gudang Serah Terima</span>
            <button
              type="button"
              onClick={() => {
                setTempAddress(warehouseAddress);
                setIsEditAddressOpen(true);
              }}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer"
              title="Ubah alamat fisik gudang atau gunakan GPS"
            >
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>Ubah / GPS</span>
            </button>
          </div>
          <div className="mt-2 text-[12.5px] font-semibold text-slate-800 line-clamp-1" title={warehouseAddress}>
            {warehouseAddress}
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[11.5px] text-slate-400">
            <span>Titik pickup pesanan pembeli</span>
            <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Gudang Aktif
            </span>
          </div>
        </div>
      </div>

      {/* 2. Kravio Outer Double-Container Shell */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        {/* Header: Judul + Counter + Link Publik */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Package className="w-4 h-4 text-slate-600 stroke-[1.8]" />
            <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
              Katalog Komoditas
            </h2>
            <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
              {pagination.totalCount}
            </span>
          </div>

          <a
            href="/toko"
            target="_blank"
            rel="noopener noreferrer"
            className="h-6 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md flex items-center gap-1 shadow-2xs hover:bg-slate-50 transition"
            title="Buka etalase toko online publik di tab baru"
          >
            <Store className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">Lihat Etalase Toko</span>
            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
          </a>
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

        {/* Toolbar: Search, Filter Kategori, Reset, Ekspor, Refresh, Kelola Kategori, Tambah */}
        <div className="px-3 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
            {/* Search Box */}
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari komoditas, petani..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[#E5E7EB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            {/* Kategori Filter Dropdown */}
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-[#E5E7EB] bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <option value="SEMUA">Semua Kategori</option>
              {categoriesList.map((cat: any) => (
                <option key={cat.id || cat.slug || cat.name} value={cat.name}>
                  {cat.emoji ? cat.emoji + ' ' : ''}{cat.name}
                </option>
              ))}
            </select>

            {/* Reset Button */}
            {(searchQuery || filterKategori !== 'SEMUA' || filterStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterKategori('SEMUA');
                  setFilterStatus('ALL');
                }}
                className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900 font-medium rounded-lg hover:bg-white transition cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Action Buttons: Ekspor, Refresh, Kelola Kategori, Tambah Komoditas */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50"
              title="Ekspor daftar komoditas ke file CSV"
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
              onClick={fetchProducts}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
              title="Segarkan data komoditas"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Produk dan Layanan', 'Kategori Komoditas')}
              className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              title="Buka manajemen kategori komoditas"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Kelola Kategori</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Produk dan Layanan', 'Tambah Komoditas')}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Komoditas</span>
            </button>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mx-3 mb-2 px-3 py-2 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-xs shadow-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">
                {selectedIds.length} komoditas dipilih
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Inner White Table Box */}
        <div className="bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#FAFBFD] border-b border-[#F1F3F5]">
                <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-3">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                      aria-label="Pilih semua di halaman ini"
                      className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    No
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap min-w-[240px]">
                    Komoditas
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Petani / Pemilik
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Harga per Satuan
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Stok Tersedia
                  </TableHead>
                  <TableHead className="py-3 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Status Ketersediaan
                  </TableHead>
                  <TableHead className="w-28 py-3 text-right pr-4 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">
                          Memuat katalog komoditas dari database...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : productList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Package className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">
                          {searchQuery || filterKategori !== 'SEMUA' || filterStatus !== 'ALL'
                            ? 'Tidak ada komoditas yang cocok dengan filter'
                            : 'Belum ada data komoditas di katalog toko'}
                        </span>
                        <span className="text-[11.5px] text-slate-400 max-w-sm">
                          {searchQuery || filterKategori !== 'SEMUA' || filterStatus !== 'ALL'
                            ? 'Coba sesuaikan kata kunci pencarian atau reset filter kategori/status.'
                            : 'Mulai daftarkan hasil panen kelapa, cengkeh, atau komoditas lainnya dengan menekan tombol Input Komoditas.'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  productList.map((prod, index) => {
                    const rowNumber = (pagination.currentPage - 1) * pagination.limit + (index + 1);
                    const isSelected = prod.id ? selectedIds.includes(prod.id) : false;

                    return (
                      <TableRow
                        key={prod.id || index}
                        className={`transition-colors border-[#F3F4F6] hover:bg-[#F9FAFB] ${
                          isSelected ? 'bg-slate-50/70' : ''
                        }`}
                      >
                        {/* Checkbox Select Row */}
                        <TableCell className="text-center py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => prod.id && toggleSelectRow(prod.id)}
                            aria-label={`Pilih ${prod.nama}`}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                          />
                        </TableCell>

                        {/* No */}
                        <TableCell className="text-center font-medium text-xs text-slate-400 py-3">
                          {rowNumber}
                        </TableCell>

                        {/* Komoditas: Thumbnail Image + Nama + Tag Kategori */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200/90 overflow-hidden shrink-0">
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

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                                {prod.nama}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                  <Tag className="w-2.5 h-2.5 text-emerald-700" />
                                  <span>{prod.kategori}</span>
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
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 rounded-full border border-slate-200 shrink-0">
                              <AvatarImage src={prod.petani?.avatarUrl || ''} alt={prod.petani?.name || ''} />
                              <AvatarFallback className="rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                {prod.petani?.name ? prod.petani.name.charAt(0).toUpperCase() : 'P'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {prod.petani?.name || 'Petani Binaan'}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {prod.petani?.email || prod.petani?.phone || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Harga per Satuan */}
                        <TableCell className="py-3">
                          <div className="text-xs font-semibold text-slate-900 tabular-nums">
                            Rp {Number(prod.hargaPerSatuan || 0).toLocaleString('id-ID')}
                            <span className="font-normal text-slate-400 text-[11px]">
                              {' '}/{prod.satuan}
                            </span>
                          </div>
                        </TableCell>

                        {/* Stok Tersedia */}
                        <TableCell className="py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium tabular-nums ${
                              Number(prod.stok) > 0
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {Number(prod.stok || 0).toLocaleString('id-ID')} {prod.satuan}
                          </span>
                        </TableCell>

                        {/* Status Ketersediaan (Pill Toggle) */}
                        <TableCell className="py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(prod)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                              prod.isTersedia
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Klik untuk mengubah status ketersediaan di katalog"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                prod.isTersedia ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{prod.isTersedia ? 'Aktif Dijual' : 'Nonaktif'}</span>
                          </button>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="py-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Photo Upload Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setQuickPhotoProduct(prod);
                                setIsQuickPhotoOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-2xs"
                              title="Ganti Foto Fisik Komoditas (Kamera HP / Galeri)"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('Produk dan Layanan', 'Tambah Komoditas', prod);
                              }}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-2xs"
                              title="Edit Data Komoditas Lengkap"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setProductToDelete(prod);
                                setDeleteDialogOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition cursor-pointer shadow-2xs"
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
          </div>

          {/* Footer Pagination Persis Halaman Petani, Pembeli & Orders */}
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
                total komoditas
              </div>

              {/* Limit Dropdown */}
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

            {/* Pagination Controls */}
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

      {/* Modal 1: Delete Confirmation Dialog */}
      <ProductDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={fetchProducts}
        product={productToDelete}
      />

      {/* Modal 2: Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-4 h-4" />
              </div>
              <span>Hapus Massal Komoditas</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 leading-relaxed">
            Anda akan menghapus <strong className="text-rose-600 font-semibold">{selectedIds.length} komoditas</strong> yang dipilih dari katalog toko online koperasi.
            <p className="mt-2 text-slate-400">
              Tindakan ini tidak dapat dibatalkan. Data riwayat transaksi terkait komoditas ini akan tetap disimpan secara aman.
            </p>
          </div>

          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleBulkDeleteConfirm}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isBulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Hapus {selectedIds.length} Komoditas</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Edit Warehouse Address Dialog */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <span>Alamat Gudang & Lokasi Serah Terima</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAddress} className="space-y-4 my-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Alamat ini digunakan oleh pembeli saat checkout sebagai titik pengambilan barang pesanan fisik di koperasi.
            </p>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Alamat Lengkap Gudang *
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating || isSavingAddress}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md transition cursor-pointer disabled:opacity-50"
                  title="Deteksi alamat secara otomatis dari GPS saat ini"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-slate-600" />
                      <span>Mendeteksi Lokasi...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3 h-3 text-slate-600" />
                      <span>Gunakan GPS Sekarang</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="Contoh: Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Minahasa Utara"
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium text-slate-800 placeholder:text-slate-400"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditAddressOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingAddress || !tempAddress.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSavingAddress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Alamat</span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Quick Photo Upload Dialog (Kamera HP / Galeri) */}
      <Dialog
        open={isQuickPhotoOpen}
        onOpenChange={(open) => {
          if (!quickUploadingSource) {
            setIsQuickPhotoOpen(open);
            if (!open) setQuickPhotoProduct(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div>Foto Fisik Komoditas</div>
                <p className="text-xs font-normal text-slate-400 mt-0.5">
                  Perbarui foto cepat tanpa membuka form edit
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {quickPhotoProduct && (
            <div className="space-y-4 my-2">
              {/* Product Info & Current Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 border border-slate-200 shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      quickPhotoProduct.imageUrl ||
                      'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=300&q=80'
                    }
                    alt={quickPhotoProduct.nama}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=300&q=80';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {quickPhotoProduct.nama}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold text-[10px]">
                      {quickPhotoProduct.kategori}
                    </span>
                    <span>•</span>
                    <span className="truncate">
                      {quickPhotoProduct.petani?.name || 'Petani Koperasi'}
                    </span>
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
                  className="w-full flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer text-center group disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
                    {quickUploadingSource === 'CAMERA' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    {quickUploadingSource === 'CAMERA' ? 'Mengunggah...' : 'Jepret Kamera HP'}
                  </span>
                  <span className="text-[10.5px] text-slate-400 mt-0.5">
                    Kamera belakang ponsel
                  </span>
                </button>

                {/* 2. Tombol Galeri Foto */}
                <button
                  type="button"
                  onClick={() => quickGalleryInputRef.current?.click()}
                  disabled={quickUploadingSource !== null}
                  className="w-full flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer text-center group disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    {quickUploadingSource === 'GALLERY' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    {quickUploadingSource === 'GALLERY' ? 'Mengunggah...' : 'Pilih dari Galeri'}
                  </span>
                  <span className="text-[10.5px] text-slate-400 mt-0.5">
                    JPG, PNG, atau WebP
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Foto akan otomatis dioptimasi dan langsung diperbarui di etalase toko.
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
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-60"
            >
              Tutup
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
