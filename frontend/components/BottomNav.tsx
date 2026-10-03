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
  activePage?: 'toko' | 'sewa-alat' | 'pesanan' | 'dashboard' | 'profile' | 'beranda' | 'cart';
}

export default function BottomNav({ activePage }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isPetani = user?.role === 'PETANI';

  // Deteksi status active page secara otomatis jika tidak dipassing dari props
  const isToko = activePage
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className={`max-w-md mx-auto grid ${isPetani ? 'grid-cols-5' : 'grid-cols-4'} h-15 sm:h-16 items-center px-1 sm:px-2`}>
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
                className={`flex flex-col items-center justify-center gap-0.5 w-full py-1.5 px-1 rounded-xl transition-all duration-200 ${
                  item.isActive
                    ? 'bg-emerald-700 text-white shadow-xs scale-100 font-bold'
                    : 'text-slate-500 hover:text-slate-900 bg-transparent font-medium hover:bg-slate-100/60'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    item.isActive
                      ? 'text-white stroke-[2.4]'
                      : 'text-slate-500 stroke-[1.8] group-hover:scale-105'
                  }`}
                />
                <span
                  className={`text-[10px] tracking-tight truncate max-w-full leading-tight ${
                    item.isActive ? 'text-white font-bold' : 'text-slate-600'
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
