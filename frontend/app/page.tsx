'use client';

import React, { useState } from 'react';
import LandingHero from '@/components/landing/LandingHero';
import PartnerLogos from '@/components/landing/PartnerLogos';
import AboutUsBento from '@/components/landing/AboutUsBento';
import MainFooter from '@/components/MainFooter';
import WeightSweepPreloader from '@/components/ui/weight-sweep-preloader';

export default function Home() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [isHeroReady, setIsHeroReady] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-slate-900 flex flex-col selection:bg-[#D4F63D] selection:text-slate-950 font-sans">
      {/* Variable Font Weight Sweep Preloader saat buka beranda */}
      {showPreloader && (
        <WeightSweepPreloader
          fixed
          durationMs={2200}
          preset="paper"
          label="Koperasi Sinar Pagi Sejahtera"
          caption="Memuat Ekosistem Pertanian"
          message="Dari Minahasa Utara untuk Nusantara."
          onReveal={() => setIsHeroReady(true)}
          onComplete={() => setShowPreloader(false)}
        />
      )}

      <main className="flex-1">
        {/* 1. Hero Section with Navbar included inside the rounded card */}
        <div className="p-2 sm:p-4 lg:p-5">
          <LandingHero isReady={isHeroReady} />
        </div>

        {/* 2. Partner Logos (ICARE, Polimdo, Pemkab Minut, Balai Besar Modernisasi Pertanian) */}
        <PartnerLogos />

        {/* 3. About Us / Why Choose Sustainable Solutions Bento Grid */}
        <AboutUsBento />
      </main>

      {/* 5. Minimalist Footer */}
      <MainFooter />
    </div>
  );
}
