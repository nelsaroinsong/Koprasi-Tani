'use client';

import React from 'react';
import { ArrowRight, Tractor, Star, TrendingUp } from 'lucide-react';

interface HeroSectionProps {
  onExploreToko: () => void;
  onSewaAlsintan: () => void;
  onBookingBanner: () => void;
}

export default function HeroSection({
  onExploreToko,
  onSewaAlsintan,
  onBookingBanner,
}: HeroSectionProps) {
  return (
    <section id="hero-section" className="relative pt-12 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tagline Pill */}
            <div
              id="hero-tagline-pill"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-forest-700 text-xs font-semibold badge-pill"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>🌱 Platform Digital Koperasi Agribisnis Terpadu Minahasa Utara</span>
            </div>

            {/* Headline */}
            <h2 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-slate-900 leading-[1.15] tracking-tight">
              Petani Berdaya, Hasil Panen{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-accent to-emerald-600">
                Naik Kelas
              </span>{' '}
              Menembus Pasar Global.
            </h2>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Satu ekosistem terpadu untuk jual beli komoditas kelapa &amp; jagung, sewa alat mesin pertanian modern
              berbiaya subsidi, hingga permodalan terverifikasi Koperasi Sinar Pagi Sejahtera.
            </p>

            {/* Action Buttons CTA */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                id="btn-eksplorasi-toko"
                onClick={onExploreToko}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-forest-accent text-white font-semibold text-sm hover:bg-forest-800 transition shadow-md shadow-forest-900/10 cursor-pointer"
                type="button"
              >
                <span>Mulai Eksplorasi Toko Online</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="btn-sewa-alsintan-hero"
                onClick={onSewaAlsintan}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition shadow-sm cursor-pointer"
                type="button"
              >
                <Tractor className="w-4 h-4 text-forest-700" />
                <span>Sewa Alsintan Pertanian</span>
              </button>
            </div>

            {/* Highlight Metric Mini-Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200">
              <div id="stat-petani">
                <p className="text-2xl font-black text-forest-accent">1.240+</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Petani Anggota</p>
              </div>
              <div id="stat-alsintan">
                <p className="text-2xl font-black text-forest-accent">35+ Unit</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Alsintan Modern</p>
              </div>
              <div id="stat-transaksi">
                <p className="text-2xl font-black text-forest-accent">Rp 4.2 M</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Transaksi Panen</p>
              </div>
              <div id="stat-ontime">
                <p className="text-2xl font-black text-forest-accent">98%</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Tepat Waktu Pasca</p>
              </div>
            </div>
          </div>

          {/* Right Visual Showcase / Dynamic Cards */}
          <div className="lg:col-span-5 relative">
            {/* Main Card Container */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/70 border border-slate-200/90 relative">
              {/* Header Kartu Informasi Harga Pasar Real-time */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Update Harga Koperasi Hari Ini
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Airmadidi Pool
                </span>
              </div>

              {/* List Harga Komoditas Mini */}
              <div className="py-4 space-y-3">
                {/* Item 1: Kopra Putih */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-emerald-50/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-forest-700 font-bold flex items-center justify-center text-xs">
                      KP
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Kopra Putih Grade A</h4>
                      <p className="text-xs text-slate-400">Kadar air &lt; 6% • Likupang</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">
                      Rp 13.500<span className="text-xs font-normal text-slate-500">/kg</span>
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-600 flex items-center justify-end gap-0.5">
                      ▲ +4.2% hari ini
                    </p>
                  </div>
                </div>

                {/* Item 2: Jagung Pipil Super */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                      JP
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Jagung Pipil Kering</h4>
                      <p className="text-xs text-slate-400">Kadar air 14% • Kauditan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">
                      Rp 5.500<span className="text-xs font-normal text-slate-500">/kg</span>
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-600 flex items-center justify-end gap-0.5">
                      ▲ Stabil menguntungkan
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner Alsintan Siap Sewa */}
              <div className="mt-2 p-4 rounded-2xl bg-gradient-to-r from-forest-accent to-emerald-900 text-white relative overflow-hidden shadow-sm">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-semibold text-emerald-100 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 3 Unit Standby
                  </div>
                  <h5 className="text-sm font-bold">Traktor Quick G1000 &amp; Drone Pilot</h5>
                  <p className="text-xs text-emerald-100/90 mt-1">
                    Disubsidi untuk anggota resmi Koperasi Sinar Pagi Sejahtera.
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Mulai Rp 120.000/hari</span>
                    <button
                      id="hero-banner-booking-btn"
                      onClick={onBookingBanner}
                      className="text-xs font-semibold bg-white text-forest-accent px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                      type="button"
                    >
                      Booking →
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Feedback Badge */}
              <div className="absolute -bottom-5 -left-5 bg-white p-3.5 rounded-2xl shadow-lg border border-slate-200 hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">4.9 / 5.0 Rating Petani</p>
                  <p className="text-[11px] text-slate-500">Transparansi timbangan &amp; bayar kontan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
