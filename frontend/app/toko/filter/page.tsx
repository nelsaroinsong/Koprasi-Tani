'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Clock,
} from 'lucide-react';

const MIN_LIMIT = 5000;
const MAX_LIMIT = 250000;
const STEP = 5000;

function formatRupiahShort(value: number): string {
  if (value >= 1000000) {
    const jt = value / 1000000;
    return `Rp ${jt % 1 === 0 ? jt : jt.toFixed(1)}jt`;
  }
  if (value >= 1000) {
    return `Rp ${Math.round(value / 1000)}rb`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
}

const SORT_OPTIONS = [
  {
    value: 'default',
    label: 'Paling Relevan',
    desc: 'Rekomendasi terbaik komoditas tani',
    icon: Sparkles,
  },
  {
    value: 'termurah',
    label: 'Harga Terendah',
    desc: 'Mulai dari harga paling terjangkau',
    icon: TrendingDown,
  },
  {
    value: 'termahal',
    label: 'Harga Tertinggi',
    desc: 'Kualitas panen pilihan & grade tertinggi',
    icon: TrendingUp,
  },
  {
    value: 'terbaru',
    label: 'Komoditas Terbaru',
    desc: 'Hasil panen segar yang baru masuk',
    icon: Clock,
  },
];

function TokoFilterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State awal dari query params
  const [selectedKategori, setSelectedKategori] = useState<string>(() => {
    return searchParams.get('kategori') || 'SEMUA';
  });

  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(() => {
    return searchParams.get('onlyAvailable') === 'true';
  });

  const [minPrice, setMinPrice] = useState<number>(() => {
    const p = Number(searchParams.get('minPrice'));
    return !isNaN(p) && p >= MIN_LIMIT ? p : MIN_LIMIT;
  });

  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const p = Number(searchParams.get('maxPrice'));
    return !isNaN(p) && p <= MAX_LIMIT && p >= MIN_LIMIT ? p : MAX_LIMIT;
  });

  const [sortBy, setSortBy] = useState<string>(() => {
    return searchParams.get('sortBy') || 'default';
  });

  // State dropdown urutkan
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Data produk & kategori untuk live count
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=100')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      fetch('/api/categories?type=PRODUCT')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ]).then(([prodData, catData]) => {
      if (prodData?.products && Array.isArray(prodData.products)) {
        setProducts(prodData.products);
      }
      if (catData?.categories && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
      }
      setIsLoadingData(false);
    });
  }, []);

  // Category options
  const categoryOptions = useMemo(() => {
    const list = [{ key: 'SEMUA', label: 'Semua Komoditas' }];
    if (categories.length > 0) {
      categories.forEach((cat) => {
        list.push({ key: cat.name, label: cat.name });
      });
    } else if (products.length > 0) {
      const unique = Array.from(new Set(products.map((p) => p.kategori).filter(Boolean)));
      unique.forEach((cat) => {
        list.push({ key: cat, label: cat });
      });
    } else {
      list.push(
        { key: 'Kelapa', label: 'Kelapa' },
        { key: 'Jagung', label: 'Jagung' },
        { key: 'Turunan', label: 'Turunan' }
      );
    }
    return list;
  }, [categories, products]);

  // Live matching result calculation
  const matchedProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Kategori
      if (
        selectedKategori !== 'SEMUA' &&
        item.kategori &&
        item.kategori.toLowerCase().trim() !== selectedKategori.toLowerCase().trim()
      ) {
        return false;
      }

      // 2. Ketersediaan stok
      if (onlyAvailable && (!item.isTersedia || Number(item.stok || 0) <= 0)) {
        return false;
      }

      // 3. Rentang Harga
      const price = Number(item.hargaPerSatuan) || 0;
      if (price < minPrice) return false;
      if (maxPrice < MAX_LIMIT && price > maxPrice) return false;

      return true;
    });
  }, [products, selectedKategori, onlyAvailable, minPrice, maxPrice]);

  const resultCount = matchedProducts.length;

  const currentSortOption =
    SORT_OPTIONS.find((opt) => opt.value === sortBy) || SORT_OPTIONS[0];
  const CurrentSortIcon = currentSortOption.icon;

  // Reset all filters
  const handleReset = () => {
    setSelectedKategori('SEMUA');
    setOnlyAvailable(false);
    setMinPrice(MIN_LIMIT);
    setMaxPrice(MAX_LIMIT);
    setSortBy('default');
  };

  // Apply filters
  const handleApply = () => {
    const params = new URLSearchParams();

    if (selectedKategori && selectedKategori !== 'SEMUA') {
      params.set('kategori', selectedKategori);
    }

    if (onlyAvailable) {
      params.set('onlyAvailable', 'true');
    }

    if (minPrice > MIN_LIMIT) {
      params.set('minPrice', String(minPrice));
    }

    if (maxPrice < MAX_LIMIT) {
      params.set('maxPrice', String(maxPrice));
    }

    if (sortBy && sortBy !== 'default') {
      params.set('sortBy', sortBy);
    }

    const queryString = params.toString();
    router.push(queryString ? `/toko?${queryString}` : '/toko');
  };

  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), maxPrice - STEP);
    setMinPrice(val);
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), minPrice + STEP);
    setMaxPrice(val);
  };

  const minPercent = ((minPrice - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;
  const maxPercent = ((maxPrice - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;

  return (
    <div className="min-h-screen bg-[#f4f5f1] sm:py-6 flex flex-col justify-center items-center font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      {/* Mobile Frame Container */}
      <div className="w-full sm:max-w-md bg-white min-h-screen sm:min-h-[840px] sm:rounded-3xl sm:border sm:border-[#dce1d6] sm:shadow-xl flex flex-col relative overflow-hidden">
        {/* Top Header (Circle X, Bold Title 'Filters', Reset Button) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-5 h-16 flex items-center justify-between border-b border-[#EAEDE7]">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#1a2610] hover:bg-[#2d401c] active:scale-95 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
            aria-label="Tutup Filter"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-[#1a2610] tracking-tight">
            Filters
          </h1>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-[#526046] hover:text-[#1a2610] active:scale-95 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </header>

        {/* Scrollable Filter Body */}
        <main className="flex-1 px-5 py-5 space-y-6 pb-28 overflow-y-auto no-scrollbar">
          {/* 1. SECTION: Category (2-Column Grid of Pills) */}
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
              Kategori Komoditas
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              {categoryOptions.map((cat) => {
                const isSelected =
                  selectedKategori.toLowerCase().trim() === cat.key.toLowerCase().trim();

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedKategori(cat.key)}
                    className={`h-12 px-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#1a2610] text-white font-bold shadow-xs border border-[#1a2610]'
                        : 'bg-white hover:bg-[#f4f5f1] text-[#1a2610] font-semibold border border-[#dce1d6] shadow-2xs'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-[#D4F63D] shrink-0" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-[#68785b] shrink-0" />
                    )}
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. SECTION: Rentang Harga (Range Slider) */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
                Rentang Harga
              </h2>
              <span className="px-3 py-1 rounded-full bg-[#f4f5f1] border border-[#dce1d6] text-xs font-bold text-[#1a2610] tabular-nums shadow-2xs">
                {formatRupiahShort(minPrice)} -{' '}
                {maxPrice >= MAX_LIMIT ? `${formatRupiahShort(MAX_LIMIT)}+` : formatRupiahShort(maxPrice)}
              </span>
            </div>

            <div className="relative pt-3 pb-1 px-1">
              <div className="relative h-2 w-full rounded-full bg-[#EAEDE7]">
                <div
                  className="absolute top-0 bottom-0 bg-[#1a2610] rounded-full"
                  style={{
                    left: `${minPercent}%`,
                    width: `${Math.max(0, maxPercent - minPercent)}%`,
                  }}
                />
              </div>

              <input
                type="range"
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                step={STEP}
                value={minPrice}
                onChange={handleMinSliderChange}
                aria-label="Harga Minimum"
                className="pointer-events-none absolute inset-x-0 top-2.5 h-3 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1a2610] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
              />
              <input
                type="range"
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                step={STEP}
                value={maxPrice}
                onChange={handleMaxSliderChange}
                aria-label="Harga Maksimum"
                className="pointer-events-none absolute inset-x-0 top-2.5 h-3 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1a2610] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
              />

              <div className="flex items-center justify-between text-[11px] font-medium text-[#68785b] mt-3 tabular-nums">
                <span>{formatRupiahShort(MIN_LIMIT)}</span>
                <span>{formatRupiahShort(MAX_LIMIT)}+</span>
              </div>
            </div>
          </section>

          {/* 3. SECTION: Ketersediaan & Stok */}
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
              Ketersediaan Stok
            </h2>

            <div className="rounded-2xl border border-[#dce1d6] bg-white divide-y divide-[#EAEDE7] shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setOnlyAvailable(true)}
                className={`w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                  onlyAvailable ? 'bg-[#f7f9f4]' : 'hover:bg-[#fcfdfa]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#EAEDE7] text-[#1a2610] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#233414]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1a2610]">
                      Stok Tersedia Saja
                    </div>
                    <div className="text-[11px] text-[#526046] truncate">
                      Hanya tampilkan komoditas yang masih ada stok panennya
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    onlyAvailable ? 'border-[#1a2610]' : 'border-[#cfd6c9]'
                  }`}
                >
                  {onlyAvailable && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a2610]" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOnlyAvailable(false)}
                className={`w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                  !onlyAvailable ? 'bg-[#f7f9f4]' : 'hover:bg-[#fcfdfa]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#EAEDE7] text-[#1a2610] flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-[#233414]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1a2610]">
                      Semua Komoditas
                    </div>
                    <div className="text-[11px] text-[#526046] truncate">
                      Tampilkan seluruh katalog komoditas (tersedia & habis)
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    !onlyAvailable ? 'border-[#1a2610]' : 'border-[#cfd6c9]'
                  }`}
                >
                  {!onlyAvailable && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a2610]" />
                  )}
                </div>
              </button>
            </div>
          </section>

          {/* 4. SECTION: Urutkan Berdasarkan (Custom Taste Skills Dropdown) */}
          <section className="space-y-2.5" ref={sortDropdownRef}>
            <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
              Urutkan Berdasarkan
            </h2>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                className={`w-full h-12 px-4 rounded-2xl bg-white border flex items-center justify-between text-xs font-semibold transition-all shadow-2xs cursor-pointer select-none ${
                  isSortDropdownOpen
                    ? 'border-[#1a2610] ring-2 ring-[#1a2610]/10 text-[#1a2610]'
                    : 'border-[#dce1d6] hover:border-[#1a2610] text-[#1a2610]'
                }`}
                aria-expanded={isSortDropdownOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#EAEDE7] text-[#1a2610] flex items-center justify-center shrink-0">
                    <CurrentSortIcon className="w-3.5 h-3.5 text-[#233414]" />
                  </div>
                  <span className="truncate">{currentSortOption.label}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#526046] transition-transform duration-200 shrink-0 ${
                    isSortDropdownOpen ? 'rotate-180 text-[#1a2610]' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isSortDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl bg-white border border-[#dce1d6] shadow-xl p-1.5 space-y-1 overflow-hidden"
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortBy === opt.value;
                      const OptIcon = opt.icon;

                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.value);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#1a2610] text-white font-bold shadow-xs'
                              : 'hover:bg-[#f4f5f1] text-[#1a2610]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-white/15 text-[#D4F63D]'
                                  : 'bg-[#EAEDE7] text-[#526046]'
                              }`}
                            >
                              <OptIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs truncate">{opt.label}</div>
                              <div
                                className={`text-[10px] truncate ${
                                  isSelected ? 'text-[#cfd6c9]' : 'text-[#68785b]'
                                }`}
                              >
                                {opt.desc}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-[#D4F63D] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>

        {/* 5. STICKY BOTTOM BUTTON: Apply Filters [Results] */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-white/95 backdrop-blur-md border-t border-[#EAEDE7]">
          <button
            type="button"
            onClick={handleApply}
            className="w-full h-13 rounded-full bg-[#1a2610] hover:bg-[#233414] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
          >
            <span>Terapkan Filter</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2a3c1e] text-[#D4F63D] text-xs font-bold tabular-nums">
              {isLoadingData ? '...' : `${resultCount} Hasil`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TokoFilterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
          <div className="w-6 h-6 border-2 border-[#1a2610] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TokoFilterContent />
    </Suspense>
  );
}
