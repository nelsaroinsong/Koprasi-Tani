'use client';

import React, { useState, useEffect } from 'react';

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

export default function LandingTicker() {
  const [isActive, setIsActive] = useState(true);
  const [speed, setSpeed] = useState(26);
  const [bgColor, setBgColor] = useState('forest');
  const [items, setItems] = useState<string[]>(DEFAULT_ITEMS);

  useEffect(() => {
    fetch('/api/ticker')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setIsActive(data.settings.isActive ?? true);
          setSpeed(data.settings.speed ?? 26);
          setBgColor(data.settings.bgColor || 'forest');
          if (Array.isArray(data.settings.items) && data.settings.items.length > 0) {
            setItems(data.settings.items);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!isActive) return null;

  const currentPreset = PRESETS[bgColor] || PRESETS.forest;
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
