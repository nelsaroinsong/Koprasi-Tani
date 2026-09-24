'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Tractor, Receipt, Menu, X, ChevronRight, ShieldCheck, LogIn, User as UserIcon } from 'lucide-react';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { useAuth } from '@/context/auth-context';
import BottomNav from '@/components/BottomNav';

interface AppHeaderProps {
  activePage?: 'toko' | 'sewa-alat' | 'pesanan' | 'profile' | 'beranda';
}

export default function AppHeader({ activePage = 'toko' }: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-13 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Logo - Mengarah ke /toko saat login, atau ke / saat belum login */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link
            href={user ? '/toko' : '/'}
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

          {/* Desktop Navigation Links - Tanpa Beranda, Active BG Hijau */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            <Link
              href="/toko"
              className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                activePage === 'toko'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <ShoppingBag className={`w-3.5 h-3.5 ${activePage === 'toko' ? 'text-white' : 'text-slate-500'}`} />
              <span>Toko Online</span>
            </Link>
            <Link
              href="/sewa-alat"
              className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                activePage === 'sewa-alat'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Tractor className={`w-3.5 h-3.5 ${activePage === 'sewa-alat' ? 'text-white' : 'text-slate-500'}`} />
              <span>Sewa Alat</span>
            </Link>
            <Link
              href="/pesanan"
              className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                activePage === 'pesanan'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Receipt className={`w-3.5 h-3.5 ${activePage === 'pesanan' ? 'text-white' : 'text-slate-500'}`} />
              <span>Pesanan</span>
            </Link>
            <Link
              href={user ? '/profile' : '/login'}
              className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${
                activePage === 'profile'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <UserIcon className={`w-3.5 h-3.5 ${activePage === 'profile' ? 'text-white' : 'text-slate-500'}`} />
              <span>Profil</span>
            </Link>
          </nav>
        </div>

        {/* Right Section: Profile & Mobile Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <UserProfileDropdown />
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-full transition shadow-xs flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </Link>
          )}

          {/* Hamburger Menu Toggle on Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Pilih Layanan Koperasi"
            title="Menu Layanan"
            className={`md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition border cursor-pointer shadow-2xs ${
              mobileMenuOpen
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200'
            }`}
            type="button"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
            Pilih Layanan & Fitur
          </div>

          <Link
            href="/toko"
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition ${
              activePage === 'toko'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4" />
              <span>Toko Online Komoditas</span>
            </div>
            {activePage === 'toko' ? (
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">Aktif</span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            )}
          </Link>

          <Link
            href="/sewa-alat"
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition ${
              activePage === 'sewa-alat'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Tractor className="w-4 h-4" />
              <span>Sewa Alat Pertanian (Alsintan)</span>
            </div>
            {activePage === 'sewa-alat' ? (
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">Aktif</span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            )}
          </Link>

          <Link
            href="/pesanan"
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition ${
              activePage === 'pesanan'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Receipt className="w-4 h-4" />
              <span>Daftar & Status Pesanan</span>
            </div>
            {activePage === 'pesanan' ? (
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">Aktif</span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            )}
          </Link>

          <Link
            href={user ? '/profile' : '/login'}
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between transition ${
              activePage === 'profile'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserIcon className="w-4 h-4" />
              <span>Halaman Profil Akun</span>
            </div>
            {activePage === 'profile' ? (
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">Aktif</span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            )}
          </Link>

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/verifikasi"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-between text-amber-800 bg-amber-50 hover:bg-amber-100 transition border border-amber-200 mt-1"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Panel Verifikasi Admin</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </Link>
          )}

          {!user && (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk ke Akun</span>
            </Link>
          )}
        </div>
      )}
    </header>
    <BottomNav activePage={activePage} />
  </>
);
}
