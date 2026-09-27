'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  Filter,
  Sprout,
  ArrowRight,
  Loader2,
  RefreshCw,
  Warehouse,
  Coins,
  CheckCircle2,
  Building2,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ProductFormModal, ProductData } from '@/components/toko/product-form-modal';
import { ProductDeleteDialog } from '@/components/toko/product-delete-dialog';

import defaultCategoriesData from '@/data/categories.json';

const CATEGORIES_STORAGE_KEY = 'koperasi_categories_cache';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  description?: string;
  mobileBg?: string;
}

export interface TabCategoryConfig {
  key: string;
  label: string;
  pillLabel: string;
  emoji: string;
  mobileBg: string;
}

function getInitialCategories(): CategoryItem[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return defaultCategoriesData as CategoryItem[];
}

export default function TokoOnlinePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Dynamic Categories State from Admin
  const [categories, setCategories] = useState<CategoryItem[]>(() => getInitialCategories());

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
          try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(data.categories));
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching categories in toko page:', err);
      }
    };

    fetchCategories();

    const handleCategoriesUpdate = () => {
      const updated = getInitialCategories();
      if (updated && updated.length > 0) {
        setCategories(updated);
      }
    };

    window.addEventListener('categories_updated', handleCategoriesUpdate);
    window.addEventListener('storage', handleCategoriesUpdate);

    return () => {
      window.removeEventListener('categories_updated', handleCategoriesUpdate);
      window.removeEventListener('storage', handleCategoriesUpdate);
    };
  }, []);

  const dynamicKategoriConfig = useMemo<TabCategoryConfig[]>(() => {
    const allTab: TabCategoryConfig = {
      key: 'SEMUA',
      label: 'Semua',
      pillLabel: 'Kategori',
      emoji: '🌾',
      mobileBg: 'bg-gradient-to-br from-emerald-600 to-[#183d2e] text-white',
    };
    const mapped: TabCategoryConfig[] = categories.map((cat) => ({
      key: cat.name,
      label: cat.name,
      pillLabel: cat.name,
      emoji: cat.emoji || '🌾',
      mobileBg:
        cat.mobileBg ||
        'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border border-amber-300/60',
    }));
    return [allTab, ...mapped];
  }, [categories]);

  // Tab State: 'PRODUK_SAYA' | 'BELANJA_KOPERASI'
  const isPetani = user?.role === 'PETANI';
  const [activeTab, setActiveTab] = useState<'PRODUK_SAYA' | 'BELANJA_KOPERASI'>(
    isPetani ? 'PRODUK_SAYA' : 'BELANJA_KOPERASI'
  );

  // Filter & Search States
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Products & Pagination State (Optimasi muat per 30 komoditas seperti Tokopedia)
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductData | null>(null);

  // Farmer Cooperative Stats (Stok Gudang & Pencairan Cash)
  const [petaniStats, setPetaniStats] = useState<{
    totalStokGudang: number;
    totalKuantitasTerjual: number;
    cashSiapDiambil: number;
    cashSudahDiterima: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchPetaniStats = useCallback(async () => {
    if (!isPetani) return;
    try {
      setIsLoadingStats(true);
      const res = await fetch('/api/petani/dashboard');
      const data = await res.json();
      if (res.ok) {
        setPetaniStats({
          totalStokGudang: data.totalStokGudang || 0,
          totalKuantitasTerjual: data.totalKuantitasTerjual || 0,
          cashSiapDiambil: data.cashSiapDiambil || 0,
          cashSudahDiterima: data.cashSudahDiterima || 0,
        });
      }
    } catch (err) {
      console.error('Error fetch petani stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isPetani]);

  useEffect(() => {
    if (isPetani && activeTab === 'PRODUK_SAYA') {
      fetchPetaniStats();
    }
  }, [isPetani, activeTab, fetchPetaniStats]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Protection Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?callbackUrl=/toko');
      } else if (!user.isOnboarded) {
        router.replace('/onboarding');
      } else if (user.role === 'PETANI' && !user.isVerified) {
        router.replace('/verifikasi-petani');
      }
    }
  }, [user, authLoading, router]);

  // Sinkronkan tab awal sesuai role user
  useEffect(() => {
    if (user?.role === 'PETANI') {
      setActiveTab('PRODUK_SAYA');
    } else {
      setActiveTab('BELANJA_KOPERASI');
    }
  }, [user?.role]);

  // Fetch Products (Halaman 1 / Reset - 30 item pertama)
  const fetchProducts = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoadingProducts(true);
      }
      setCurrentPage(1);
      const params = new URLSearchParams({
        page: '1',
        limit: '30',
      });

      if (isPetani && activeTab === 'PRODUK_SAYA') {
        params.set('mine', 'true');
      }

      if (selectedKategori !== 'SEMUA') {
        params.set('kategori', selectedKategori);
      }

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.products) {
        setProducts(data.products);
        setHasMore(Boolean(data.pagination?.hasMore));
        setTotalProductsCount(data.pagination?.totalCount || data.products.length);
      } else {
        setProducts([]);
        setHasMore(false);
        setTotalProductsCount(0);
      }
    } catch (err) {
      console.error('Error fetch products:', err);
      setProducts([]);
      setHasMore(false);
      setTotalProductsCount(0);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isPetani, activeTab, selectedKategori, debouncedSearch]);

  // Handler Muat Lebih Banyak (Load Next 30 Products)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '30',
      });

      if (isPetani && activeTab === 'PRODUK_SAYA') {
        params.set('mine', 'true');
      }

      if (selectedKategori !== 'SEMUA') {
        params.set('kategori', selectedKategori);
      }

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (res.ok && Array.isArray(data.products)) {
        setProducts((prev) => [...prev, ...data.products]);
        setCurrentPage(nextPage);
        setHasMore(Boolean(data.pagination?.hasMore));
        if (data.pagination?.totalCount) {
          setTotalProductsCount(data.pagination.totalCount);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error load more products:', err);
      showToast({
        title: 'Gagal Memuat Komoditas',
        message: 'Terjadi gangguan jaringan saat memuat lebih banyak komoditas.',
        type: 'error',
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user?.id && user?.isOnboarded) {
      fetchProducts();
    }
  }, [user?.id, user?.isOnboarded, fetchProducts]);

  // Handlers
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    setFormMode('EDIT');
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (product: any) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = () => {
    showToast({
      title: formMode === 'CREATE' ? 'Komoditas Ditambahkan' : 'Komoditas Diperbarui',
      message:
        formMode === 'CREATE'
          ? 'Hasil panen baru Anda telah berhasil didaftarkan ke toko koperasi!'
          : 'Perubahan data komoditas berhasil disimpan.',
      type: 'success',
    });
    fetchProducts();
  };

  const handleDeleteSuccess = () => {
    showToast({
      title: 'Komoditas Dihapus',
      message: 'Produk telah berhasil dihapus dari daftar komoditas Anda.',
      type: 'info',
    });
    fetchProducts();
  };

  const handleAddToCart = (product: any, quantity: number) => {
    try {
      const saved = localStorage.getItem('koperasi_cart');
      const existingCart: any[] = saved ? JSON.parse(saved) : [];
      const itemIdx = existingCart.findIndex((i) => i.id === product.id);

      if (itemIdx > -1) {
        existingCart[itemIdx].quantity = (existingCart[itemIdx].quantity || 1) + quantity;
      } else {
        existingCart.push({
          id: product.id,
          nama: product.nama,
          kategori: product.kategori,
          hargaPerSatuan: Number(product.hargaPerSatuan),
          satuan: product.satuan,
          imageUrl: product.imageUrl,
          quantity,
          petaniName: product.petani?.name || 'Petani Binaan',
        });
      }

      localStorage.setItem('koperasi_cart', JSON.stringify(existingCart));
      window.dispatchEvent(new CustomEvent('cart-updated'));

      showToast({
        title: 'Dimasukkan ke Keranjang',
        message: `${quantity} ${product.satuan} "${product.nama}" berhasil ditambahkan ke keranjang belanja Anda.`,
        type: 'success',
      });
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  };

  if (authLoading || !user || !user.isOnboarded || (user.role === 'PETANI' && !user.isVerified)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App Header */}
      <AppHeader activePage="toko" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-6">
        {/* Header Title & Intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5 sm:gap-4 mb-2.5 sm:mb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
              <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <Sprout className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-700" />
                {isPetani ? 'Portal Agribisnis Mitra Petani' : 'Toko Online Komoditas Tani'}
              </span>
            </div>
            <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Hasil Panen Saya di Gudang Koperasi'
                : 'Katalog Komoditas & Hasil Tani Koperasi'}
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 mt-0.5 max-w-2xl line-clamp-1 sm:line-clamp-none">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Pantau stok komoditas yang disetorkan ke gudang & cash yang siap dicairkan di kasir.'
                : 'Beli komoditas agribisnis segar langsung dari petani binaan Koperasi Sinar Pagi Sejahtera, Minahasa Utara.'}
            </p>
          </div>

          {/* Info Penyetoran Fisik ke Gudang (Khusus Petani di tab Produk Saya) */}
          {isPetani && activeTab === 'PRODUK_SAYA' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] sm:text-xs font-semibold self-start md:self-auto shadow-2xs">
              <Warehouse className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span>Penyetoran Fisik di Gudang Koperasi</span>
            </div>
          )}
        </div>

        {/* Ringkasan Agribisnis & Bagi Hasil Cash Petani (Khusus Petani di Tab Produk Saya) */}
        {isPetani && activeTab === 'PRODUK_SAYA' && (
          <div className="mb-2.5 sm:mb-6 space-y-2 sm:space-y-4">
            {/* Informational Banner (Dihapus/disembunyikan pada mobile sesuai Gambar 4) */}
            <div className="hidden sm:flex p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-800 text-white flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 shadow-sm border border-emerald-700/50">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold tracking-tight text-white flex items-center gap-1.5 flex-wrap">
                    <span>Sistem Penyetoran & Bagi Hasil Koperasi Satu Pintu</span>
                    <span className="text-[8px] sm:text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                      Gudang Fisik Aktif
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] text-emerald-100/90 mt-0.5 leading-snug line-clamp-2 sm:line-clamp-none">
                    Komoditas fisik Anda disetorkan dan disimpan di gudang koperasi. Pembeli bertransaksi melalui koperasi, dan uang hasil penjualan komoditas dapat Anda ambil secara tunai (cash) langsung di kantor koperasi.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4">
              {/* Card 1: Stok Fisik di Gudang Koperasi */}
              <div className="p-2.5 sm:p-4 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
                  <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                    Stok di Gudang
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Warehouse className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-sm sm:text-2xl font-black text-slate-900 leading-tight">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    petaniStats?.totalStokGudang.toLocaleString('id-ID') || 0
                  )}
                  <span className="text-[9px] sm:text-xs font-semibold text-slate-400 ml-1">unit/kg</span>
                </div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:block sm:block">
                  Hasil panen fisik di gudang
                </div>
              </div>

              {/* Card 2: Total Komoditas Terjual */}
              <div className="p-2.5 sm:p-4 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
                  <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                    Komoditas Terjual
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-sm sm:text-2xl font-black text-slate-900 leading-tight">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    petaniStats?.totalKuantitasTerjual.toLocaleString('id-ID') || 0
                  )}
                  <span className="text-[9px] sm:text-xs font-semibold text-slate-400 ml-1">terjual</span>
                </div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:block sm:block">
                  Telah laku dibeli pelanggan
                </div>
              </div>

              {/* Card 3: Uang Tunai Siap Diambil di Koperasi (HIGHLIGHT GREEN) */}
              <div className="p-2.5 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border sm:border-2 border-emerald-500/80 rounded-xl sm:rounded-2xl shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-emerald-800 mb-1 sm:mb-2">
                  <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 truncate">
                    Cash Siap Diambil
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Coins className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-sm sm:text-2xl font-black text-emerald-900 leading-tight">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    `Rp ${(petaniStats?.cashSiapDiambil || 0).toLocaleString('id-ID')}`
                  )}
                </div>
                <div className="text-[8px] sm:text-[10px] font-bold text-emerald-700 mt-0.5 flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Ambil di kasir koperasi</span>
                </div>
              </div>

              {/* Card 4: Riwayat Cash Sudah Diterima */}
              <div className="p-2.5 sm:p-4 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
                  <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                    Riwayat Cash Diterima
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-sm sm:text-2xl font-black text-slate-900 leading-tight">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    `Rp ${(petaniStats?.cashSudahDiterima || 0).toLocaleString('id-ID')}`
                  )}
                </div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:block sm:block">
                  Total keuntungan cair
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar: Toggle Button Pills (Khusus Petani) & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-2.5 sm:mb-6 pb-2.5 sm:pb-5 border-b border-slate-200">
          {/* 1. Toggle Button Pill: "Produk Saya" vs "Belanja Koperasi" */}
          {isPetani ? (
            <div className="inline-flex items-center gap-1 sm:gap-2 p-0.5 sm:p-1 bg-slate-100/90 rounded-full border border-slate-200/80 w-full sm:w-fit justify-center sm:justify-start">
              {/* Button 1: Panen Saya di Gudang */}
              <button
                onClick={() => setActiveTab('PRODUK_SAYA')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'PRODUK_SAYA'
                    ? 'bg-[#183d2e] text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Panen Saya</span>
              </button>

              {/* Button 2: Belanja Koperasi */}
              <button
                onClick={() => setActiveTab('BELANJA_KOPERASI')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'BELANJA_KOPERASI'
                    ? 'bg-[#183d2e] text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Belanja Koperasi</span>
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-semibold w-fit">
              <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
              <span>Belanja Hasil Panen Koperasi</span>
            </div>
          )}

          {/* 2. Search & Kategori Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto sm:flex-1 sm:max-w-md sm:justify-end">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kelapa, jagung, kopra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            <button
              onClick={() => fetchProducts(false)}
              className="p-1.5 sm:p-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-lg sm:rounded-xl transition cursor-pointer shadow-2xs shrink-0"
              title="Segarkan Produk"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoadingProducts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1. Category Navigation - Mobile Mode (Scrollable fleksibel jika kategori bertambah) */}
        <div className="block sm:hidden mt-3 mb-4 px-0.5">
          <div className="flex items-start gap-2.5 overflow-x-auto pt-2.5 pb-2.5 px-2 no-scrollbar">
            {dynamicKategoriConfig.map((cat) => {
              const isSelected = selectedKategori === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedKategori(cat.key)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 group cursor-pointer focus:outline-none transition active:scale-95 py-0.5"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shadow-2xs transition-all ${
                      cat.mobileBg
                    } ${
                      isSelected
                        ? 'ring-2 ring-emerald-600 ring-offset-2 scale-105 shadow-md'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {cat.key === 'SEMUA' ? (
                      <LayoutGrid className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-lg leading-none">{cat.emoji}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] text-center leading-tight w-full truncate transition-colors ${
                      isSelected
                        ? 'font-bold text-emerald-800'
                        : 'font-medium text-slate-700 group-hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Category Navigation - Tablet & Desktop Mode (Rounded-lg: Agak Kotak Bersudut Halus, Tidak Lancip) */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
          {dynamicKategoriConfig.map((cat) => {
            const isSelected = selectedKategori === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedKategori(cat.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200'
                }`}
              >
                {cat.key === 'SEMUA' ? (
                  <LayoutGrid className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-700'}`} />
                ) : (
                  <span className="text-sm leading-none">{cat.emoji}</span>
                )}
                <span>{cat.pillLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoadingProducts ? (
          <div className="py-12 sm:py-20 flex flex-col items-center justify-center gap-2 sm:gap-3">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-700 animate-spin" />
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Memuat katalog komoditas...</span>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center justify-center min-h-[220px] sm:min-h-[360px] shadow-2xs">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 sm:mb-4 border border-emerald-100">
              <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
            </div>
            <h3 className="text-xs sm:text-base font-bold text-slate-800">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Belum Ada Komoditas di Gudang Koperasi'
                : 'Tidak Ada Komoditas Ditemukan'}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 max-w-sm mt-1 mb-2">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Bawa fisik hasil panen Anda (kelapa, jagung, kopra, dll.) ke gudang koperasi. Petugas admin koperasi yang akan menimbang dan mendata komoditas Anda ke etalase online.'
                : 'Coba ubah kata kunci pencarian atau pilih filter kategori lainnya.'}
            </p>
          </div>
        ) : (
          <>
            {/* Tokopedia-Style Compact Product Grid (2 cols mobile, up to 6 cols desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2.5 md:gap-3">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => {
                    router.push(`/toko/${prod.id}`);
                  }}
                  className="bg-white border border-slate-200/90 rounded-lg sm:rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer h-full"
                >
                  <div>
                    {/* Top Image Section with Badges (Square Aspect Ratio like Tokopedia) */}
                    <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          prod.imageUrl ||
                          'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                        }
                        alt={prod.nama}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                        }}
                      />

                      {/* Kategori Badge di Kiri Atas */}
                      <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 bg-emerald-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-2xs">
                        {prod.kategori}
                      </div>

                      {/* Status Badge di Kanan Atas */}
                      <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-white/95 backdrop-blur-xs text-emerald-800 text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{prod.isTersedia ? 'Aktif' : 'Off'}</span>
                      </div>

                      {/* Tokopedia-Style Bottom Badge: Panen Koperasi */}
                      <div className="absolute bottom-1 left-1 bg-[#183d2e]/90 text-white text-[8px] sm:text-[9px] font-extrabold px-1 sm:px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 backdrop-blur-xs">
                        <span>Panen Koperasi</span>
                      </div>
                    </div>

                    {/* Body Content - Ultra Compact like Tokopedia */}
                    <div className="p-1.5 sm:p-2 flex flex-col justify-between gap-0.5">
                      {/* Judul Komoditas */}
                      <h3 className="text-[11px] sm:text-xs font-semibold text-slate-800 tracking-tight leading-tight line-clamp-2 h-[2.5em] group-hover:text-emerald-700 transition-colors" title={prod.nama}>
                        {prod.nama}
                      </h3>

                      {/* Harga Satuan */}
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                          Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-normal">/{prod.satuan}</span>
                      </div>

                      {/* Stok */}
                      <div className="text-[9px] sm:text-[11px] text-slate-500 font-medium">
                        Stok {Number(prod.stok).toLocaleString('id-ID')}
                      </div>

                      {/* Nama Akun Petani (Di bawah stok dengan ukuran text proporsional) */}
                      <div
                        onClick={(e) => {
                          const targetId = prod.petani?.id || prod.petaniId || (isPetani ? user?.id : null);
                          if (targetId) {
                            e.stopPropagation();
                            router.push(`/toko/petani/${targetId}`);
                          }
                        }}
                        className="text-[10px] sm:text-xs font-bold text-slate-800 hover:text-emerald-700 hover:underline transition-colors truncate"
                        title={`Kunjungi Toko ${prod.petani?.name || (isPetani ? user?.name : 'Petani Koperasi') || 'Petani Koperasi'}`}
                      >
                        {prod.petani?.name || (isPetani ? user?.name : 'Petani Koperasi') || 'Petani Koperasi'}
                      </div>
                    </div>
                  </div>

                  {/* Footer Action - Compact */}
                  <div className="p-1.5 pt-0 sm:p-2 sm:pt-0">
                    {isPetani && activeTab === 'PRODUK_SAYA' ? (
                      <div className="flex items-center justify-between py-0.5 sm:py-1 px-1 sm:px-1.5 rounded-md bg-slate-50 border border-slate-200/70 text-[8px] sm:text-[9px] text-slate-600 font-medium">
                        <span className="text-emerald-800 font-semibold truncate flex items-center gap-1">
                          <Warehouse className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">Gudang</span>
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded font-bold text-[7px] sm:text-[8px] shrink-0 border ${
                            prod.isTersedia
                              ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {prod.isTersedia ? 'Aktif' : 'Off'}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(prod, 1);
                        }}
                        className="w-full py-1 px-1.5 sm:py-1.5 sm:px-2 rounded-md sm:rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                      >
                        <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>+ Keranjang</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tokopedia-Style "Muat Lebih Banyak" Button (Hanya tampil jika ada komoditas lanjutan / > 30) */}
            {hasMore && (
              <div className="mt-4 sm:mt-8 mb-4 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full max-w-xs sm:max-w-sm py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl border-2 border-emerald-600 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-600 font-bold text-[11px] sm:text-xs tracking-wide transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>Memuat Komoditas...</span>
                    </>
                  ) : (
                    <span>Muat Lebih Banyak</span>
                  )}
                </button>
                <span className="text-[10px] sm:text-[11px] text-slate-400">
                  Menampilkan {products.length} dari {totalProductsCount} komoditas
                </span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Formulir Tambah / Edit Produk */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        mode={formMode}
        initialData={selectedProduct}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Dialog Konfirmasi Hapus Produk */}
      <ProductDeleteDialog
        isOpen={isDeleteDialogOpen}
        product={productToDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
