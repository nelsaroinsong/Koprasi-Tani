'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Store,
  Tractor,
  PackageCheck,
  Sparkles,
  ChevronRight,
  X,
  ShieldCheck,
  BarChart3,
  Truck,
} from 'lucide-react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'toko' | 'pesanan' | 'alsintan' | 'system' | 'delivery' | 'analytics' | 'verification';
  time: string;
  href?: string;
  isRead: boolean;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Hasil Panen Baru di Toko',
    message: 'Kelapa Butir Grade A dan Jagung Pipil Kering baru saja tiba di gudang koperasi siap diorder.',
    type: 'toko',
    time: '15 menit lalu',
    href: '/toko',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'Pembaruan Status Pesanan',
    message: 'Pesanan komoditas Anda telah diverifikasi oleh pengurus koperasi dan siap untuk dikirim.',
    type: 'pesanan',
    time: '1 jam lalu',
    href: '/pesanan',
    isRead: false,
  },
  {
    id: 'notif-3',
    title: 'Katalog Sewa Alsintan Siap Pakai',
    message: 'Traktor roda empat Kubota dan Power Thresher telah melalui inspeksi berkala dan siap disewa.',
    type: 'alsintan',
    time: 'Kemarin, 14:20',
    href: '/sewa-alat',
    isRead: true,
  },
  {
    id: 'notif-4',
    title: 'Selamat Datang di Koperasi Tani',
    message: 'Nikmati kemudahan jual-beli hasil panen dan sewa alsintan modern bersama Sinar Pagi Sejahtera.',
    type: 'system',
    time: '2 hari lalu',
    href: '/profile',
    isRead: true,
  },
  {
    id: 'notif-5',
    title: 'Armada Pengiriman Siap Jalan',
    message: 'Rute pengiriman komoditas area Minahasa Utara & Manado dijadwalkan berangkat pukul 08:00 WITA.',
    type: 'delivery',
    time: '3 hari lalu',
    href: '/pesanan',
    isRead: true,
  },
  {
    id: 'notif-6',
    title: 'Verifikasi Akun Petani Binaan',
    message: 'Status keanggotaan dan sertifikasi kelompok tani Anda telah terdaftar resmi dalam basis data ICARE.',
    type: 'verification',
    time: '4 hari lalu',
    href: '/profile',
    isRead: true,
  },
  {
    id: 'notif-7',
    title: 'Rekapitulasi Transaksi Mingguan',
    message: 'Laporan arus komoditas dan pesanan masuk minggu ini telah diperbarui oleh sistem koperasi.',
    type: 'analytics',
    time: '5 hari lalu',
    href: '/profile/transaksi',
    isRead: true,
  },
];

const NOTIFICATIONS_STORAGE_KEY = 'koperasi_notifications_state_v2';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotifications(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed reading notifications from storage', e);
    }
    setNotifications(DEFAULT_NOTIFICATIONS);
  }, []);

  // Save to localStorage whenever notifications change
  const persistNotifications = (updated: AppNotification[]) => {
    setNotifications(updated);
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Prevent background page / Lenis scrolling when mouse wheel or touch is used inside notification list
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !isOpen) return;

    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = el;
      const isScrollable = scrollHeight > clientHeight;
      if (!isScrollable) return;

      const delta = e.deltaY;
      const atTop = scrollTop <= 0 && delta < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && delta > 0;

      // Directly scroll the container
      el.scrollTop += delta;

      // Prevent the page behind from scrolling
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    persistNotifications(updated);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    const updated = notifications.map((n) =>
      n.id === notif.id ? { ...n, isRead: true } : n
    );
    persistNotifications(updated);
    setIsOpen(false);
    if (notif.href) {
      router.push(notif.href);
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'toko':
        return <Store className="w-4 h-4 text-emerald-700" />;
      case 'pesanan':
        return <PackageCheck className="w-4 h-4 text-blue-700" />;
      case 'alsintan':
        return <Tractor className="w-4 h-4 text-amber-700" />;
      case 'delivery':
        return <Truck className="w-4 h-4 text-emerald-800" />;
      case 'verification':
        return <ShieldCheck className="w-4 h-4 text-[#233414]" />;
      case 'analytics':
        return <BarChart3 className="w-4 h-4 text-teal-700" />;
      case 'system':
      default:
        return <Sparkles className="w-4 h-4 text-[#233414]" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button: Rounded Pill matching Cart */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
          isOpen
            ? 'bg-[#233414] text-[#D4F63D] border-[#233414]'
            : 'bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#233414] border-[#d5dccf]'
        }`}
        title="Notifikasi"
        aria-label="Lihat Notifikasi"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full font-bold text-[10px] tabular-nums flex items-center justify-center ring-2 bg-[#233414] text-[#D4F63D] ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel with Fully Scrollable List */}
      {isOpen && (
        <div
          data-lenis-prevent="true"
          data-lenis-prevent-wheel="true"
          data-lenis-prevent-touch="true"
          className="fixed sm:absolute top-16 sm:top-full left-3 right-3 sm:left-auto sm:right-0 sm:mt-2 sm:w-84 md:w-96 bg-white rounded-2xl border border-[#dce1d6] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[82vh] sm:max-h-[500px]"
        >
          {/* Header (Pinned) */}
          <div className="p-3.5 sm:p-4 border-b border-[#e6ebdf] bg-[#f9faf7] flex items-center justify-between shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#233414] text-[#D4F63D] flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1a2610]">
                  Notifikasi
                </h3>
                <p className="text-[11px] text-[#526046]">
                  {unreadCount > 0
                    ? `${unreadCount} belum dibaca`
                    : 'Semua notifikasi telah dibaca'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-[#344d15] hover:text-[#1a2610] hover:bg-[#EAEDE7] px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="Tandai semua dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tandai dibaca</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#EAEDE7] text-[#526046] hover:text-[#1a2610] flex items-center justify-center transition cursor-pointer sm:hidden"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs (Pinned) */}
          <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-[#f0f2eb] shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#233414] text-white'
                  : 'text-[#526046] hover:bg-[#EAEDE7]'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                filter === 'unread'
                  ? 'bg-[#233414] text-white'
                  : 'text-[#526046] hover:bg-[#EAEDE7]'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {/* Notification List - Fully Scrollable with Mousewheel, Touch & Scrollbar */}
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-[#f0f2eb] focus:outline-none"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cfd6c9 transparent',
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center text-slate-400">
                <Bell className="w-8 h-8 mb-2 opacity-40 text-[#526046]" />
                <p className="text-xs font-semibold text-[#1a2610]">
                  Tidak ada notifikasi
                </p>
                <p className="text-[11px] text-[#526046] mt-0.5">
                  {filter === 'unread'
                    ? 'Semua notifikasi sudah Anda baca.'
                    : 'Belum ada notifikasi baru untuk Anda.'}
                </p>
              </div>
            ) : (
              <div className="pb-3">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 sm:p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      notif.isRead
                        ? 'bg-white hover:bg-[#f9faf7]'
                        : 'bg-[#f4f7ef]/70 hover:bg-[#edf2e6]'
                    }`}
                  >
                    {/* Icon Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        notif.isRead
                          ? 'bg-[#f4f5f1] border-[#dce1d6]'
                          : 'bg-white border-[#b8c4ae] shadow-2xs'
                      }`}
                    >
                      {getIcon(notif.type)}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            notif.isRead
                              ? 'font-medium text-[#1a2610]'
                              : 'font-bold text-[#1a2610]'
                          }`}
                        >
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#233414] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#526046] line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-[#6b7b5f] mt-1 inline-block font-medium">
                        {notif.time}
                      </span>
                    </div>

                    {/* Arrow indicator */}
                    <ChevronRight className="w-3.5 h-3.5 text-[#526046]/40 group-hover:text-[#233414] transition shrink-0 self-center" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer (Pinned) */}
          <div className="p-3 bg-[#f9faf7] border-t border-[#e6ebdf] text-center shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push('/profile/transaksi');
              }}
              className="text-xs font-semibold text-[#344d15] hover:text-[#1a2610] transition cursor-pointer"
            >
              Lihat Riwayat Transaksi & Aktivitas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
