import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Menu, X, Home, ShoppingBag, Tractor, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import UserProfileDropdown from '@/components/UserProfileDropdown';

interface NavbarProps {
  onOpenModal: (type: 'toko' | 'alsintan') => void;
  activeSection: string;
}

export default function Navbar({
  onOpenModal,
  activeSection,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleNavClick = (
    e: React.MouseEvent,
    target: 'beranda' | 'toko' | 'alsintan'
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (target === 'beranda') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'toko') {
      router.push('/toko');
    } else if (target === 'alsintan') {
      router.push('/sewa-alat');
    }
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        {/* Brand Logo dan Nama Koperasi */}
        <a
          id="brand-logo-link"
          href="#"
          onClick={(e) => handleNavClick(e, 'beranda')}
          className="flex items-center gap-2 sm:gap-3 group focus:outline-none min-w-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-forest-accent flex items-center justify-center text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            {/* Custom SVG Daun / Tunas */}
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300"
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
          <div className="min-w-0">
            <h1 className="text-[11px] sm:text-sm font-bold tracking-tight text-slate-900 leading-tight">
              SINAR PAGI SEJAHTERA
            </h1>
            <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
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
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <UserProfileDropdown />
          ) : (
            <Link
              id="login-btn"
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full border border-forest-accent text-forest-accent hover:bg-forest-accent hover:text-white font-semibold text-xs transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </Link>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            id="mobile-menu-toggle"
            aria-label="Toggle Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition cursor-pointer"
            type="button"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-4 space-y-1.5 shadow-lg">
          <button
            onClick={(e) => handleNavClick(e, 'beranda')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition cursor-pointer ${
              activeSection === 'beranda'
                ? 'bg-forest-accent text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            type="button"
          >
            <span className="flex items-center gap-2.5">
              <Home className="w-4 h-4" />
              <span>Beranda</span>
            </span>
          </button>

          <button
            onClick={(e) => handleNavClick(e, 'toko')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition cursor-pointer ${
              activeSection === 'toko'
                ? 'bg-forest-accent text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            type="button"
          >
            <span className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4" />
              <span>Toko Online</span>
            </span>
          </button>

          <button
            onClick={(e) => handleNavClick(e, 'alsintan')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition cursor-pointer ${
              activeSection === 'alsintan'
                ? 'bg-forest-accent text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            type="button"
          >
            <span className="flex items-center gap-2.5">
              <Tractor className="w-4 h-4" />
              <span>Sewa Alat</span>
            </span>
          </button>

          <div className="pt-2 border-t border-slate-100">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-red-600 bg-red-50 hover:bg-red-100 text-sm flex items-center justify-between cursor-pointer transition"
                type="button"
              >
                <span className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4" />
                  <span>Keluar ({user.name})</span>
                </span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl font-semibold text-forest-accent bg-emerald-50 hover:bg-emerald-100 text-sm flex items-center justify-between cursor-pointer transition"
              >
                <span className="flex items-center gap-2.5">
                  <LogIn className="w-4 h-4" />
                  <span>Masuk / Login</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
