'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ArrowRight, Download, Menu, X } from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '@/context/auth-context';
import { useSmoothScroll } from '@/components/providers/smooth-scroll-provider';
import { canOfferInstall, startInstall, useInstallState } from '@/lib/pwa-install';

export default function LandingHeader() {
  const { user } = useAuth();
  const { scrollTo } = useSmoothScroll();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // GSAP Entrance animation when menu opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      document.body.style.overflow = 'hidden';

      const tl = gsap.timeline({
        onComplete: () => {
          isAnimatingRef.current = false;
        },
      });

      // 1. Menu container slides down smoothly from top
      tl.fromTo(
        menuRef.current,
        { yPercent: -100 },
        { yPercent: 0, duration: 0.45, ease: 'power3.out' }
      );

      // 2. Stagger animate numbered navigation items
      if (itemsRef.current) {
        tl.fromTo(
          itemsRef.current.children,
          { y: 35, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.35, ease: 'power2.out' },
          '-=0.18'
        );
      }

      // 3. Fade in bottom section (divider, columns, action button)
      if (bottomRef.current) {
        tl.fromTo(
          bottomRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' },
          '-=0.2'
        );
      }
    }
  }, [isOpen]);

  const handleOpenMenu = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setIsOpen(true);
  };

  const handleCloseMenu = (callback?: () => void) => {
    if (!menuRef.current || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(false);
        isAnimatingRef.current = false;
        document.body.style.overflow = '';
        if (callback) callback();
      },
    });

    // 1. Stagger exit nav items
    if (itemsRef.current) {
      tl.to(itemsRef.current.children, {
        y: -15,
        opacity: 0,
        stagger: 0.03,
        duration: 0.2,
        ease: 'power2.in',
      });
    }

    // 2. Fade exit bottom section
    if (bottomRef.current) {
      tl.to(
        bottomRef.current,
        {
          opacity: 0,
          y: 15,
          duration: 0.2,
          ease: 'power2.in',
        },
        '-=0.15'
      );
    }

    // 3. Slide menu container up smoothly
    tl.to(
      menuRef.current,
      {
        yPercent: -100,
        duration: 0.4,
        ease: 'power3.inOut',
      },
      '-=0.1'
    );
  };

  // Pasang aplikasi (PWA) dari menu: dialog instal harus dipanggil langsung saat diklik (Android),
  // lalu menu ditutup; di iPhone banner petunjuk akan muncul setelah menu tertutup.
  const installState = useInstallState();
  const showInstallItem = canOfferInstall(installState);
  const handleInstallFromMenu = () => {
    void startInstall();
    handleCloseMenu();
  };

  const navigateTo = (href: string) => {
    if (href.startsWith('#')) {
      handleCloseMenu(() => {
        scrollTo(href, { offset: -30, duration: 1.4 });
      });
    } else {
      handleCloseMenu(() => {
        router.push(href);
      });
    }
  };

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
                src="/api/images/landing/koperasi-full-dark.png"
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
            onClick={handleOpenMenu}
            className="md:hidden p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Full-screen Mobile Menu rendered via Portal into document.body to ensure it appears in FRONT of everything */}
      {isMounted && isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed inset-0 z-[99999] bg-[#233414] text-white flex flex-col justify-between p-6 sm:p-8 overflow-y-auto font-sans"
          style={{ willChange: 'transform' }}
        >
          {/* Top Bar: Brand Logo + Simple X Close Button as requested */}
          <div className="flex items-center justify-between pb-6 sm:pb-8">
            <button
              onClick={() => navigateTo('/')}
              className="flex items-center focus:outline-none cursor-pointer text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/images/landing/koperasi-full-white.png"
                alt="Logo Koperasi Sinar Pagi Sejahtera"
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </button>

            {/* Close Button: Simple X Icon Button as requested */}
            <button
              onClick={() => handleCloseMenu()}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
              aria-label="Tutup menu"
            >
              <X className="w-6 h-6 stroke-[2.2]" />
            </button>
          </div>

          {/* Main Navigation Links: 01-04 + 05 Pasang Aplikasi (bila perangkat mendukung) */}
          <div
            ref={itemsRef}
            className="my-auto py-4 sm:py-6 space-y-6 sm:space-y-8"
          >
            <div>
              <button
                onClick={() => navigateTo('/')}
                className="group flex items-baseline gap-4 sm:gap-5 py-1 focus:outline-none cursor-pointer text-left w-full"
              >
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-white/50 group-hover:text-white">
                  01
                </span>
                <span className="text-3xl sm:text-[40px] font-normal tracking-tight text-white group-hover:text-[#D4F63D] group-hover:translate-x-1.5 transition-all duration-200">
                  Beranda
                </span>
              </button>
            </div>

            <div>
              <button
                onClick={() => navigateTo('/toko')}
                className="group flex items-baseline gap-4 sm:gap-5 py-1 focus:outline-none cursor-pointer text-left w-full"
              >
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-white/50 group-hover:text-white">
                  02
                </span>
                <span className="text-3xl sm:text-[40px] font-normal tracking-tight text-white group-hover:text-[#D4F63D] group-hover:translate-x-1.5 transition-all duration-200">
                  Toko Online
                </span>
              </button>
            </div>

            <div>
              <button
                onClick={() => navigateTo('/sewa-alat')}
                className="group flex items-baseline gap-4 sm:gap-5 py-1 focus:outline-none cursor-pointer text-left w-full"
              >
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-white/50 group-hover:text-white">
                  03
                </span>
                <span className="text-3xl sm:text-[40px] font-normal tracking-tight text-white group-hover:text-[#D4F63D] group-hover:translate-x-1.5 transition-all duration-200">
                  Sewa Alat
                </span>
              </button>
            </div>

            <div>
              <button
                onClick={() => navigateTo('#tentang-kami')}
                className="group flex items-baseline gap-4 sm:gap-5 py-1 focus:outline-none cursor-pointer text-left w-full"
              >
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-white/50 group-hover:text-white">
                  04
                </span>
                <span className="text-3xl sm:text-[40px] font-normal tracking-tight text-white group-hover:text-[#D4F63D] group-hover:translate-x-1.5 transition-all duration-200">
                  Tentang Kami
                </span>
              </button>
            </div>

            {showInstallItem && (
              <div>
                <button
                  onClick={handleInstallFromMenu}
                  className="group flex items-baseline gap-4 sm:gap-5 py-1 focus:outline-none cursor-pointer text-left w-full"
                >
                  <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-white/50 group-hover:text-white">
                    05
                  </span>
                  <span className="flex items-center gap-3 text-3xl sm:text-[40px] font-normal tracking-tight text-[#D4F63D] group-hover:translate-x-1.5 transition-all duration-200">
                    Pasang Aplikasi
                    <Download className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Section: Full-width Action Button (Secondary links section removed as requested) */}
          <div ref={bottomRef} className="pt-4 sm:pt-6">
            <button
              onClick={() => navigateTo(user ? '/toko' : '/login')}
              className="w-full py-4 px-6 rounded-xl bg-white hover:bg-[#D4F63D] text-slate-950 font-sans text-[15px] sm:text-base font-medium tracking-tight leading-none flex items-center justify-center gap-2 active:scale-[0.99] transition-all duration-200 cursor-pointer shadow-xl"
            >
              <span>{user ? 'Dashboard Toko' : 'Masuk / Gabung'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
