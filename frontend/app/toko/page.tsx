'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Loader2,
  X,
  Store,
  ArrowUpRight,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getCart, saveCart } from '@/lib/cart';
import { getPrimaryImage } from '@/lib/utils';

import defaultCategoriesData from '@/data/categories.json';

const CATEGORIES_STORAGE_KEY = 'koperasi_categories_cache';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  imageUrl?: string;
  description?: string;
  mobileBg?: string;
  isActive?: boolean;
}

export interface TabCategoryConfig {
  key: string;
  label: string;
  pillLabel: string;
  emoji: string;
  mobileBg: string;
  imageUrl?: string;
}

const getCategoryIcon = (categoryName: string) => {
  const norm = categoryName.toLowerCase().trim();
  if (norm === 'semua' || norm === 'semua komoditas') return '/api/images/categories/all.jpg';
  if (norm === 'semua alat') return '/api/images/categories/semua-alat.jpg';
  if (norm.includes('kelapa')) return '/api/images/categories/kelapa.jpg';
  if (norm.includes('jagung')) return '/api/images/categories/jagung.jpg';
  if (norm.includes('turunan')) return '/api/images/categories/turunan.jpg';
  if (norm.includes('olahan') || norm.includes('vco') || norm.includes('minyak')) return '/api/images/categories/olahan.jpg';
  if (norm.includes('alat') || norm.includes('traktor') || norm.includes('mesin') || norm.includes('roda')) return '/api/images/categories/alat.jpg';
  return '/api/images/categories/all.jpg';
};

function loadCategoriesFromCache(): CategoryItem[] {
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

function TokoOnlineContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPetani = user?.role === 'PETANI';

  // Dynamic Categories State from Admin (Gunakan defaultCategoriesData sebagai initial state agar SSR & Hydration 100% sinkron)
  const [categories, setCategories] = useState<CategoryItem[]>(defaultCategoriesData as CategoryItem[]);

  useEffect(() => {
    // 1. Sync dari cache localStorage setelah komponen mount di browser (bebas hydration mismatch)
    const cached = loadCategoriesFromCache();
    if (cached && cached.length > 0) {
      setCategories(cached);
    }

    // 2. Ambil data terbaru dari server API
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
      const updated = loadCategoriesFromCache();
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
    const activeCategories = categories.filter((c) => c.isActive !== false);
    const mapped: TabCategoryConfig[] = activeCategories.map((cat) => ({
      key: cat.name,
      label: cat.name,
      pillLabel: cat.name,
      emoji: cat.emoji || '',
      mobileBg: cat.mobileBg || '',
      imageUrl: cat.imageUrl,
    }));
    return [allTab, ...mapped];
  }, [categories]);

  // Filter & Search States
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState(5000);
  const [maxPrice, setMaxPrice] = useState(250000);
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sync filter states from URL search params & validasi kategori aktif
  useEffect(() => {
    const kat = searchParams.get('kategori') || 'SEMUA';

    // Periksa apakah kategori yang diminta di URL terdaftar sebagai nonaktif
    const isInactive =
      kat !== 'SEMUA' &&
      categories.some(
        (c) => c.name.toLowerCase() === kat.toLowerCase().trim() && c.isActive === false
      );

    if (isInactive) {
      // Jika kategori nonaktif, bersihkan dari state dan URL
      setSelectedKategori('SEMUA');
      const params = new URLSearchParams(searchParams.toString());
      params.delete('kategori');
      const query = params.toString();
      router.replace(query ? `/toko?${query}` : '/toko', { scroll: false });
    } else {
      setSelectedKategori(kat);
    }

    setOnlyAvailable(searchParams.get('onlyAvailable') === 'true');

    const minP = Number(searchParams.get('minPrice'));
    setMinPrice(!isNaN(minP) && minP >= 5000 ? minP : 5000);

    const maxP = Number(searchParams.get('maxPrice'));
    setMaxPrice(!isNaN(maxP) && maxP <= 250000 && maxP >= 5000 ? maxP : 250000);

    setSortBy(searchParams.get('sortBy') || 'default');
  }, [searchParams, categories, router]);

  const hasActiveFilters =
    selectedKategori !== 'SEMUA' ||
    onlyAvailable ||
    minPrice > 5000 ||
    maxPrice < 250000 ||
    sortBy !== 'default';

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
          // Jika kategori yang dipilih saat ini dinonaktifkan, batalkan query dan kosongkan list
          const isCategoryInactive = categories.some(
            (c) => c.name.toLowerCase() === selectedKategori.toLowerCase().trim() && c.isActive === false
          );
          if (isCategoryInactive) {
            setProducts([]);
            setHasMore(false);
            setTotalProductsCount(0);
            setIsLoadingProducts(false);
            return;
          }
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
          imageUrl: getPrimaryImage(product.imageUrl),
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

  // Filter & Urutan Komprehensif Produk
  const displayedProducts = useMemo(() => {
    // Saring keluar produk dari kategori yang dinonaktifkan
    const inactiveCatNames = categories
      .filter((c) => c.isActive === false)
      .map((c) => c.name.toLowerCase().trim());

    let list = products.filter(
      (p) => !p.kategori || !inactiveCatNames.includes(p.kategori.toLowerCase().trim())
    );

    if (onlyAvailable) {
      list = list.filter((p) => p.isTersedia && Number(p.stok || 0) > 0);
    }

    if (minPrice > 5000 || maxPrice < 250000) {
      list = list.filter((p) => {
        const price = Number(p.hargaPerSatuan) || 0;
        return price >= minPrice && (maxPrice >= 250000 || price <= maxPrice);
      });
    }

    if (sortBy === 'termurah') {
      list.sort((a, b) => (Number(a.hargaPerSatuan) || 0) - (Number(b.hargaPerSatuan) || 0));
    } else if (sortBy === 'termahal') {
      list.sort((a, b) => (Number(b.hargaPerSatuan) || 0) - (Number(a.hargaPerSatuan) || 0));
    } else if (sortBy === 'terbaru') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'terpopuler') {
      list.sort((a, b) => {
        const soldB = Number(b.totalTerjual || 0);
        const soldA = Number(a.totalTerjual || 0);
        if (soldB !== soldA) return soldB - soldA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }

    return list;
  }, [products, onlyAvailable, minPrice, maxPrice, sortBy]);

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
      {/* App Header with Desktop Catalog Sub-Navbar (Semua, Kategori, Terbaru, Terpopuler) */}
      <AppHeader
        activePage="toko"
        selectedKategori={selectedKategori}
        onSelectKategori={(kategori) => {
          setSelectedKategori(kategori);
          setSortBy('default');
          const params = new URLSearchParams(searchParams.toString());
          if (kategori === 'SEMUA') {
            params.delete('kategori');
          } else {
            params.set('kategori', kategori);
          }
          params.delete('sortBy');
          const query = params.toString();
          router.replace(query ? `/toko?${query}` : '/toko', { scroll: false });
        }}
        sortBy={sortBy}
        onSelectSort={(newSort) => {
          setSortBy(newSort);
          if (newSort !== 'default') {
            setSelectedKategori('SEMUA');
          }
          const params = new URLSearchParams(searchParams.toString());
          if (newSort === 'default') {
            params.delete('sortBy');
          } else {
            params.set('sortBy', newSort);
            params.delete('kategori');
          }
          const query = params.toString();
          router.replace(query ? `/toko?${query}` : '/toko', { scroll: false });
        }}
        categories={categories}
      />

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
                className="w-5 h-5 rounded-full bg-[#EAEDE7] hover:bg-[#cfd6c9] text-[#233414] flex items-center justify-center transition cursor-pointer shrink-0"
                title="Bersihkan"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Category Section - Mobile Mode (UI seperti Toko dengan Image Generate 3D & Filter Icon di Paling Kiri) */}
        <div className="mb-6 md:hidden">
          <div className="mb-3 px-1">
            <h2 className="text-sm font-bold text-[#1a2610] tracking-tight">
              Kategori Komoditas
            </h2>
          </div>

          <div className="flex items-start gap-2.5 overflow-x-auto pb-2 no-scrollbar px-1">
            {/* 1. Tombol Filter Mode Mobile: Di Paling Kiri, Icon Saja (Membuka /toko/filter) */}
            <button
              type="button"
              onClick={() => {
                const p = new URLSearchParams();
                if (selectedKategori && selectedKategori !== 'SEMUA') p.set('kategori', selectedKategori);
                if (onlyAvailable) p.set('onlyAvailable', 'true');
                if (minPrice && minPrice > 5000) p.set('minPrice', String(minPrice));
                if (maxPrice && maxPrice < 250000) p.set('maxPrice', String(maxPrice));
                if (sortBy && sortBy !== 'default') p.set('sortBy', sortBy);
                router.push(`/toko/filter?${p.toString()}`);
              }}
              className="flex flex-col items-center group shrink-0 focus:outline-none cursor-pointer"
              aria-label="Filter Komoditas"
              title="Buka Filter Komoditas"
            >
              <div
                className={`w-15 h-15 rounded-2xl p-1.5 flex items-center justify-center transition-all relative ${
                  hasActiveFilters
                    ? 'bg-[#1a2610] text-[#D4F63D] border-2 border-[#1a2610] shadow-xs'
                    : 'bg-white hover:bg-[#EAEDE7] border border-[#dce1d6] text-[#233414] shadow-2xs'
                }`}
              >
                <SlidersHorizontal className="w-5.5 h-5.5" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D4F63D] border-2 border-white ring-1 ring-[#1a2610]" />
                )}
              </div>
              <span
                className={`text-[11px] text-center mt-1.5 transition-colors leading-tight ${
                  hasActiveFilters
                    ? 'text-[#1a2610] font-bold'
                    : 'text-[#526046] font-medium group-hover:text-[#1a2610]'
                }`}
              >
                Filter
              </span>
            </button>

            {/* 2. Kartu Kategori Komoditas: Image Generate 3D */}
            {dynamicKategoriConfig.map((cat) => {
              const isSelected = selectedKategori.toLowerCase().trim() === cat.key.toLowerCase().trim();
              const iconSrc = cat.imageUrl || getCategoryIcon(cat.key);

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setSelectedKategori(cat.key);
                    setSortBy('default');
                    const params = new URLSearchParams(searchParams.toString());
                    if (cat.key === 'SEMUA') {
                      params.delete('kategori');
                    } else {
                      params.set('kategori', cat.key);
                    }
                    params.delete('sortBy');
                    const query = params.toString();
                    router.replace(query ? `/toko?${query}` : '/toko', { scroll: false });
                  }}
                  className="flex flex-col items-center group shrink-0 focus:outline-none cursor-pointer"
                >
                  <div
                    className={`w-15 h-15 rounded-2xl p-1.5 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white border-2 border-[#233414] shadow-xs'
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
                    className={`text-[11px] text-center mt-1.5 transition-colors max-w-[70px] truncate ${
                      isSelected
                        ? 'text-[#233414] font-bold'
                        : 'text-[#526046] font-medium group-hover:text-[#1a2610]'
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

        {/* Active Filter Chips (Mode Mobile & Desktop) */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-3 px-1 no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-[#526046] uppercase shrink-0">Filter Aktif:</span>
            {selectedKategori !== 'SEMUA' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] shadow-2xs shrink-0">
                <span>{selectedKategori}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKategori('SEMUA');
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('kategori');
                    const query = params.toString();
                    router.replace(query ? `/toko?${query}` : '/toko', { scroll: false });
                  }}
                  className="hover:text-red-600 cursor-pointer"
                  title="Hapus filter kategori"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {onlyAvailable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f2c8] border border-[#c9e39e] text-xs font-bold text-[#233414] shadow-2xs shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[#344d15]" />
                <span>Stok Tersedia</span>
                <button
                  type="button"
                  onClick={() => setOnlyAvailable(false)}
                  className="hover:text-red-600 cursor-pointer"
                  title="Hapus filter stok tersedia"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(minPrice > 5000 || maxPrice < 250000) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] shadow-2xs shrink-0">
                <span>
                  {minPrice >= 1000000 ? `Rp ${(minPrice / 1000000).toFixed(1)}jt` : `Rp ${Math.round(minPrice / 1000)}rb`} -{' '}
                  {maxPrice >= 250000 ? 'Maksimal' : maxPrice >= 1000000 ? `Rp ${(maxPrice / 1000000).toFixed(1)}jt` : `Rp ${Math.round(maxPrice / 1000)}rb`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice(5000);
                    setMaxPrice(250000);
                  }}
                  className="hover:text-red-600 cursor-pointer"
                  title="Reset rentang harga"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {sortBy !== 'default' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] shadow-2xs shrink-0">
                <span>
                  Urut:{' '}
                  {sortBy === 'termurah'
                    ? 'Harga Terendah'
                    : sortBy === 'termahal'
                    ? 'Harga Tertinggi'
                    : sortBy === 'terbaru'
                    ? 'Komoditas Terbaru'
                    : sortBy === 'terpopuler'
                    ? 'Terpopuler'
                    : sortBy}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('default');
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('sortBy');
                    const query = params.toString();
                    router.replace(query ? `/toko?${query}` : '/toko', { scroll: false });
                  }}
                  className="hover:text-red-600 cursor-pointer"
                  title="Reset urutan"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedKategori('SEMUA');
                setOnlyAvailable(false);
                setMinPrice(5000);
                setMaxPrice(250000);
                setSortBy('default');
                router.replace('/toko', { scroll: false });
              }}
              className="text-xs font-semibold text-red-600 hover:text-red-700 underline underline-offset-2 ml-1 cursor-pointer shrink-0"
            >
              Reset Semua
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoadingProducts ? (
          <div className="py-14 sm:py-24 flex flex-col items-center justify-center gap-2.5 sm:gap-3">
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#233414] animate-spin" />
            <span className="text-xs sm:text-[13px] text-[#344d15] font-medium">
              Memuat katalog komoditas...
            </span>
          </div>
        ) : displayedProducts.length === 0 ? (
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
            {(selectedKategori !== 'SEMUA' || searchQuery || hasActiveFilters) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedKategori('SEMUA');
                  setSearchQuery('');
                  setOnlyAvailable(false);
                  setMinPrice(5000);
                  setMaxPrice(250000);
                  setSortBy('default');
                  router.replace('/toko');
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
                - Mobile (<640px): 2 Kolom Proporsional (gap-3)
                - Tablet (sm/md): 2 - 3 Kolom Modern (gap-4)
                - Desktop (lg/xl): 4 Kolom Editorial Taste (gap-5) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {displayedProducts.map((prod) => {
                const isOutOfStock = !prod.isTersedia || Number(prod.stok || 0) <= 0;
                const farmerName =
                  prod.petani?.name ||
                  (isPetani ? user?.name : 'Petani Koperasi') ||
                  'Petani Koperasi';

                return (
                  <article
                    key={prod.id}
                    onClick={() => router.push(`/toko/${prod.id}`)}
                    className={`border rounded-[20px] sm:rounded-[24px] p-1 sm:p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(35,52,20,0.09)] transition-all duration-300 flex flex-col group cursor-pointer h-full relative overflow-hidden ${
                      isOutOfStock
                        ? 'grayscale opacity-75 bg-[#f4f5f1] border-[#d5dccf]'
                        : 'bg-white border-[#e2e7dc] hover:border-[#344d15]'
                    }`}
                  >
                    {/* Top Header Text Section (Title & Subtitle on top, tight 1px-1.5px interlinear gap, balanced breathing space to image) */}
                    <div className="px-2.5 pt-2 pb-2 sm:px-3 sm:pt-2.5 sm:pb-2.5">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] sm:text-xs text-[#73826a] font-medium truncate">
                          {prod.kategori || 'Hasil Tani'}
                        </span>
                        {sortBy === 'terbaru' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#e8f2db] text-[#2b4413] text-[9px] font-bold shrink-0">
                            Panen Baru
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-xs sm:text-base lg:text-[17px] font-bold text-[#1a2610] tracking-tight leading-snug pb-0.5 mb-1 sm:mb-1.5 line-clamp-1 group-hover:text-[#344d15] transition-colors"
                        title={prod.nama}
                      >
                        {prod.nama}
                      </h3>

                      {/* Akun Petani Penyedia Komoditas Panen */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (prod.petani?.id) {
                              e.stopPropagation();
                              router.push(`/toko/petani/${prod.petani.id}`);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-[#526046] hover:text-[#1a2610] font-medium truncate group/farmer text-left"
                          title={`Buka toko petani ${farmerName}`}
                        >
                          {prod.petani?.avatarUrl ? (
                            <img
                              src={prod.petani.avatarUrl}
                              alt={farmerName}
                              referrerPolicy="no-referrer"
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full object-cover shrink-0 border border-[#dce1d6]"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const fallback = (e.target as HTMLElement).parentElement?.querySelector('.farmer-fallback');
                                if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#EAEDE7] text-[#233414] text-[9px] font-bold flex items-center justify-center shrink-0 farmer-fallback ${prod.petani?.avatarUrl ? 'hidden' : ''}`}>
                            {farmerName.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate group-hover/farmer:underline">{farmerName}</span>
                        </button>
                      </div>
                    </div>

                    {/* Middle / Bottom Canvas: Ultra-Thin Minimalist Rounded Inner Image Container */}
                    <div className="relative w-full aspect-[4/3.8] sm:aspect-[4/3.5] rounded-[17px] sm:rounded-[21px] overflow-hidden bg-[#eef1eb] shrink-0">
                      {/* Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          getPrimaryImage(
                            prod.imageUrl,
                            'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=600&q=80'
                          )
                        }
                        alt={prod.nama}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
                          isOutOfStock ? 'grayscale opacity-75' : ''
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=600&q=80';
                        }}
                      />

                      {/* Badge Terpopuler (Banyak Terjual) */}
                      {sortBy === 'terpopuler' && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-[#1a2610]/85 backdrop-blur-xs text-[#D4F63D] text-[10px] font-bold flex items-center gap-1 shadow-xs border border-white/10">
                          <span>🔥 Terpopuler</span>
                          <span className="text-white/80 font-normal">({Number(prod.totalTerjual || 0).toLocaleString('id-ID')} terjual)</span>
                        </div>
                      )}

                      {/* Dark Gradient Overlay for bottom text & circular button pop */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                      {/* Bottom Overlay: Price on Left, Circular Button ↗ on Right */}
                      <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-end justify-between z-10 gap-2">
                        {/* Price & Stok / Terjual */}
                        <div className="flex flex-col text-white drop-shadow-xs min-w-0">
                          <div className="flex items-baseline gap-0.5 leading-none">
                            <span className="text-xs sm:text-base lg:text-lg font-extrabold tracking-tight tabular-nums text-white">
                              Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[9px] sm:text-[11px] font-normal text-white/80 shrink-0">
                              /{prod.satuan}
                            </span>
                          </div>
                          {!isOutOfStock && (
                            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-white/80 font-medium mt-1 truncate">
                              <span>Stok: {Number(prod.stok).toLocaleString('id-ID')}</span>
                              <span>•</span>
                              <span className={sortBy === 'terpopuler' ? 'text-[#D4F63D] font-bold' : 'text-white/90'}>
                                {Number(prod.totalTerjual || 0).toLocaleString('id-ID')} terjual
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Circular Action Button with ArrowUpRight ↗ */}
                        <div
                          className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10.5 lg:h-10.5 rounded-full bg-white text-[#1a2610] shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-[#233414] group-hover:text-white shrink-0"
                          title="Buka Detail Produk"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5 stroke-[2.2]" />
                        </div>
                      </div>
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
                  Menampilkan {displayedProducts.length} dari {totalProductsCount} komoditas
                </span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function TokoOnlinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
          <div className="w-6 h-6 border-2 border-[#233414] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TokoOnlineContent />
    </Suspense>
  );
}
