'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  Store,
  Tractor,
  Receipt,
  User as UserIcon,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface BottomNavProps {
  activePage?: 'toko' | 'sewa-alat' | 'pesanan' | 'dashboard' | 'profile' | 'beranda' | 'cart' | 'none';
}

export default function BottomNav({ activePage }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isPetani = user?.role === 'PETANI';

  // Optimistic tab state for instantaneous sliding background response
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);

  // Pre-warm router cache for all main tabs in background
  useEffect(() => {
    const routes = ['/toko', '/sewa-alat', '/pesanan', '/profile'];
    if (isPetani) {
      routes.push('/dashboard');
    }
    const timer = setTimeout(() => {
      routes.forEach((r) => {
        try {
          router.prefetch(r);
        } catch {}
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [router, isPetani]);

  const isToko =
    activePage === 'none' || pathname.startsWith('/toko/petani')
      ? false
      : activePage
      ? activePage === 'toko'
      : pathname.startsWith('/toko') && !pathname.startsWith('/toko/mengikuti');
  const isSewaAlat = activePage
    ? activePage === 'sewa-alat'
    : pathname.startsWith('/sewa-alat');
  const isPesanan = activePage
    ? activePage === 'pesanan'
    : pathname.startsWith('/pesanan');
  const isDashboard = activePage
    ? activePage === 'dashboard'
    : pathname.startsWith('/dashboard');
  const isProfile = activePage
    ? activePage === 'profile'
    : pathname.startsWith('/profile') || pathname.startsWith('/profil');

  // Compute canonical active key based on props and pathname
  const canonicalActiveKey = isToko
    ? 'toko'
    : isSewaAlat
    ? 'sewa-alat'
    : isPesanan
    ? 'pesanan'
    : isDashboard
    ? 'dashboard'
    : isProfile
    ? 'profile'
    : null;

  // Active key is optimistic if user just clicked, otherwise follows canonical
  const activeKey = optimisticTab || canonicalActiveKey;

  // Sync optimistic tab whenever pathname or activePage prop changes
  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname, activePage]);

  const navItems = [
    {
      key: 'toko',
      label: 'Toko',
      href: '/toko',
      icon: Store,
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
    ...(isPetani
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
      href: user ? '/profile' : `/login?callbackUrl=${encodeURIComponent(pathname)}`,
      icon: UserIcon,
    },
  ];

  if (activePage === 'none') {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi Bawah Layanan Koperasi"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#dce1d6] lg:hidden pb-[env(safe-area-inset-bottom,0px)] shadow-xs"
    >
      <LayoutGroup id="mobileBottomNav">
        <div className="max-w-md mx-auto flex items-center justify-around h-14 sm:h-15 px-2 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = activeKey === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={true}
                onClick={() => setOptimisticTab(item.key)}
                className="relative focus:outline-none flex items-center justify-center py-1"
                aria-label={item.label}
                title={item.label}
              >
                {/* Sliding Active Pill Background (Animasi pindah background antar-tab) */}
                {isItemActive && (
                  <motion.div
                    layoutId="activeBottomNavPill"
                    className="absolute inset-0 bg-[#1a2610] rounded-full shadow-sm -z-0"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}

                <motion.div
                  layout
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                  }}
                  className={`relative z-10 h-10 rounded-full flex items-center justify-center select-none cursor-pointer transition-colors duration-200 ${
                    isItemActive
                      ? 'text-white px-3.5 sm:px-4 gap-2'
                      : 'w-10 h-10 text-[#526046] hover:text-[#1a2610]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isItemActive
                        ? 'text-white stroke-[2.2]'
                        : 'text-[#526046] stroke-[1.8]'
                    }`}
                  />
                  <AnimatePresence initial={false}>
                    {isItemActive && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{
                          opacity: { duration: 0.16 },
                          width: { duration: 0.22, ease: 'easeOut' },
                        }}
                        className="text-xs font-bold text-white whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
