'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Store,
  Tractor,
  Receipt,
  User as UserIcon,
  LogOut,
  ChevronRight,
  MapPin,
  Phone,
  CheckCircle2,
  Users,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BottomNavProps {
  activePage?: 'beranda' | 'toko' | 'sewa-alat' | 'pesanan';
}

export default function BottomNav({ activePage }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Deteksi status active page secara otomatis jika tidak dipassing dari props
  const isBeranda = activePage ? activePage === 'beranda' : pathname === '/';
  const isToko = activePage
    ? activePage === 'toko'
    : pathname.startsWith('/toko') && !pathname.startsWith('/toko/mengikuti');
  const isSewaAlat = activePage
    ? activePage === 'sewa-alat'
    : pathname.startsWith('/sewa-alat');
  const isPesanan = activePage
    ? activePage === 'pesanan'
    : pathname.startsWith('/pesanan');

  const handleAkunClick = () => {
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    } else {
      setProfileModalOpen(true);
    }
  };

  const navItems = [
    {
      key: 'beranda',
      label: 'Beranda',
      href: '/',
      icon: Home,
      isActive: isBeranda,
      isButton: false,
    },
    {
      key: 'toko',
      label: 'Toko Online',
      href: '/toko',
      icon: Store,
      isActive: isToko,
      isButton: false,
    },
    {
      key: 'sewa-alat',
      label: 'Sewa Alat',
      href: '/sewa-alat',
      icon: Tractor,
      isActive: isSewaAlat,
      isButton: false,
    },
    {
      key: 'pesanan',
      label: 'Pesanan',
      href: '/pesanan',
      icon: Receipt,
      isActive: isPesanan,
      isButton: false,
    },
    {
      key: 'akun',
      label: 'Akun',
      href: '#',
      icon: UserIcon,
      isActive: profileModalOpen,
      isButton: true,
      onClick: handleAkunClick,
    },
  ];

  return (
    <>
      {/* Tokopedia-Style Bottom Navigation Bar (Khusus Mobile & Tablet: lg:hidden) */}
      <nav
        aria-label="Navigasi Bawah Layanan Koperasi"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 h-14 sm:h-16 items-center px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-lg transition-all group w-full ${
                  item.isActive
                    ? 'text-emerald-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      item.isActive
                        ? 'text-emerald-700 stroke-[2.4] scale-110'
                        : 'text-slate-500 stroke-[1.8] group-hover:scale-105'
                    }`}
                  />
                  {/* Subtle active indicator dot */}
                  {item.isActive && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  )}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] tracking-tight truncate max-w-full leading-tight mt-0.5 ${
                    item.isActive ? 'font-bold text-emerald-800' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );

            if (item.isButton) {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className="focus:outline-none cursor-pointer flex items-center justify-center"
                  aria-label={item.label}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className="focus:outline-none flex items-center justify-center"
                aria-label={item.label}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Modal Profile / Akun untuk Mobile & Tablet */}
      {user && (
        <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
          <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-2xl sm:rounded-3xl border-slate-200">
            <DialogHeader className="p-4 sm:p-5 bg-gradient-to-br from-[#183d2e] to-[#122e23] text-white relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(user.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <DialogTitle className="text-sm sm:text-base font-bold text-white truncate">
                      {user.name}
                    </DialogTitle>
                    <span className="text-[9px] bg-emerald-700/80 text-emerald-100 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/40">
                      {user.role === 'PETANI' ? 'Petani' : user.role === 'ADMIN' ? 'Admin' : 'Pembeli'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-3 bg-slate-50/50">
              {/* Info Kontak & Domisili */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{user.phone || 'Nomor HP belum diisi'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{user.address || 'Alamat belum diatur'}</span>
                </div>
              </div>

              {/* Menu Aksi Cepat */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    router.push('/pesanan');
                  }}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200/70 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Riwayat Pesanan Saya</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    router.push('/toko/mengikuti');
                  }}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200/70 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Daftar Petani yang Diikuti</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {user.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileModalOpen(false);
                      router.push('/admin-koperasi-sinar-pagi-sejahtera');
                    }}
                    className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/70 flex items-center justify-between text-xs font-bold text-emerald-900 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-emerald-700" />
                      <span>Masuk ke Panel Administrator</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                )}
              </div>

              {/* Tombol Logout */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    logout();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
