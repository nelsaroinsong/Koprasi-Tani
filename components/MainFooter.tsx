'use client';

import React from 'react';

interface MainFooterProps {
  onNavClick: (target: 'toko' | 'alsintan') => void;
}

export default function MainFooter({ onNavClick }: MainFooterProps) {
  return (
    <footer id="main-footer" className="bg-white border-t border-slate-200 text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Kolom Profil */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-forest-accent flex items-center justify-center text-white shadow-sm">
                <svg
                  className="w-4 h-4 text-emerald-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12c0-3.21 1.516-6.066 3.864-7.886" />
                  <path d="M12 12c2.5-3 5-3 8-3" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">SINAR PAGI SEJAHTERA</p>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Minahasa Utara</p>
              </div>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Ekosistem digital agribisnis kelapa &amp; jagung berkelanjutan. Membawa kesejahteraan bagi kelompok tani bumi Tonsea.
            </p>
          </div>

          {/* Kolom Navigasi Layanan */}
          <div>
            <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">
              Layanan Platform
            </p>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavClick('toko')}
                  className="hover:text-forest-accent transition cursor-pointer text-left"
                >
                  Toko Online Komoditas
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('alsintan')}
                  className="hover:text-forest-accent transition cursor-pointer text-left"
                >
                  Sewa Alsintan &amp; Drone
                </button>
              </li>
            </ul>
          </div>

          {/* Kolom Jam Operasional & Layanan Bantuan */}
          <div>
            <p className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">
              Pusat Bantuan Petani
            </p>
            <p className="text-slate-500 leading-relaxed mb-3">
              Layanan penimbangan panen dan sewa alat buka setiap Senin - Sabtu pukul 07.00 - 17.00 WITA.
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-forest-accent font-semibold text-[11px] border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hotline Petani Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-[11px]">
            © 2026 Koperasi Sinar Pagi Sejahtera — Ekosistem Digital Kelapa &amp; Jagung Berkelanjutan Minahasa Utara.
          </p>
          <div className="flex items-center gap-6 text-[11px]">
            <a href="#pusat-bantuan" onClick={(e) => { e.preventDefault(); alert('Hotline Call Center: 0812-4422-9011'); }} className="hover:text-forest-accent transition">
              Pusat Bantuan
            </a>
            <a href="#kebijakan" onClick={(e) => { e.preventDefault(); alert('Data petani Minahasa Utara dilindungi sesuai standar UU PDP Koperasi Indonesia.'); }} className="hover:text-forest-accent transition">
              Kebijakan Privasi
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
