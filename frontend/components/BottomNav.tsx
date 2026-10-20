'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
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
  const { user } = useAuth();
  const isPetani = user?.role === 'PETANI';

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

  const navItems = [
    {
      key: 'toko',
      label: 'Toko',
      href: '/toko',
      icon: Store,
      isActive: isToko,
    },
    {
      key: 'sewa-alat',
      label: 'Sewa Alat',
      href: '/sewa-alat',
      icon: Tractor,
      isActive: isSewaAlat,
    },
    {
      key: 'pesanan',
      label: 'Pesanan',
      href: '/pesanan',
      icon: Receipt,
      isActive: isPesanan,
    },
    ...(isPetani
      ? [
          {
            key: 'dashboard',
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
            isActive: isDashboard,
          },
        ]
      : []),
    {
      key: 'profile',
      label: 'Profil',
      href: user ? '/profile' : `/login?callbackUrl=${encodeURIComponent(pathname)}`,
      icon: UserIcon,
      isActive: isProfile,
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
      <div className="max-w-md mx-auto flex items-center justify-around h-14 sm:h-15 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={true}
              className="focus:outline-none flex items-center justify-center py-1"
              aria-label={item.label}
              title={item.label}
            >
              <motion.div
                layout
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 35,
                }}
                className={`h-10 rounded-full flex items-center justify-center select-none cursor-pointer ${
                  item.isActive
                    ? 'bg-[#1a2610] text-white px-3.5 sm:px-4 shadow-sm gap-2'
                    : 'w-10 h-10 text-[#526046] hover:text-[#1a2610] hover:bg-[#EAEDE7]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    item.isActive
                      ? 'text-white stroke-[2.2]'
                      : 'text-[#526046] stroke-[1.8]'
                  }`}
                />
                <AnimatePresence initial={false}>
                  {item.isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{
                        opacity: { duration: 0.18 },
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
    </nav>
  );
}
