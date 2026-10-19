'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
      label: 'Toko Online',
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

  return (
    <nav
      aria-label="Navigasi Bawah Layanan Koperasi"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#dce1d6] lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div
        className={`max-w-md mx-auto grid ${
          isPetani ? 'grid-cols-5' : 'grid-cols-4'
        } h-15 sm:h-16 items-center px-1.5 sm:px-2`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={true}
              className="focus:outline-none flex items-center justify-center p-1"
              aria-label={item.label}
            >
              <div
                className={`flex flex-col items-center justify-center gap-0.5 w-full py-1.5 px-1 rounded-xl transition-colors duration-150 ${
                  item.isActive
                    ? 'bg-[#233414] text-white font-semibold'
                    : 'text-[#526046] hover:text-[#1a2610] bg-transparent font-medium hover:bg-[#f4f5f1]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    item.isActive
                      ? 'text-[#D4F63D] stroke-[2.2]'
                      : 'text-[#526046] stroke-[1.8]'
                  }`}
                />
                <span
                  className={`text-[11px] tracking-tight truncate max-w-full leading-tight ${
                    item.isActive ? 'text-white font-semibold' : 'text-[#526046]'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
