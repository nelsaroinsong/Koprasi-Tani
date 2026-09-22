'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface LogoItem {
  key: string;
  name: string;
  url: string;
}

interface HeroSectionProps {
  onJoinKoperasi?: () => void;
  onExploreToko?: () => void;
  onSewaAlsintan?: () => void;
  onBookingBanner?: () => void;
}

export default function HeroSection({
  onJoinKoperasi,
  onExploreToko,
}: HeroSectionProps) {
  const [logos, setLogos] = useState<LogoItem[]>([]);
  const [, setIsLoadingLogos] = useState(true);

  useEffect(() => {
    fetch('/api/storage/logos')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.logos && data.logos.length > 0) {
          setLogos(data.logos);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingLogos(false));
  }, []);

  const handleJoin =
    onJoinKoperasi ||
    onExploreToko ||
    (() => alert('Pendaftaran anggota Koperasi Sinar Pagi Sejahtera sedang dibuka.'));

  return (
    <section id="hero-section" className="relative pt-12 pb-6 lg:pt-16 lg:pb-8 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-forest-accent/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 sm:space-y-8">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] tracking-tight max-w-4xl mx-auto">
            Petani Berdaya, Hasil Panen{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-accent to-emerald-600">
              Naik Kelas
            </span>{' '}
            Menembus Pasar.
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-md lg:text-md text-slate-600 leading-relaxed max-w-3xl mx-auto font-normal">
            Satu ekosistem terpadu yang menaungi berbagai kelompok tani. Memfasilitasi jual beli komoditas unggulan panen kelapa &amp; jagung langsung, serta penyediaan sewa alat.
          </p>

          {/* Action Button CTA */}
          <div className="flex items-center justify-center pt-2">
            <button
              id="btn-join-koperasi"
              onClick={handleJoin}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-forest-accent text-white font-semibold text-base hover:bg-forest-800 transition-all duration-200 shadow-md shadow-forest-900/15 hover:shadow-lg hover:shadow-forest-900/25 active:scale-[0.98] cursor-pointer"
              type="button"
            >
              <span>Bergabung Bersama Koperasi</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Supported By Section */}
          <div className="pt-8 border-t border-slate-200/80 max-w-4xl mx-auto">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3">
              Didukung oleh
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {logos.length > 0 ? (
                logos.map((logo) => (
                  <div
                    key={logo.key}
                    className="flex items-center justify-center px-4 py-2 bg-white/90 rounded-xl border border-slate-200/70 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.url}
                      alt={logo.name}
                      className="h-6 sm:h-7 w-auto object-contain max-w-[105px] transition-all duration-200"
                      title={logo.name}
                    />
                  </div>
                ))
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-semibold text-slate-600">
                  <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-forest-accent" />
                    Kementerian Pertanian RI
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-forest-accent" />
                    Dinas Pertanian Minut
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-forest-accent" />
                    Bank Mitra KUR Tani
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-forest-accent" />
                    Gabungan Kelompok Tani (Gapoktan)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
