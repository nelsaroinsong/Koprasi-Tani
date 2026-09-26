'use client';

import React from 'react';

const TICKER_ITEMS = [
  'HASIL PANEN LANGSUNG DARI PETANI',
  'KOMODITAS KELAPA & JAGUNG UNGGULAN',
  'HARGA TRANSPARAN & BEBAS TENGKULAK',
  'SEWA ALAT & MESIN PERTANIAN LENGKAP',
  'PEMBERDAYAAN PETANI MINAHASA UTARA',
  'PEMBAYARAN CASH AMAN DI GUDANG KOPERASI',
  'KUALITAS FISIK TERVERIFIKASI',
  'KOPERASI SINAR PAGI SEJAHTERA',
];

export default function LandingTicker() {
  // Duplikasi array agar looping marquee bergerak terus secara mulus (infinite seamless loop)
  const duplicatedItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div
      aria-label="Informasi Keunggulan Koperasi"
      className="relative w-full bg-[#133e2d] text-emerald-100 overflow-hidden py-1 sm:py-1.5 border-b border-[#0c2a1f]/60 select-none z-20 shadow-xs pointer-events-none"
    >
      {/* Edge Fade kiri & kanan persis seperti logo didukung oleh */}
      <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#133e2d] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#133e2d] to-transparent z-10 pointer-events-none" />

      {/* Container dengan CSS mask-image fade */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="animate-marquee-infinite items-center gap-5 sm:gap-8 [animation-duration:26s] [&]:hover:[animation-play-state:running]!">
          {duplicatedItems.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="flex items-center gap-5 sm:gap-8 shrink-0"
            >
              <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap text-emerald-50 leading-tight">
                {item}
              </span>
              <span className="text-emerald-400 text-xs sm:text-sm font-black shrink-0 leading-none">
                •
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
