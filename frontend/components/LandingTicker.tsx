'use client';

import React, { useState, useEffect } from 'react';
import defaultTickerConfig from '@/data/ticker-settings.json';

const TICKER_STORAGE_KEY = 'koperasi_ticker_settings';

const DEFAULT_ITEMS = [
  'HASIL PANEN LANGSUNG DARI PETANI',
  'KOMODITAS KELAPA & JAGUNG UNGGULAN',
  'HARGA TRANSPARAN & BEBAS TENGKULAK',
  'SEWA ALAT & MESIN PERTANIAN LENGKAP',
  'PEMBERDAYAAN PETANI MINAHASA UTARA',
  'PEMBAYARAN CASH AMAN DI GUDANG KOPERASI',
  'KUALITAS FISIK TERVERIFIKASI',
  'KOPERASI SINAR PAGI SEJAHTERA',
];

const PRESETS: Record<string, { bgClass: string; textClass: string; dotClass: string; hex: string }> = {
  forest: {
    bgClass: 'bg-[#133e2d]',
    textClass: 'text-emerald-50',
    dotClass: 'text-emerald-400',
    hex: '#133e2d',
  },
  dark: {
    bgClass: 'bg-[#0f172a]',
    textClass: 'text-slate-100',
    dotClass: 'text-emerald-400',
    hex: '#0f172a',
  },
  lime: {
    bgClass: 'bg-[#bbf43d]',
    textClass: 'text-slate-950',
    dotClass: 'text-slate-950',
    hex: '#bbf43d',
  },
  harvest: {
    bgClass: 'bg-[#92400e]',
    textClass: 'text-amber-50',
    dotClass: 'text-amber-300',
    hex: '#92400e',
  },
};

function getSavedSettings() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(TICKER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

export default function LandingTicker() {
  // Inisialisasi awal membaca dari localStorage atau langsung dari ticker-settings.json
  // Hal ini menghilangkan efek 'flash' (beralih warna dari hijau ke kuning saat refresh)
  const [isActive, setIsActive] = useState(() => {
    const cached = getSavedSettings();
    if (cached && typeof cached.isActive === 'boolean') return cached.isActive;
    return typeof defaultTickerConfig.isActive === 'boolean' ? defaultTickerConfig.isActive : true;
  });

  const [speed, setSpeed] = useState(() => {
    const cached = getSavedSettings();
    if (cached && typeof cached.speed === 'number') return cached.speed;
    return typeof defaultTickerConfig.speed === 'number' ? defaultTickerConfig.speed : 50;
  });

  const [bgColor, setBgColor] = useState(() => {
    const cached = getSavedSettings();
    if (cached && cached.bgColor) return cached.bgColor;
    return defaultTickerConfig.bgColor || 'lime';
  });

  const [items, setItems] = useState<string[]>(() => {
    const cached = getSavedSettings();
    if (cached && Array.isArray(cached.items) && cached.items.length > 0) return cached.items;
    if (Array.isArray(defaultTickerConfig.items) && defaultTickerConfig.items.length > 0) return defaultTickerConfig.items;
    return DEFAULT_ITEMS;
  });

  useEffect(() => {
    // Sinkronisasi data terbaru dari server
    fetch('/api/ticker', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setIsActive(data.settings.isActive ?? true);
          setSpeed(data.settings.speed ?? 50);
          setBgColor(data.settings.bgColor || 'lime');
          if (Array.isArray(data.settings.items) && data.settings.items.length > 0) {
            setItems(data.settings.items);
          }
          // Simpan ke localStorage agar saat refresh langsung instan
          try {
            localStorage.setItem(TICKER_STORAGE_KEY, JSON.stringify(data.settings));
          } catch {}
        }
      })
      .catch(() => {});

    // Tangkap perubahan seketika jika admin mengubah setting di tab yang sama
    const handleStorageUpdate = () => {
      const updated = getSavedSettings();
      if (updated) {
        if (typeof updated.isActive === 'boolean') setIsActive(updated.isActive);
        if (typeof updated.speed === 'number') setSpeed(updated.speed);
        if (updated.bgColor) setBgColor(updated.bgColor);
        if (Array.isArray(updated.items) && updated.items.length > 0) setItems(updated.items);
      }
    };

    window.addEventListener('ticker_settings_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('ticker_settings_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  if (!isActive) return null;

  const currentPreset = PRESETS[bgColor] || PRESETS.lime || PRESETS.forest;
  const duplicatedItems = [...items, ...items];

  return (
    <div
      aria-label="Informasi Keunggulan Koperasi"
      className={`relative w-full ${currentPreset.bgClass} ${currentPreset.textClass} overflow-hidden py-1 sm:py-1.5 border-b border-black/10 select-none z-20 shadow-xs pointer-events-none`}
    >
      {/* Edge Fade kiri & kanan dinamis sesuai warna background */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to right, ${currentPreset.hex}, transparent)`,
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to left, ${currentPreset.hex}, transparent)`,
        }}
      />

      {/* Container dengan CSS mask-image fade */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div
          className="animate-marquee-infinite items-center gap-5 sm:gap-8 [&]:hover:[animation-play-state:running]!"
          style={{ animationDuration: `${speed}s` }}
        >
          {duplicatedItems.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="flex items-center gap-5 sm:gap-8 shrink-0"
            >
              <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap leading-tight">
                {item}
              </span>
              <span className={`${currentPreset.dotClass} text-xs sm:text-sm font-black shrink-0 leading-none`}>
                •
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
