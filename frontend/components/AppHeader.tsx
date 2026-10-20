'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  ShoppingCart,
  Tractor,
  Receipt,
  LogIn,
  User as UserIcon,
  LayoutDashboard,
} from 'lucide-react';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import NotificationDropdown from '@/components/NotificationDropdown';
import { useAuth } from '@/context/auth-context';
import BottomNav from '@/components/BottomNav';

interface AppHeaderProps {
  activePage?: 'toko' | 'sewa-alat' | 'pesanan' | 'dashboard' | 'profile' | 'beranda' | 'cart' | 'none';
}

export default function AppHeader({ activePage }: AppHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();


  // Deteksi halaman aktif secara otomatis berdasarkan pathname jika props tidak spesifik
  const currentActive = useMemo(() => {
    if (activePage === 'none') return 'none';
    if (pathname.startsWith('/toko/petani')) return 'none';
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
      <header className="sticky top-0 z-40 bg-white border-b border-[#dce1d6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 relative">
          {/* Left: Official Koperasi Full Logo (Matching Preloader & LandingHeader) */}
          <div className="flex items-center shrink-0 z-10">
            <Link
              href={user ? '/toko' : '/'}
              prefetch={true}
              className="flex items-center group focus:outline-none shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/koperasi-full-dark.png"
                alt="Logo Koperasi Sinar Pagi Sejahtera"
                className="h-6 sm:h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-102"
              />
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center justify-center gap-1 p-1 rounded-full bg-[#f4f5f1] border border-[#dce1d6] text-xs font-semibold absolute left-1/2 -translate-x-1/2">
            <Link
              href="/toko"
              prefetch={true}
              className={`px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                currentActive === 'toko'
                  ? 'bg-[#233414] text-white font-semibold'
                  : 'text-[#344d15] hover:text-[#1a2610] hover:bg-[#EAEDE7] font-medium'
              }`}
            >
              <ShoppingBag
                className={`w-3.5 h-3.5 ${
                  currentActive === 'toko' ? 'text-[#D4F63D]' : 'text-[#526046]'
                }`}
              />
              <span>Toko Online</span>
            </Link>

            <Link
              href="/sewa-alat"
              prefetch={true}
              className={`px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                currentActive === 'sewa-alat'
                  ? 'bg-[#233414] text-white font-semibold'
                  : 'text-[#344d15] hover:text-[#1a2610] hover:bg-[#EAEDE7] font-medium'
              }`}
            >
              <Tractor
                className={`w-3.5 h-3.5 ${
                  currentActive === 'sewa-alat' ? 'text-[#D4F63D]' : 'text-[#526046]'
                }`}
              />
              <span>Sewa Alat</span>
            </Link>

            <Link
              href="/pesanan"
              prefetch={true}
              className={`px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                currentActive === 'pesanan'
                  ? 'bg-[#233414] text-white font-semibold'
                  : 'text-[#344d15] hover:text-[#1a2610] hover:bg-[#EAEDE7] font-medium'
              }`}
            >
              <Receipt
                className={`w-3.5 h-3.5 ${
                  currentActive === 'pesanan' ? 'text-[#D4F63D]' : 'text-[#526046]'
                }`}
              />
              <span>Pesanan</span>
            </Link>

            {/* Khusus Role Petani: Fitur Dashboard Mandiri */}
            {user?.role === 'PETANI' && (
              <Link
                href="/dashboard"
                prefetch={true}
                className={`px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                  currentActive === 'dashboard'
                    ? 'bg-[#233414] text-white font-semibold'
                    : 'text-[#344d15] hover:text-[#1a2610] hover:bg-[#EAEDE7] font-medium'
                }`}
              >
                <LayoutDashboard
                  className={`w-3.5 h-3.5 ${
                    currentActive === 'dashboard' ? 'text-[#D4F63D]' : 'text-[#526046]'
                  }`}
                />
                <span>Dashboard</span>
              </Link>
            )}

            <Link
              href={user ? '/profile' : '/login'}
              prefetch={true}
              className={`px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                currentActive === 'profile'
                  ? 'bg-[#233414] text-white font-semibold'
                  : 'text-[#344d15] hover:text-[#1a2610] hover:bg-[#EAEDE7] font-medium'
              }`}
            >
              <UserIcon
                className={`w-3.5 h-3.5 ${
                  currentActive === 'profile' ? 'text-[#D4F63D]' : 'text-[#526046]'
                }`}
              />
              <span>Profil</span>
            </Link>
          </nav>

          {/* Right Section: Pencarian, Keranjang Belanja & Profil Dropdown */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            {!user && (
              <>
                <NotificationDropdown />
                <Link
                  href="/cart"
                  prefetch={true}
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
                    currentActive === 'cart'
                      ? 'bg-[#233414] text-[#D4F63D] border-[#233414]'
                      : 'bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#233414] border-[#d5dccf]'
                  }`}
                  title="Keranjang Belanja"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Link>
              </>
            )}

            {user ? (
              <UserProfileDropdown />
            ) : (
              <Link
                href="/login"
                className="text-xs font-semibold bg-[#233414] hover:bg-[#344d15] text-white px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#D4F63D]" />
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
