'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  X,
  Check,
  CheckCircle2,
  Package,
  UserCheck,
  SlidersHorizontal,
  ArrowUpDown,
  Layers,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const MIN_LIMIT = 50000;
const MAX_LIMIT = 2500000;
const STEP = 25000;

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

function formatRupiahFull(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function FilterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State awal dari query params
  const [selectedKategori, setSelectedKategori] = useState<string>(() => {
    return searchParams.get('kategori') || 'SEMUA';
  });

  const [statusOption, setStatusOption] = useState<'SIAP_PAKAI' | 'SEMUA' | 'DENGAN_OPERATOR'>(() => {
    if (searchParams.get('operatorOnly') === 'true') return 'DENGAN_OPERATOR';
    if (searchParams.get('onlyAvailable') === 'true') return 'SIAP_PAKAI';
    return 'SEMUA';
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

  // Data alat & kategori untuk penghitungan live result count
  const [equipments, setEquipments] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/equipments')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      fetch('/api/admin/equipment-categories')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ]).then(([eqData, catData]) => {
      if (eqData?.equipments && Array.isArray(eqData.equipments)) {
        setEquipments(eqData.equipments);
      }
      if (catData?.categories && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
      }
      setIsLoadingData(false);
    });
  }, []);

  // Daftar kategori gabungan (Admin categories + Semua Alat)
  const categoryOptions = useMemo(() => {
    const list = [{ key: 'SEMUA', label: 'Semua Alat' }];
    if (categories.length > 0) {
      categories.forEach((cat) => {
        list.push({ key: cat.name, label: cat.name });
      });
    } else if (equipments.length > 0) {
      const unique = Array.from(new Set(equipments.map((e) => e.kategori).filter(Boolean)));
      unique.forEach((cat) => {
        list.push({ key: cat, label: cat });
      });
    } else {
      list.push(
        { key: 'Roda 4', label: 'Roda 4' },
        { key: 'Roda 2', label: 'Roda 2' },
        { key: 'Kultivator', label: 'Kultivator' }
      );
    }
    return list;
  }, [categories, equipments]);

  // Hitung live jumlah hasil yang cocok secara real-time
  const matchedEquipments = useMemo(() => {
    return equipments.filter((item) => {
      // 1. Kategori
      if (
        selectedKategori !== 'SEMUA' &&
        item.kategori &&
        item.kategori.toLowerCase().trim() !== selectedKategori.toLowerCase().trim()
      ) {
        return false;
      }

      // 2. Status & Kesiapan
      if (statusOption === 'SIAP_PAKAI' && !item.isTersedia) {
        return false;
      }
      if (statusOption === 'DENGAN_OPERATOR' && (item.biayaOperator === null || item.biayaOperator === undefined)) {
        return false;
      }

      // 3. Biaya Sewa
      const price = Number(item.hargaSewa) || 0;
      if (price < minPrice) return false;
      if (maxPrice < MAX_LIMIT && price > maxPrice) return false;

      return true;
    });
  }, [equipments, selectedKategori, statusOption, minPrice, maxPrice]);

  const resultCount = matchedEquipments.length;

  // Aksi Reset semua filter
  const handleReset = () => {
    setSelectedKategori('SEMUA');
    setStatusOption('SEMUA');
    setMinPrice(MIN_LIMIT);
    setMaxPrice(MAX_LIMIT);
    setSortBy('default');
  };

  // Aksi Terapkan Filter
  const handleApply = () => {
    const params = new URLSearchParams();

    if (selectedKategori && selectedKategori !== 'SEMUA') {
      params.set('kategori', selectedKategori);
    }

    if (statusOption === 'SIAP_PAKAI') {
      params.set('onlyAvailable', 'true');
    } else if (statusOption === 'DENGAN_OPERATOR') {
      params.set('operatorOnly', 'true');
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
    router.push(queryString ? `/sewa-alat?${queryString}` : '/sewa-alat');
  };

  // Slider change handlers
  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), maxPrice - STEP);
    setMinPrice(val);
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), minPrice + STEP);
    setMaxPrice(val);
  };

  // Percent calculation for the active slider track bar
  const minPercent = ((minPrice - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;
  const maxPercent = ((maxPrice - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;

  return (
    <div className="min-h-screen bg-[#f4f5f1] sm:py-6 flex flex-col justify-center items-center font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      {/* Mobile Frame Container matching Mockup */}
      <div className="w-full sm:max-w-md bg-white min-h-screen sm:min-h-[840px] sm:rounded-3xl sm:border sm:border-[#dce1d6] sm:shadow-xl flex flex-col relative overflow-hidden">
        {/* Top Header matching Mockup (Circle X, Bold Title 'Filters', Reset Button) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-5 h-16 flex items-center justify-between border-b border-[#EAEDE7]">
          {/* Close Button: Black Circle with White X */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#1a2610] hover:bg-[#2d401c] active:scale-95 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
            aria-label="Tutup Filter"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Centered Title */}
          <h1 className="text-base sm:text-lg font-bold text-[#1a2610] tracking-tight">
            Filters
          </h1>

          {/* Reset Button */}
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
          {/* 1. SECTION: Category (2-Column Grid of Pills matching Mockup) */}
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
              Category
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

          {/* 2. SECTION: Hourly Rate / Tarif Sewa (Slider matching Mockup) */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
                Biaya Sewa
              </h2>
              {/* Badge value range matching mockup "$45 - $120" */}
              <span className="px-3 py-1 rounded-full bg-[#f4f5f1] border border-[#dce1d6] text-xs font-bold text-[#1a2610] tabular-nums shadow-2xs">
                {formatRupiahShort(minPrice)} - {maxPrice >= MAX_LIMIT ? `${formatRupiahShort(MAX_LIMIT)}+` : formatRupiahShort(maxPrice)}
              </span>
            </div>

            {/* Custom Dual Range Slider matching Mockup */}
            <div className="relative pt-3 pb-1 px-1">
              {/* Background Track */}
              <div className="relative h-2 w-full rounded-full bg-[#EAEDE7]">
                {/* Active Highlighted Segment between min & max thumbs */}
                <div
                  className="absolute top-0 bottom-0 bg-[#1a2610] rounded-full"
                  style={{
                    left: `${minPercent}%`,
                    width: `${Math.max(0, maxPercent - minPercent)}%`,
                  }}
                />
              </div>

              {/* Native Range Inputs with custom hidden tracks and solid black knob thumbs */}
              <input
                type="range"
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                step={STEP}
                value={minPrice}
                onChange={handleMinSliderChange}
                aria-label="Tarif Minimum"
                className="pointer-events-none absolute inset-x-0 top-2.5 h-3 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1a2610] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
              />
              <input
                type="range"
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                step={STEP}
                value={maxPrice}
                onChange={handleMaxSliderChange}
                aria-label="Tarif Maksimum"
                className="pointer-events-none absolute inset-x-0 top-2.5 h-3 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1a2610] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
              />

              {/* Min & Max Labels Below Track matching Mockup ($10 vs $200+) */}
              <div className="flex items-center justify-between text-[11px] font-medium text-[#68785b] mt-3 tabular-nums">
                <span>{formatRupiahShort(MIN_LIMIT)}</span>
                <span>{formatRupiahShort(MAX_LIMIT)}+</span>
              </div>
            </div>
          </section>

          {/* 3. SECTION: Experience Level -> Status & Layanan Alsintan (Card Container matching Mockup) */}
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
              Status & Kesiapan Unit
            </h2>

            <div className="rounded-2xl border border-[#dce1d6] bg-white divide-y divide-[#EAEDE7] shadow-2xs overflow-hidden">
              {/* Option 1: Siap Pakai Saja */}
              <button
                type="button"
                onClick={() => setStatusOption('SIAP_PAKAI')}
                className={`w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                  statusOption === 'SIAP_PAKAI' ? 'bg-[#f7f9f4]' : 'hover:bg-[#fcfdfa]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#EAEDE7] text-[#1a2610] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#233414]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1a2610]">
                      Siap Pakai Saja
                    </div>
                    <div className="text-[11px] text-[#526046] truncate">
                      Hanya unit alsintan yang tersedia dan belum dibooking
                    </div>
                  </div>
                </div>

                {/* Radio Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    statusOption === 'SIAP_PAKAI'
                      ? 'border-[#1a2610]'
                      : 'border-[#cfd6c9]'
                  }`}
                >
                  {statusOption === 'SIAP_PAKAI' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a2610]" />
                  )}
                </div>
              </button>

              {/* Option 2: Semua Status Unit */}
              <button
                type="button"
                onClick={() => setStatusOption('SEMUA')}
                className={`w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                  statusOption === 'SEMUA' ? 'bg-[#f7f9f4]' : 'hover:bg-[#fcfdfa]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#EAEDE7] text-[#1a2610] flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-[#233414]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1a2610]">
                      Semua Unit Alat
                    </div>
                    <div className="text-[11px] text-[#526046] truncate">
                      Tampilkan seluruh armada alat (tersedia & sedang disewa)
                    </div>
                  </div>
                </div>

                {/* Radio Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    statusOption === 'SEMUA'
                      ? 'border-[#1a2610]'
                      : 'border-[#cfd6c9]'
                  }`}
                >
                  {statusOption === 'SEMUA' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a2610]" />
                  )}
                </div>
              </button>

              {/* Option 3: Termasuk Operator */}
              <button
                type="button"
                onClick={() => setStatusOption('DENGAN_OPERATOR')}
                className={`w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                  statusOption === 'DENGAN_OPERATOR' ? 'bg-[#f7f9f4]' : 'hover:bg-[#fcfdfa]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#EAEDE7] text-[#1a2610] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-[#233414]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1a2610]">
                      Termasuk Operator
                    </div>
                    <div className="text-[11px] text-[#526046] truncate">
                      Unit yang menyediakan opsi operator berpengalaman
                    </div>
                  </div>
                </div>

                {/* Radio Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    statusOption === 'DENGAN_OPERATOR'
                      ? 'border-[#1a2610]'
                      : 'border-[#cfd6c9]'
                  }`}
                >
                  {statusOption === 'DENGAN_OPERATOR' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a2610]" />
                  )}
                </div>
              </button>
            </div>
          </section>

          {/* 4. SECTION: Location -> Urutkan Hasil (Single Rounded Selector matching Mockup) */}
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold text-[#526046] uppercase tracking-wider">
              Urutkan Berdasarkan
            </h2>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-white border border-[#dce1d6] text-xs font-semibold text-[#1a2610] appearance-none focus:outline-none focus:border-[#1a2610] focus:ring-1 focus:ring-[#1a2610] shadow-2xs transition-all cursor-pointer"
              >
                <option value="default">Paling Relevan</option>
                <option value="termurah">Tarif Terendah</option>
                <option value="termahal">Tarif Tertinggi</option>
                <option value="terbaru">Unit Terbaru Ditambahkan</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#526046]">
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </div>
          </section>
        </main>

        {/* 5. STICKY BOTTOM BUTTON: Apply Filters [Results] matching Mockup */}
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

export default function EquipmentFilterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
          <div className="w-6 h-6 border-2 border-[#1a2610] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FilterContent />
    </Suspense>
  );
}
