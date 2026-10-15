'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Loader2,
  RefreshCw,
  LayoutGrid,
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

  // Filter & Search States
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Products & Pagination State (Dengan In-Memory Cache untuk Tampilan Seketika 0ms)
  const [products, setProducts] = useState<any[]>(() => (cachedTokoCatalog ? cachedTokoCatalog.products : []));
  const [isLoadingProducts, setIsLoadingProducts] = useState(() => (cachedTokoCatalog ? false : true));
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(() => (cachedTokoCatalog ? cachedTokoCatalog.hasMore : false));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalProductsCount, setTotalProductsCount] = useState(() => (cachedTokoCatalog ? cachedTokoCatalog.totalCount : 0));

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
        // Cek apakah di localStorage user sebenarnya sudah diverifikasi
        try {
          const stored = localStorage.getItem('koperasi_auth_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.role === 'PETANI' && parsed.isVerified) {
              return; // Di storage lokal sudah terverifikasi resmi, jangan lempar balik
            }
          }
        } catch {}

        // Verifikasi ke backend secara langsung jika user di state memori belum verified
        fetch('/api/user/profile')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.user?.role === 'PETANI' && data.user.isVerified) {
              try {
                localStorage.setItem('koperasi_auth_user', JSON.stringify(data.user));
                window.dispatchEvent(new CustomEvent('user-updated'));
              } catch {}
              return;
            }
            router.replace('/verifikasi-petani');
          })
          .catch(() => {
            router.replace('/verifikasi-petani');
          });
      }
    }
  }, [user?.role, user?.isVerified, user?.isOnboarded, Boolean(user), authLoading, router]);

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

        // Update memory cache saat mengambil katalog default
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
  }, [selectedKategori, debouncedSearch]);

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
      const hasInitial = Boolean(cachedTokoCatalog && selectedKategori === 'SEMUA' && !debouncedSearch.trim());
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        {/* Header Title & Search Toolbar (Rapi sejajar tanpa ruang kosong & tanpa tombol refresh) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-3.5 sm:mb-5">
          <div>
            <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Katalog Komoditas & Hasil Tani Koperasi
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-2xl">
              Beli komoditas agribisnis segar langsung dari petani binaan Koperasi Sinar Pagi Sejahtera, Minahasa Utara.
            </p>
          </div>

          <div className="relative w-full md:w-72 lg:w-80 shrink-0">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kelapa, jagung, kopra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Category Navigation - Desktop & Mobile (Teks Murni Tanpa Ikon, Scrollable Horizontal) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-4 sm:mb-5 no-scrollbar">
          {dynamicKategoriConfig.map((cat) => {
            const isSelected = selectedKategori === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedKategori(cat.key)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shadow-2xs shrink-0 ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200'
                }`}
              >
                {cat.pillLabel || cat.label}
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
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
            </div>
            <h3 className="text-xs sm:text-base font-bold text-slate-800">
              Tidak Ada Komoditas Ditemukan
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 max-w-sm mt-1 mb-2">
              Coba ubah kata kunci pencarian atau pilih filter kategori lainnya.
            </p>
          </div>
        ) : (
          <>
            {/* Grid Komoditas dengan Jarak Rapi dan Tidak Mepet di Mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5 md:gap-4">
              {products.map((prod) => {
                const isOutOfStock =
                  !prod.isTersedia || Number(prod.stok || 0) <= 0;

                return (
                  <div
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
                    className={`border rounded-xl overflow-hidden transition-all duration-200 flex flex-col justify-between h-full ${
                      isOutOfStock
                        ? 'bg-slate-100/90 border-slate-300/80 opacity-75 cursor-not-allowed shadow-none'
                        : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer group'
                    }`}
                  >
                    <div>
                      {/* Top Image Section with Badges - Strict 1:1 Aspect Ratio */}
                      <div
                        className="relative aspect-square w-full shrink-0 bg-slate-100 overflow-hidden"
                        style={{ aspectRatio: '1 / 1' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            prod.imageUrl ||
                            'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={prod.nama}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isOutOfStock
                              ? 'grayscale contrast-90'
                              : 'group-hover:scale-105'
                          }`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                          }}
                        />

                        {/* Status Badge di Kanan Atas */}
                        <div
                          className={`absolute top-1.5 right-1.5 backdrop-blur-xs text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 z-10 ${
                            isOutOfStock
                              ? 'bg-white/95 text-rose-700 border border-rose-200'
                              : 'bg-white/95 text-emerald-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : 'bg-emerald-500 animate-pulse'
                            }`}
                          />
                          <span>
                            {isOutOfStock
                              ? 'Stok Habis'
                              : prod.isTersedia
                              ? 'Aktif'
                              : 'Off'}
                          </span>
                        </div>

                        {/* Badge Kategori Pindah ke Kiri Bawah */}
                        <div className="absolute bottom-1.5 left-1.5 bg-emerald-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs max-w-[80%] truncate z-10">
                          {prod.kategori}
                        </div>
                      </div>

                      {/* Body Content - Berjarak Nyaman dan Rapi */}
                      <div className="p-2.5 sm:p-3 flex flex-col justify-between gap-1 sm:gap-1.5">
                        {/* Judul Komoditas */}
                        <h3
                          className={`text-xs sm:text-xs font-semibold tracking-tight leading-tight line-clamp-2 h-[2.6em] transition-colors ${
                            isOutOfStock
                              ? 'text-slate-500'
                              : 'text-slate-800 group-hover:text-emerald-700'
                          }`}
                          title={prod.nama}
                        >
                          {prod.nama}
                        </h3>

                        {/* Harga Satuan */}
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                            isOutOfStock ? 'text-slate-500' : 'text-slate-900'
                          }`}>
                            Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-normal">
                            /{prod.satuan}
                          </span>
                        </div>

                        {/* Stok */}
                        {isOutOfStock ? (
                          <div className="text-[9px] sm:text-[11px] text-rose-600 font-bold">
                            Stok Habis (0)
                          </div>
                        ) : (
                          <div className="text-[9px] sm:text-[11px] text-slate-500 font-medium">
                            Stok {Number(prod.stok).toLocaleString('id-ID')}
                          </div>
                        )}

                        {/* Nama Akun Petani */}
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
                          className="text-[10px] sm:text-xs font-bold text-slate-800 hover:text-emerald-700 hover:underline transition-colors truncate"
                          title={`Kunjungi Toko ${
                            prod.petani?.name ||
                            (isPetani ? user?.name : 'Petani Koperasi') ||
                            'Petani Koperasi'
                          }`}
                        >
                          {prod.petani?.name ||
                            (isPetani ? user?.name : 'Petani Koperasi') ||
                            'Petani Koperasi'}
                        </div>
                      </div>
                    </div>

                    {/* Footer Action - Compact */}
                    <div className="p-1.5 pt-0 sm:p-2 sm:pt-0">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOutOfStock) return;
                          handleAddToCart(prod, 1);
                        }}
                        className={`w-full py-1 px-1.5 sm:py-1.5 sm:px-2 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-2xs ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                            : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer'
                        }`}
                      >
                        <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>{isOutOfStock ? 'Stok Habis' : '+ Keranjang'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
}
