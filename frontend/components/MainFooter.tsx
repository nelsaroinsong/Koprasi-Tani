'use client';

import React from 'react';
import { Globe } from 'lucide-react';

interface MainFooterProps {
  onNavClick?: (target: 'toko' | 'alsintan') => void;
}

export default function MainFooter({}: MainFooterProps) {
  return (
    <footer id="main-footer" className="w-full bg-white text-slate-900 border-t border-slate-200/80 py-8 sm:py-10 font-sans">
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
