'use client';

import React, { useState } from 'react';
import { LogIn, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenModal: (type: 'toko' | 'alsintan') => void;
  activeSection: string;
}

export default function Navbar({
  onOpenModal,
  activeSection,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (
    e: React.MouseEvent,
    target: 'beranda' | 'toko' | 'alsintan'
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (target === 'beranda') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onOpenModal(target);
    }
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo dan Nama Koperasi */}
        <a
          id="brand-logo-link"
          href="#"
          onClick={(e) => handleNavClick(e, 'beranda')}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-forest-accent flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            {/* Custom SVG Daun / Tunas identik */}
            <svg
              className="w-5 h-5 text-emerald-300"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12c0-3.21 1.516-6.066 3.864-7.886" />
              <path d="M12 12c2.5-3 5-3 8-3" />
              <path d="M12 12C9.5 9 7 9 4 9" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none mt-1">
              SINAR PAGI SEJAHTERA
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Minahasa Utara
            </p>
          </div>
        </a>

        {/* Menu Navigasi Utama Desktop */}
        <nav id="desktop-nav-menu" className="hidden md:flex items-center gap-2 text-sm font-medium">
          <button
            id="nav-beranda"
            onClick={(e) => handleNavClick(e, 'beranda')}
            className={`px-4 py-2 rounded-full font-semibold transition cursor-pointer ${
              activeSection === 'beranda'
                ? 'bg-forest-accent text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            type="button"
          >
            Beranda
          </button>
          <button
            id="nav-toko"
            onClick={(e) => handleNavClick(e, 'toko')}
            className={`px-4 py-2 rounded-full font-semibold transition cursor-pointer ${
              activeSection === 'toko'
                ? 'bg-forest-accent text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            type="button"
          >
            Toko Online
          </button>
          <button
            id="nav-sewa-alat"
            onClick={(e) => handleNavClick(e, 'alsintan')}
            className={`px-4 py-2 rounded-full font-semibold transition cursor-pointer ${
              activeSection === 'alsintan'
                ? 'bg-forest-accent text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            type="button"
          >
            Sewa Alat
          </button>
        </nav>

        {/* Right Utility (Tombol Masuk & Menu Mobile) */}
        <div className="flex items-center gap-3">
          {/* Tombol Masuk / Login */}
          <button
            id="login-btn"
            onClick={() => alert('Fitur Masuk / Login Anggota Koperasi & Petani sedang disiapkan.')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-forest-accent text-forest-accent hover:bg-forest-accent hover:text-white font-semibold text-xs transition cursor-pointer"
            type="button"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            id="mobile-menu-toggle"
            aria-label="Toggle Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition cursor-pointer"
            type="button"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 shadow-lg">
          <button
            onClick={(e) => handleNavClick(e, 'beranda')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 text-sm flex items-center justify-between"
            type="button"
          >
            <span>Beranda</span>
          </button>
          <button
            onClick={(e) => handleNavClick(e, 'toko')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 text-sm flex items-center justify-between"
            type="button"
          >
            <span>Toko Online Komoditas</span>
          </button>
          <button
            onClick={(e) => handleNavClick(e, 'alsintan')}
            className="w-full text-left px-4 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 text-sm flex items-center justify-between"
            type="button"
          >
            <span>Sewa Alsintan &amp; Traktor</span>
          </button>
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                alert('Fitur Masuk / Login Anggota Koperasi & Petani sedang disiapkan.');
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl font-semibold text-forest-accent bg-emerald-50 hover:bg-emerald-100 text-sm flex items-center justify-between cursor-pointer"
              type="button"
            >
              <span>Masuk / Login</span>
              <LogIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
