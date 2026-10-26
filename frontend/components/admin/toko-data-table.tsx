'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  LocateFixed,
  Download,
  XCircle,
  ExternalLink,
  Store,
  ArrowUpDown,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, totalStok: 0 });
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

  // Helper emoji kategori komoditas
  const getCategoryEmoji = useCallback(
    (kategoriName: string) => {
      const found = categoriesList.find(
        (c) => c.name?.toLowerCase() === kategoriName?.toLowerCase()
      );
      return found?.emoji || null;
    },
    [categoriesList]
  );

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
      {/* 1. Stat Cards: 3 Kartu Ringkasan di Atas (Standar Industri & Selaras Sewa Alat) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Komoditas Pertanian */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Total Komoditas Pertanian</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-slate-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {stats.total || pagination.totalCount} <span className="text-xs font-normal text-slate-500">Komoditas ({stats.totalStok ?? stats.total} Stok)</span>
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Total ragam hasil panen di gudang
          </p>
        </div>

        {/* Card 2: Komoditas Siap Jual */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Komoditas Siap Jual</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {stats.active} <span className="text-xs font-normal text-slate-500">Komoditas Siap Jual</span>
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
            {stats.inactive} <span className="text-xs font-normal text-slate-500">Komoditas</span>
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Perlu restok panen atau penyesuaian
          </p>
        </div>
      </div>

      {/* 2. Kartu Alamat Gudang (1 Bawah Lebar Memanjang) */}
      <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 sm:px-5 sm:py-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Alamat Gudang Serah Terima & Pickup Point
              </span>
              <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Gudang Aktif
              </span>
            </div>
            <div className="mt-1 text-xs sm:text-[13px] font-medium text-slate-700 leading-snug break-words">
              {warehouseAddress}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Titik pengambilan barang bagi pembeli & serah terima hasil panen dari petani
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveTab('Produk dan Layanan', 'Lokasi Gudang', {
              address: warehouseAddress,
            });
          }}
          className="h-8 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
          title="Buka halaman peta untuk mengarahkan titik lokasi gudang atau deteksi via GPS"
        >
          <LocateFixed className="w-3.5 h-3.5 text-slate-500" />
          <span>Ubah / GPS</span>
        </button>
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

            {/* Kategori Filter Dropdown (Custom UI Radix Dropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 outline-none ${
                    filterKategori !== 'SEMUA'
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-semibold'
                      : 'border-[#E5E7EB] bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Tag className={`w-3.5 h-3.5 ${filterKategori !== 'SEMUA' ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span>
                    {filterKategori === 'SEMUA'
                      ? 'Semua Kategori'
                      : categoriesList.find((c) => c.name === filterKategori)?.emoji
                      ? `${categoriesList.find((c) => c.name === filterKategori)?.emoji} ${filterKategori}`
                      : filterKategori}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 opacity-70 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 rounded-xl p-1.5 bg-white border border-slate-200 shadow-xl text-xs z-50 max-h-72 overflow-y-auto"
              >
                <div className="px-2.5 py-1 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Filter Kategori Komoditas
                </div>
                <DropdownMenuItem
                  onClick={() => setFilterKategori('SEMUA')}
                  className={`cursor-pointer rounded-lg px-2.5 py-2 flex items-center justify-between text-xs transition ${
                    filterKategori === 'SEMUA'
                      ? 'bg-slate-100 font-semibold text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-500" />
                    <span>Semua Kategori</span>
                  </span>
                  {filterKategori === 'SEMUA' && (
                    <Check className="w-3.5 h-3.5 text-slate-900" />
                  )}
                </DropdownMenuItem>

                <div className="h-px bg-slate-100 my-1" />

                {categoriesList.map((cat: any) => {
                  const isSelected = filterKategori === cat.name;
                  return (
                    <DropdownMenuItem
                      key={cat.id || cat.slug || cat.name}
                      onClick={() => setFilterKategori(cat.name)}
                      className={`cursor-pointer rounded-lg px-2.5 py-2 flex items-center justify-between text-xs transition ${
                        isSelected
                          ? 'bg-emerald-50 font-semibold text-emerald-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {cat.emoji ? (
                          <span className="text-sm leading-none shrink-0">{cat.emoji}</span>
                        ) : (
                          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{cat.name}</span>
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

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
              <span>Tambah Produk</span>
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
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs text-slate-500 font-medium">Memuat katalog komoditas...</span>
            </div>
          ) : productList.length === 0 ? (
            <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak ada data komoditas</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery || filterKategori !== 'SEMUA' || filterStatus !== 'ALL'
                  ? 'Tidak ditemukan komoditas yang cocok dengan filter atau kata kunci pencarian.'
                  : 'Belum ada komoditas yang didaftarkan. Klik tombol Tambah Produk untuk mulai menambahkan hasil panen.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-[#E5E7EB] text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    {/* Checkbox Select All */}
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        title="Pilih semua di halaman ini"
                        className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Komoditas & Deskripsi</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Petani / Pemilik</th>
                    <th className="py-2.5 px-3">Harga per Satuan</th>
                    <th className="py-2.5 px-3">Stok Tersedia</th>
                    <th className="py-2.5 px-3 text-center">Ketersediaan</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {productList.map((prod, index) => {
                    const isSelected = prod.id ? selectedIds.includes(prod.id) : false;
                    const catEmoji = getCategoryEmoji(prod.kategori);

                    return (
                      <tr
                        key={prod.id || index}
                        className={`transition-colors ${
                          isSelected ? 'bg-slate-50/90' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Checkbox Single Select */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => prod.id && toggleSelectRow(prod.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          />
                        </td>

                        {/* Komoditas & Deskripsi */}
                        <td className="py-3 px-3">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.nama}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Package className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs sm:text-[13px] tracking-tight">
                                {prod.nama}
                              </div>
                              {prod.deskripsi ? (
                                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {prod.deskripsi}
                                </div>
                              ) : (
                                <div className="text-[10.5px] text-slate-400 line-clamp-1 mt-0.5">
                                  Kualitas hasil panen prima
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                            {catEmoji && <span className="text-xs leading-none">{catEmoji}</span>}
                            <span>{prod.kategori}</span>
                          </span>
                        </td>

                        {/* Petani / Pemilik */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-full border border-slate-200 shrink-0">
                              <AvatarImage src={prod.petani?.avatarUrl || ''} alt={prod.petani?.name || ''} />
                              <AvatarFallback className="rounded-full bg-slate-100 text-slate-700 font-semibold text-[9px]">
                                {prod.petani?.name ? prod.petani.name.charAt(0).toUpperCase() : 'P'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                                {prod.petani?.name || 'Petani Koperasi'}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                {prod.petani?.email || prod.petani?.phone || '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Harga per Satuan */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                            Rp {Number(prod.hargaPerSatuan || 0).toLocaleString('id-ID')}
                            <span className="text-[11px] text-slate-400 font-normal">
                              {' '}/ {prod.satuan}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Standar Toko Koperasi
                          </div>
                        </td>

                        {/* Stok Tersedia */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800 text-xs">
                            {Number(prod.stok).toLocaleString('id-ID')} {prod.satuan} Tersedia
                          </div>
                          {Number(prod.stok) <= 0 && (
                            <div className="text-[10.5px] mt-0.5">
                              <span className="font-semibold text-rose-600">
                                Habis
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Ketersediaan (Taste-Skills Switch Toggle) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(prod.isTersedia)}
                              onClick={() => handleToggleStatus(prod)}
                              title={`Klik untuk ${
                                prod.isTersedia ? 'menonaktifkan' : 'mengaktifkan'
                              } komoditas ini di etalase toko`}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                                prod.isTersedia
                                  ? 'bg-slate-900'
                                  : 'bg-slate-200 hover:bg-slate-300'
                              }`}
                            >
                              <span className="sr-only">Toggle status ketersediaan komoditas</span>
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  prod.isTersedia ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[11.5px] font-medium select-none w-16 text-left ${
                                prod.isTersedia
                                  ? 'text-slate-900 font-semibold'
                                  : 'text-slate-400'
                              }`}
                            >
                              {prod.isTersedia ? 'Tersedia' : 'Nonaktif'}
                            </span>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveTab('Produk dan Layanan', 'Tambah Komoditas', prod)}
                              title="Edit Komoditas"
                              className="w-7 h-7 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg flex items-center justify-center transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProductToDelete(prod);
                                setDeleteDialogOpen(true);
                              }}
                              title="Hapus Komoditas"
                              className="w-7 h-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
    </div>
  );
}
