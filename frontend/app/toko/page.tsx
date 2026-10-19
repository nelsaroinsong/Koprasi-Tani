'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Loader2,
  X,
  Store,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getCart, saveCart } from '@/lib/cart';

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

const getCategoryIcon = (categoryName: string) => {
  const norm = categoryName.toLowerCase().trim();
  if (norm === 'semua' || norm === 'semua komoditas' || norm === 'semua alat') return '/categories/all.jpg';
  if (norm.includes('kelapa')) return '/categories/kelapa.jpg';
  if (norm.includes('jagung')) return '/categories/jagung.jpg';
  if (norm.includes('turunan')) return '/categories/turunan.jpg';
  if (norm.includes('olahan') || norm.includes('vco') || norm.includes('minyak')) return '/categories/olahan.jpg';
  if (norm.includes('alat') || norm.includes('traktor') || norm.includes('mesin') || norm.includes('roda')) return '/categories/alat.jpg';
  return '/categories/all.jpg';
};

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

// In-Memory Module Cache untuk Navigasi Cepat (SWR Pattern)
let cachedTokoCatalog: {
  products: any[];
  totalCount: number;
  hasMore: boolean;
  timestamp: number;
} | null = null;

export default function TokoOnlinePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const isPetani = user?.role === 'PETANI';

  // Dynamic Categories State from Admin
  const [categories, setCategories] = useState<CategoryItem[]>(() => getInitialCategories());

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
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
      label: 'Semua Komoditas',
      pillLabel: 'Semua Komoditas',
      emoji: '',
      mobileBg: '',
    };
    const mapped: TabCategoryConfig[] = categories.map((cat) => ({
      key: cat.name,
      label: cat.name,
      pillLabel: cat.name,
      emoji: cat.emoji || '',
      mobileBg: cat.mobileBg || '',
    }));
    return [allTab, ...mapped];
  }, [categories]);

  // Filter & Search States
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Products & Pagination State
  const [products, setProducts] = useState<any[]>(() =>
    cachedTokoCatalog ? cachedTokoCatalog.products : []
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState(() =>
    cachedTokoCatalog ? false : true
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(() =>
    cachedTokoCatalog ? cachedTokoCatalog.hasMore : false
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalProductsCount, setTotalProductsCount] = useState(() =>
    cachedTokoCatalog ? cachedTokoCatalog.totalCount : 0
  );

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
        try {
          const stored = localStorage.getItem('koperasi_auth_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (
              parsed?.email?.trim().toLowerCase() === user.email?.trim().toLowerCase() &&
              ((parsed.role === 'PETANI' && parsed.isVerified) || parsed.role === 'PEMBELI')
            ) {
              return;
            }
          }
        } catch {}

        fetch('/api/user/profile', { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data?.user) return;
            try {
              localStorage.setItem('koperasi_auth_user', JSON.stringify(data.user));
              window.dispatchEvent(new CustomEvent('user-updated'));
            } catch {}

            if (!data.user.isOnboarded) {
              router.replace('/onboarding');
              return;
            }
            if (data.user.role === 'PETANI' && !data.user.isVerified) {
              router.replace('/verifikasi-petani');
            }
          })
          .catch(() => {});
      }
    }
  }, [user?.email, user?.role, user?.isVerified, user?.isOnboarded, Boolean(user), authLoading, router]);

  // Fetch Products (Halaman 1 / Reset - 30 item pertama)
  const fetchProducts = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setIsLoadingProducts(true);
        }
        setCurrentPage(1);
        const params = new URLSearchParams({
          page: '1',
          limit: '30',
        });

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

          if (selectedKategori === 'SEMUA' && !debouncedSearch.trim()) {
            cachedTokoCatalog = {
              products: data.products,
              totalCount: data.pagination?.totalCount || data.products.length,
              hasMore: Boolean(data.pagination?.hasMore),
              timestamp: Date.now(),
            };
          }
        } else {
          setProducts([]);
          setHasMore(false);
          setTotalProductsCount(0);
        }
      } catch (err) {
        console.error('Error fetch products:', err);
        if (!cachedTokoCatalog) {
          setProducts([]);
          setHasMore(false);
          setTotalProductsCount(0);
        }
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [selectedKategori, debouncedSearch]
  );

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
      const hasInitial = Boolean(
        cachedTokoCatalog && selectedKategori === 'SEMUA' && !debouncedSearch.trim()
      );
      fetchProducts(hasInitial);
    }
  }, [user?.id, user?.isOnboarded, fetchProducts, selectedKategori, debouncedSearch]);

  const handleAddToCart = (product: any, quantity: number) => {
    try {
      if (!product.isTersedia || Number(product.stok || 0) <= 0) {
        showToast({
          title: 'Stok Habis',
          message: `Komoditas "${product.nama}" saat ini sedang kosong/habis.`,
          type: 'warning',
        });
        return;
      }

      const existingCart = getCart(user);
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

      saveCart(existingCart, user);

      showToast({
        title: 'Dimasukkan ke Keranjang',
        message: `${quantity} ${product.satuan} "${product.nama}" berhasil ditambahkan ke keranjang belanja Anda.`,
        type: 'success',
      });
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  };

  const availableProductsCount = useMemo(
    () => products.filter((p) => p.isTersedia && Number(p.stok || 0) > 0).length,
    [products]
  );

  if (authLoading || !user || !user.isOnboarded || (user.role === 'PETANI' && !user.isVerified)) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#233414] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-[#344d15] font-medium">Memuat toko koperasi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      {/* App Header */}
      <AppHeader activePage="toko" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 lg:pb-12">
        {/* Search Bar matching Gambar 1 (Clean Rounded Pill with Magnifying Glass & Filter Button) */}
        <div className="relative w-full max-w-2xl mx-auto mb-5 sm:mb-6">
          <div className="relative flex items-center bg-white border border-[#cfd6c9] focus-within:border-[#233414] focus-within:ring-2 focus-within:ring-[#233414]/15 rounded-full shadow-xs transition-all h-11 sm:h-12 px-4">
            <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#68785b] shrink-0 mr-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari komoditas kelapa, jagung, bibit, hasil tani..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-[#1a2610] placeholder:text-[#68785b] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 rounded-full bg-[#EAEDE7] hover:bg-[#cfd6c9] text-[#233414] flex items-center justify-center transition mr-1.5 cursor-pointer shrink-0"
                title="Bersihkan"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (inputEl) inputEl.focus();
              }}
              className="w-8 h-8 rounded-full bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#233414] flex items-center justify-center transition shrink-0 cursor-pointer border border-[#dce1d6]"
              title="Filter Pencarian"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#233414]" />
            </button>
          </div>
        </div>

        {/* Category Section matching Gambar 3 (Title + "Lihat semua", Rounded Cards with 3D Icons) */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm sm:text-base font-bold text-[#1a2610] tracking-tight">
              Kategori Komoditas
            </h2>
            <button
              type="button"
              onClick={() => setSelectedKategori('SEMUA')}
              className="text-xs font-semibold text-[#344d15] hover:text-[#1a2610] transition-colors cursor-pointer"
            >
              Lihat semua
            </button>
          </div>

          <div className="flex items-start gap-3 sm:gap-4 overflow-x-auto pb-2 no-scrollbar px-1">
            {dynamicKategoriConfig.map((cat) => {
              const isSelected = selectedKategori.toLowerCase().trim() === cat.key.toLowerCase().trim();
              const iconSrc = getCategoryIcon(cat.key);

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedKategori(cat.key)}
                  className="flex flex-col items-center group shrink-0 focus:outline-none cursor-pointer"
                >
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#233414] border-2 border-[#233414] shadow-md ring-2 ring-[#233414]/20'
                        : 'bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#dce1d6] group-hover:border-[#b8c4ae]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconSrc}
                      alt={cat.label}
                      className={`w-full h-full object-contain rounded-xl transition-transform duration-200 ${
                        isSelected ? 'scale-105' : 'group-hover:scale-105'
                      }`}
                      loading="lazy"
                    />
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs text-center mt-1.5 transition-colors max-w-[72px] sm:max-w-[84px] truncate ${
                      isSelected
                        ? 'text-[#233414] font-extrabold'
                        : 'text-[#526046] font-semibold group-hover:text-[#1a2610]'
                    }`}
                    title={cat.label}
                  >
                    {cat.pillLabel || cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isLoadingProducts ? (
          <div className="py-14 sm:py-24 flex flex-col items-center justify-center gap-2.5 sm:gap-3">
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#233414] animate-spin" />
            <span className="text-xs sm:text-[13px] text-[#344d15] font-medium">
              Memuat katalog komoditas...
            </span>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-[#dce1d6] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center justify-center min-h-[240px] sm:min-h-[300px]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] text-[#233414] flex items-center justify-center mb-3 sm:mb-4">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#344d15]" />
            </div>
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-[#1a2610]">
              Tidak Ada Komoditas Ditemukan
            </h2>
            <p className="text-xs sm:text-[13px] text-[#526046] max-w-sm mt-1 leading-relaxed">
              Belum ada komoditas yang sesuai dengan filter atau kata kunci pencarian Anda.
            </p>
            {(selectedKategori !== 'SEMUA' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedKategori('SEMUA');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Tampilkan Semua Komoditas
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Responsive Product Grid:
                - Mobile (<640px): 2 Kolom Compact (gap-2.5)
                - Tablet (sm/md): 3 - 4 Kolom Medium (gap-3.5)
                - Desktop (lg/xl): 5 Kolom Proporsional (gap-4) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 lg:gap-4">
              {products.map((prod) => {
                const isOutOfStock = !prod.isTersedia || Number(prod.stok || 0) <= 0;
                const farmerName =
                  prod.petani?.name ||
                  (isPetani ? user?.name : 'Petani Koperasi') ||
                  'Petani Koperasi';
                const farmerInitial = farmerName.charAt(0).toUpperCase();

                return (
                  <article
                    key={prod.id}
                    onClick={() => {
                      if (isOutOfStock) {
                        showToast({
                          title: 'Stok Habis',
                          message: `Komoditas "${prod.nama}" saat ini sedang kosong/habis.`,
                          type: 'warning',
                        });
                        return;
                      }
                      router.push(`/toko/${prod.id}`);
                    }}
                    className={`border rounded-xl sm:rounded-2xl overflow-hidden transition-colors duration-150 flex flex-col justify-between h-full ${
                      isOutOfStock
                        ? 'bg-[#f4f5f1] border-[#d5dccf] cursor-not-allowed'
                        : 'bg-white border-[#dce1d6] hover:border-[#344d15] cursor-pointer group'
                    }`}
                  >
                    <div>
                      {/* Top Image Section - 1:1 on Mobile for compactness, 4:3 on Tablet/Desktop */}
                      <div className="relative aspect-square sm:aspect-[4/3] w-full shrink-0 bg-[#EAEDE7] overflow-hidden border-b border-[#EAEDE7]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            prod.imageUrl ||
                            'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=600&q=80'
                          }
                          alt={prod.nama}
                          loading="lazy"
                          decoding="async"
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isOutOfStock
                              ? 'grayscale opacity-75'
                              : 'group-hover:scale-[1.03]'
                          }`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=600&q=80';
                          }}
                        />



                        {/* Top-Right Status Badge */}
                        <div
                          className={`absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg flex items-center gap-1 z-10 border ${
                            isOutOfStock
                              ? 'bg-[#ffedea] text-[#831c1e] border-red-200'
                              : 'bg-white text-[#1a2610] border-[#dce1d6]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                              isOutOfStock ? 'bg-[#c4242a]' : 'bg-[#547318]'
                            }`}
                          />
                          <span>
                            {isOutOfStock
                              ? 'Habis'
                              : prod.isTersedia
                              ? 'Tersedia'
                              : 'Off'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body - Compact on Mobile, Roomier on Tablet & Desktop */}
                      <div className="p-2.5 sm:p-3.5 lg:p-4">
                        {/* Judul Komoditas */}
                        <h3
                          className={`text-xs sm:text-sm lg:text-[15px] font-bold tracking-tight leading-snug line-clamp-1 transition-colors ${
                            isOutOfStock
                              ? 'text-[#68785b]'
                              : 'text-[#1a2610] group-hover:text-[#344d15]'
                          }`}
                          title={prod.nama}
                        >
                          {prod.nama}
                        </h3>

                        {/* Harga & Stok Row */}
                        <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between gap-1.5 flex-wrap">
                          <div className="flex items-baseline gap-0.5 sm:gap-1">
                            <span
                              className={`text-xs sm:text-[15px] lg:text-base font-extrabold tracking-tight tabular-nums ${
                                isOutOfStock ? 'text-[#68785b]' : 'text-[#233414]'
                              }`}
                            >
                              Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] sm:text-xs text-[#5b6950] font-medium">
                              /{prod.satuan}
                            </span>
                          </div>

                          {isOutOfStock ? (
                            <span className="text-[10px] sm:text-xs font-semibold text-[#c4242a] tabular-nums">
                              Stok 0
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs font-semibold text-[#344d15] tabular-nums">
                              Stok {Number(prod.stok).toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>

                        {/* Farmer Attribution Row */}
                        <div
                          onClick={(e) => {
                            const targetId =
                              prod.petani?.id ||
                              prod.petaniId ||
                              (isPetani ? user?.id : null);
                            if (targetId) {
                              e.stopPropagation();
                              router.push(`/toko/petani/${targetId}`);
                            }
                          }}
                          className="mt-2 sm:mt-3 pt-2 sm:pt-2.5 border-t border-[#EAEDE7] flex items-center justify-between gap-1.5 group/farmer"
                          title={`Kunjungi Toko ${farmerName}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-full bg-[#EAEDE7] border border-[#cfd6c9] text-[#233414] text-[9px] sm:text-[11px] font-bold flex items-center justify-center shrink-0">
                              {farmerInitial}
                            </div>
                            <span className="text-[11px] sm:text-xs font-semibold text-[#1a2610] group-hover/farmer:text-[#344d15] group-hover/farmer:underline truncate">
                              {farmerName}
                            </span>
                          </div>
                          <Store className="w-3 h-3 text-[#547318] shrink-0 hidden sm:block" />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5 lg:px-4 lg:pb-4 pt-0">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOutOfStock) return;
                          handleAddToCart(prod, 1);
                        }}
                        className={`w-full h-8 sm:h-9 lg:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          isOutOfStock
                            ? 'bg-[#EAEDE7] text-[#68785b] border border-[#cfd6c9] cursor-not-allowed'
                            : 'bg-[#233414] hover:bg-[#344d15] text-white cursor-pointer'
                        }`}
                      >
                        <ShoppingCart
                          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                            isOutOfStock ? 'text-[#68785b]' : 'text-[#D4F63D]'
                          }`}
                        />
                        <span>{isOutOfStock ? 'Stok Habis' : '+ Keranjang'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* "Muat Lebih Banyak" Button */}
            {hasMore && (
              <div className="mt-6 sm:mt-8 mb-4 flex flex-col items-center justify-center gap-2">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full max-w-xs h-10 sm:h-11 px-5 sm:px-6 rounded-xl border border-[#233414] bg-white hover:bg-[#EAEDE7] text-[#233414] font-semibold text-xs sm:text-[13px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#233414]" />
                      <span>Memuat Komoditas...</span>
                    </>
                  ) : (
                    <span>Muat Lebih Banyak</span>
                  )}
                </button>
                <span className="text-[11px] sm:text-xs text-[#5b6950] tabular-nums">
                  Menampilkan {products.length} dari {totalProductsCount} komoditas
                </span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
