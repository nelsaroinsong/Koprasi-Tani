'use client';

import React, { useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface MainFooterProps {
  onNavClick?: (target: 'toko' | 'alsintan') => void;
}

export default function MainFooter({}: MainFooterProps) {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        footerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 95%',
            once: true,
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      id="main-footer"
      className="w-full bg-[#f4f5f1] text-slate-900 border-t border-slate-200/60 py-8 sm:py-10 font-sans will-change-transform"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-4">
        {/* Baris 1: Lokasi di Kiri & Nama Brand Koperasi di Kanan */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800">
            <Globe className="w-4 h-4 text-slate-600 shrink-0" />
            <span>Indonesia</span>
          </div>
        </div>

        {/* Baris 2: Legalitas & Hak Cipta */}
        <div className="text-xs text-slate-500 font-normal">
          2026 Koperasi Sinar Pagi Sejahtera Minahasa Utara, Sulawesi Utara, Indonesia
        </div>
      </div>
    </footer>
  );
}
