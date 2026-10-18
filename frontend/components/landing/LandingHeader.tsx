'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useSmoothScroll } from '@/components/providers/smooth-scroll-provider';

export default function LandingHeader() {
  const { user } = useAuth();
  const { scrollTo } = useSmoothScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="w-full pt-4 sm:pt-6 px-3 sm:px-6 relative z-40">
      <div className="max-w-6xl mx-auto">
        {/* Floating White Navbar with corner radius matching hero section */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 shadow-lg shadow-black/5 border border-slate-200/80 flex items-center justify-between transition-all duration-300">
          
          {/* Left: Brand Logo + Divider + Left-aligned Nav Links (Matches Image 3) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="flex items-center group focus:outline-none shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/koperasi-full-dark.png"
                alt="Logo Koperasi Sinar Pagi Sejahtera"
                className="h-6 sm:h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-102"
              />
            </Link>

            {/* Small vertical divider line between logo and nav links */}
            <div className="h-4 w-px bg-slate-300 mx-1 sm:mx-2 hidden md:block" />

            {/* Nav Links aligned to the LEFT */}
            <nav className="hidden md:flex items-center gap-0.5 sm:gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              >
                Beranda
              </Link>

              <Link
                href="/toko"
                className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              >
                Toko Online
              </Link>

              <Link
                href="/sewa-alat"
                className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              >
                Sewa Alat
              </Link>

              <a
                href="#tentang-kami"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo('#tentang-kami', { offset: -30, duration: 1.4 });
                }}
                className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tentang Kami
              </a>
            </nav>
          </div>

          {/* Right: Pill Button (Style matches 'Get Template ->' in reference) */}
          <div className="hidden md:flex items-center">
            {user ? (
              <Link
                href="/toko"
                className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border border-slate-300 hover:border-slate-800 text-slate-800 hover:text-slate-950 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer bg-white"
              >
                <span>Dashboard Toko</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border border-slate-300 hover:border-slate-800 text-slate-800 hover:text-slate-950 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer bg-white"
              >
                <span>Masuk / Gabung</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Slide-down Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 bg-white rounded-2xl p-4 shadow-xl border border-slate-200 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Beranda
            </Link>
            <Link
              href="/toko"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Toko Online
            </Link>
            <Link
              href="/sewa-alat"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Sewa Alat
            </Link>
            <a
              href="#tentang-kami"
              onClick={(e) => {
                e.preventDefault();
                setIsMobileMenuOpen(false);
                scrollTo('#tentang-kami', { offset: -30, duration: 1.4 });
              }}
              className="block py-2 px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              Tentang Kami
            </a>
            <div className="pt-2 border-t border-slate-100">
              <Link
                href={user ? '/toko' : '/login'}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-full bg-slate-900 text-white font-semibold text-xs tracking-wide text-center flex items-center justify-center gap-2 shadow-md"
              >
                <span>{user ? 'Masuk ke Toko' : 'Masuk / Gabung'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
