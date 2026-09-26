'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface LogoItem {
  key: string;
  name: string;
  url: string;
}

const DEFAULT_LOGOS: LogoItem[] = [
  {
    key: 'logo/logo-icare.webp',
    name: 'ICARE',
    url: '/api/storage/logo/logo-icare.webp',
  },
  {
    key: 'logo/logo polimdo.png',
    name: 'POLIMDO',
    url: '/api/storage/logo/logo polimdo.png',
  },
];

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
  const [logos, setLogos] = useState<LogoItem[]>(DEFAULT_LOGOS);
  const [, setIsLoadingLogos] = useState(true);

  useEffect(() => {
    fetch('/api/storage/logos')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.logos && data.logos.length > 0) {
          // Pastikan logo iCare selalu berada di sebelah kiri (indeks pertama)
          const sorted = [...data.logos].sort((a: LogoItem, b: LogoItem) => {
            const aIsIcare = a.key.toLowerCase().includes('icare');
            const bIsIcare = b.key.toLowerCase().includes('icare');
            if (aIsIcare && !bIsIcare) return -1;
            if (!aIsIcare && bIsIcare) return 1;
            return a.name.localeCompare(b.name);
          });
          setLogos(sorted);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingLogos(false));
  }, []);

  // Gandakan daftar logo agar animasi looping infinite scroll berjalan mulus tanpa jeda
  const repeatedLogos = logos.length > 0 ? [...logos, ...logos, ...logos, ...logos] : [];

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
            Satu ekosistem terpadu yang memberdayakan para petani lokal. Memfasilitasi jual beli komoditas unggulan panen kelapa &amp; jagung langsung, serta penyediaan sewa alat.
          </p>

          {/* Action Button CTA */}
          <div className="flex items-center justify-center pt-2">
            <Link
              id="btn-join-koperasi"
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-xl bg-forest-accent hover:bg-forest-800 text-white font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
            >
              <span>Bergabung Bersama Koperasi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Supported By Section: Static Centered Logo Row (Tanpa Gerak & Selalu Abu-abu Tanpa Hover) */}
          {logos.length > 0 && (
            <div className="pt-12 sm:pt-16 border-t border-slate-200/80 max-w-4xl mx-auto text-center">
              <p className="font-[family-name:var(--font-inter),sans-serif] text-base sm:text-lg text-slate-500 font-normal tracking-[-0.03em] mb-6 sm:mb-8">
                Didukung Oleh
              </p>

              {/* Baris Logo Statis di Tengah (Selalu Abu-abu / Grayscale & Tanpa Hover) */}
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-16">
                {logos.map((logo) => {
                  const isPolimdo = (logo.key || logo.name || '').toLowerCase().includes('polimdo');
                  return (
                    <div
                      key={logo.key || logo.name}
                      className="flex items-center justify-center shrink-0 grayscale opacity-60 pointer-events-none select-none transition-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo.url}
                        alt={logo.name}
                        className={`${
                          isPolimdo
                            ? 'h-11 sm:h-13 max-w-[150px] sm:max-w-[180px]'
                            : 'h-8 sm:h-10 max-w-[130px] sm:max-w-[160px]'
                        } w-auto object-contain filter grayscale`}
                        loading="eager"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
