'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, LayoutGroup } from 'motion/react';
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
  const router = useRouter();
  const { user } = useAuth();

  // Optimistic tab state for instantaneous sliding background response on desktop
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);

  // Sync optimistic tab whenever pathname or activePage prop changes
  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname, activePage]);

  // Pre-warm router cache for all core pages in the background
  useEffect(() => {
    const routes = ['/toko', '/sewa-alat', '/pesanan', '/profile'];
    if (user?.role === 'PETANI') {
      routes.push('/dashboard');
    }
    const timer = setTimeout(() => {
      routes.forEach((r) => {
        try {
          router.prefetch(r);
        } catch {}
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [router, user?.role]);

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

  const activeDesktopTab = optimisticTab || currentActive;

  const desktopNavItems = useMemo(
    () => [
      {
        key: 'toko',
        label: 'Toko Online',
        href: '/toko',
        icon: ShoppingBag,
      },
      {
        key: 'sewa-alat',
        label: 'Sewa Alat',
        href: '/sewa-alat',
        icon: Tractor,
      },
      {
        key: 'pesanan',
        label: 'Pesanan',
        href: '/pesanan',
        icon: Receipt,
      },
      ...(user?.role === 'PETANI'
        ? [
            {
              key: 'dashboard',
              label: 'Dashboard',
              href: '/dashboard',
              icon: LayoutDashboard,
            },
          ]
        : []),
      {
        key: 'profile',
        label: 'Profil',
        href: user ? '/profile' : '/login',
        icon: UserIcon,
      },
    ],
    [user?.role, Boolean(user)]
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#dce1d6] shadow-2xs">
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

          {/* Center: Desktop Navigation Links with Smooth Sliding Active Pill */}
          <LayoutGroup id="desktopHeaderNav">
            <nav
              aria-label="Navigasi Utama Desktop"
              className="hidden lg:flex items-center justify-center gap-1 p-1 rounded-full bg-[#f4f5f1] border border-[#dce1d6] text-xs font-semibold absolute left-1/2 -translate-x-1/2"
            >
              {desktopNavItems.map((item) => {
                const isItemActive = activeDesktopTab === item.key;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setOptimisticTab(item.key)}
                    className={`group relative px-3.5 py-1.5 rounded-full flex items-center gap-1.5 select-none cursor-pointer focus:outline-none transition-colors duration-200 ${
                      !isItemActive ? 'hover:bg-[#EAEDE7]/70' : ''
                    }`}
                    aria-label={item.label}
                    title={item.label}
                  >
                    {/* Animated Sliding Pill Background (Smooth spring transition to active tab) */}
                    {isItemActive && (
                      <motion.div
                        layoutId="activeDesktopNavPill"
                        className="absolute inset-0 bg-[#233414] rounded-full shadow-xs -z-0"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 35,
                        }}
                      />
                    )}

                    <span className="relative z-10 flex items-center gap-1.5 font-medium">
                      <Icon
                        className={`w-3.5 h-3.5 transition-colors duration-200 shrink-0 ${
                          isItemActive
                            ? 'text-[#D4F63D] stroke-[2.2]'
                            : 'text-[#526046] group-hover:text-[#1a2610] stroke-[1.8]'
                        }`}
                      />
                      <span
                        className={`transition-colors duration-200 whitespace-nowrap ${
                          isItemActive
                            ? 'text-white font-semibold'
                            : 'text-[#344d15] group-hover:text-[#1a2610]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </LayoutGroup>

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
      {/* Spacer placeholder to reserve exact height for fixed header (56px mobile, 64px desktop) */}
      <div className="h-14 sm:h-16 shrink-0 pointer-events-none" aria-hidden="true" />
      <BottomNav activePage={currentActive} />
    </>
  );
}
