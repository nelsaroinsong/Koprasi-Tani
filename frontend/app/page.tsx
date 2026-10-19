'use client';

import React from 'react';
import LandingHero from '@/components/landing/LandingHero';
import PartnerLogos from '@/components/landing/PartnerLogos';
import AboutUsBento from '@/components/landing/AboutUsBento';
import MainFooter from '@/components/MainFooter';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f5f1] text-slate-900 flex flex-col selection:bg-[#D4F63D] selection:text-slate-950 font-sans">
      <main className="flex-1">
        {/* 1. Hero Section with Navbar included inside the rounded card */}
        <div className="p-2 sm:p-4 lg:p-5">
          <LandingHero />
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
