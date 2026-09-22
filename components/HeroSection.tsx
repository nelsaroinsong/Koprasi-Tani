'use client';

import React from 'react';
import { ArrowRight, Tractor } from 'lucide-react';

interface HeroSectionProps {
  onExploreToko: () => void;
  onSewaAlsintan: () => void;
  onBookingBanner?: () => void;
}

export default function HeroSection({
  onExploreToko,
  onSewaAlsintan,
}: HeroSectionProps) {
  return (
    <section id="hero-section" className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-forest-accent/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 sm:space-y-8">
          {/* Cooperative Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-50 border border-forest-200/80 text-forest-accent text-xs font-semibold tracking-wide mx-auto shadow-xs">
            <span className="w-2 h-2 rounded-full bg-forest-accent animate-pulse" />
            <span>Koperasi Sinar Pagi Sejahtera &bull; Sinergi Kelompok Tani Minahasa Utara</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] tracking-tight max-w-4xl mx-auto">
            Petani Berdaya, Hasil Panen{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-accent to-emerald-600">
              Naik Kelas
            </span>{' '}
            Menembus Pasar.
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-normal">
            Satu ekosistem terpadu yang menaungi berbagai kelompok tani di Minahasa Utara. Memfasilitasi jual beli komoditas unggulan panen kelapa &amp; jagung langsung, serta penyediaan sewa alsintan modern berbiaya subsidi langsung dari kebun ke pembeli.
          </p>

          {/* Action Buttons CTA */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              id="btn-eksplorasi-toko"
              onClick={onExploreToko}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-forest-accent text-white font-semibold text-sm hover:bg-forest-800 transition-all duration-200 shadow-md shadow-forest-900/10 hover:shadow-lg hover:shadow-forest-900/20 active:scale-[0.98] cursor-pointer"
              type="button"
            >
              <span>Mulai Eksplorasi Toko Online</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="btn-sewa-alsintan-hero"
              onClick={onSewaAlsintan}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-xs active:scale-[0.98] cursor-pointer"
              type="button"
            >
              <Tractor className="w-4 h-4 text-forest-700" />
              <span>Sewa Alsintan Pertanian</span>
            </button>
          </div>

          {/* Highlight Metric Mini-Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-slate-200/80 max-w-3xl mx-auto">
            <div id="stat-kelompok" className="text-center">
              <p className="text-3xl font-black text-forest-accent">18+</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Kelompok Tani</p>
            </div>
            <div id="stat-petani" className="text-center">
              <p className="text-3xl font-black text-forest-accent">1.240+</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Petani Tergabung</p>
            </div>
            <div id="stat-alsintan" className="text-center">
              <p className="text-3xl font-black text-forest-accent">35+ Unit</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Alsintan Modern</p>
            </div>
            <div id="stat-transaksi" className="text-center">
              <p className="text-3xl font-black text-forest-accent">Rp 4.2 M</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Transaksi Panen</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
