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
            Satu ekosistem terpadu yang menaungi berbagai kelompok tani. Memfasilitasi jual beli komoditas unggulan panen kelapa &amp; jagung langsung, serta penyediaan sewa alat.
          </p>

          {/* Action Button CTA */}
          <div className="flex items-center justify-center pt-2">
            <Link
              id="btn-join-koperasi"
              href="/login"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-forest-accent text-white font-semibold text-base hover:bg-forest-800 transition-all duration-200 shadow-md shadow-forest-900/15 hover:shadow-lg hover:shadow-forest-900/25 active:scale-[0.98] cursor-pointer"
            >
              <span>Bergabung Bersama Koperasi</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Supported By Section */}
          <div className="pt-8 border-t border-slate-200/80 max-w-4xl mx-auto">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Didukung oleh
            </p>

            {/* Infinite Auto-Scrolling Logo Carousel with Edge Fade */}
            <div className="relative w-full max-w-xl mx-auto overflow-hidden py-3 select-none [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]">
              {/* Fade Overlay kiri & kanan untuk kompatibilitas browser */}
              <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-[#fafbf9] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-[#fafbf9] to-transparent z-10 pointer-events-none" />

              <div className="animate-marquee-infinite items-center gap-12 sm:gap-16">
                {repeatedLogos.map((logo, idx) => {
                  const isPolimdo = logo.key.toLowerCase().includes('polimdo');
                  return (
                    <div
                      key={`${logo.key}-${idx}`}
                      className="flex items-center justify-center shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo.url}
                        alt={logo.name}
                        className={`${
                          isPolimdo
                            ? 'h-14 sm:h-16 max-w-[155px] sm:max-w-[185px]'
                            : 'h-10 sm:h-12 max-w-[145px] sm:max-w-[175px]'
                        } w-auto object-contain opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-300`}
                        title={logo.name}
                        loading="eager"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
