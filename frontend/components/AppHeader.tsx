'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, ShoppingCart, Tractor, Receipt, LogIn, User as UserIcon, LayoutDashboard } from 'lucide-react';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { useAuth } from '@/context/auth-context';
import BottomNav from '@/components/BottomNav';

interface AppHeaderProps {
  activePage?: 'toko' | 'sewa-alat' | 'pesanan' | 'dashboard' | 'profile' | 'beranda' | 'cart';
}

export default function AppHeader({ activePage }: AppHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Deteksi halaman aktif secara otomatis berdasarkan pathname jika props tidak spesifik
  const currentActive = useMemo(() => {
    if (activePage && activePage !== 'beranda') return activePage;
    if (pathname === '/cart' || pathname.startsWith('/cart')) return 'cart';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/pesanan')) return 'pesanan';
    if (pathname.startsWith('/profile') || pathname.startsWith('/profil')) return 'profile';
    if (pathname.startsWith('/sewa-alat')) return 'sewa-alat';
    if (pathname.startsWith('/toko') && !pathname.startsWith('/toko/mengikuti')) return 'toko';
    if (pathname === '/') return 'beranda';
    return activePage;
  }, [activePage, pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-13 sm:h-16 flex items-center justify-between gap-4 relative">
        {/* Left: Brand Logo - Mengarah ke /toko saat login, atau ke / saat belum login */}
        <div className="flex items-center shrink-0 z-10">
          <Link
            href={user ? '/toko' : '/'}
            prefetch={true}
            className="flex items-center gap-1.5 sm:gap-2.5 group focus:outline-none shrink-0"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-sm font-bold text-slate-900 leading-tight truncate">
                Sinar Pagi Sejahtera
              </div>
              <div className="text-[8px] sm:text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Minahasa Utara
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links (Posisi Center di Layar Lebar) */}
        <nav className="hidden lg:flex items-center justify-center gap-1.5 text-xs font-semibold absolute left-1/2 -translate-x-1/2">
          <Link
            href="/toko"
            prefetch={true}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              currentActive === 'toko'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
            }`}
          >
            <ShoppingBag className={`w-3.5 h-3.5 ${currentActive === 'toko' ? 'text-white' : 'text-slate-500'}`} />
            <span>Toko Online</span>
          </Link>
          <Link
            href="/sewa-alat"
            prefetch={true}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              currentActive === 'sewa-alat'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
            }`}
          >
            <Tractor className={`w-3.5 h-3.5 ${currentActive === 'sewa-alat' ? 'text-white' : 'text-slate-500'}`} />
            <span>Sewa Alat</span>
          </Link>
          <Link
            href="/pesanan"
            prefetch={true}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              currentActive === 'pesanan'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
            }`}
          >
            <Receipt className={`w-3.5 h-3.5 ${currentActive === 'pesanan' ? 'text-white' : 'text-slate-500'}`} />
            <span>Pesanan</span>
          </Link>

          {/* Khusus Role Petani: Fitur Dashboard Mandiri di antara Pesanan dan Profil */}
          {user?.role === 'PETANI' && (
            <Link
              href="/dashboard"
              prefetch={true}
              className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                currentActive === 'dashboard'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 ${currentActive === 'dashboard' ? 'text-white' : 'text-slate-500'}`} />
              <span>Dashboard</span>
            </Link>
          )}

          <Link
            href={user ? '/profile' : '/login'}
            prefetch={true}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              currentActive === 'profile'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
            }`}
          >
            <UserIcon className={`w-3.5 h-3.5 ${currentActive === 'profile' ? 'text-white' : 'text-slate-500'}`} />
            <span>Profil</span>
          </Link>
        </nav>

        {/* Right Section: Keranjang Belanja & Profil Dropdown (Desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
          {!user && (
            <Link
              href="/cart"
              prefetch={true}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border cursor-pointer shadow-2xs group ${
                currentActive === 'cart'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200'
              }`}
              title="Keranjang Belanja"
            >
              <ShoppingCart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform ${currentActive === 'cart' ? 'text-white' : ''}`} />
            </Link>
          )}

          {user ? (
            <UserProfileDropdown />
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 sm:px-4 py-1.5 rounded-full transition shadow-xs flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </Link>
          )}
        </div>
      </div>
    </header>
    <BottomNav activePage={currentActive} />
  </>
);
}
