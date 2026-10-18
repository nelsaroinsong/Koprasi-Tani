'use client';

import React, { useState, useEffect } from 'react';
import defaultSavedLogos from '@/data/partner-logos.json';

interface LogoItem {
  id?: string;
  key?: string;
  name: string;
  url: string;
}

export default function PartnerLogos() {
  const [logos, setLogos] = useState<LogoItem[]>(() => {
    if (Array.isArray(defaultSavedLogos) && defaultSavedLogos.length > 0) {
      return defaultSavedLogos as LogoItem[];
    }
    return [];
  });

  useEffect(() => {
    fetch('/api/storage/logos', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.logos) && data.logos.length > 0) {
          setLogos(data.logos);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section id="partner-logos-section" className="bg-[#f4f5f1] py-8 sm:py-12 border-b border-slate-200/60 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-5 sm:mb-6">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-slate-400">
            Didukung Oleh Instansi &amp; Lembaga Terpercaya
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-20">
          {logos.map((logo) => (
            <div
              key={logo.key || logo.name}
              className="flex items-center justify-center opacity-80 hover:opacity-100 transition-all duration-300 pointer-events-auto hover:scale-105"
              title={logo.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.url}
                alt={logo.name}
                className="h-7 sm:h-9 lg:h-10 max-w-[140px] sm:max-w-[190px] w-auto object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
