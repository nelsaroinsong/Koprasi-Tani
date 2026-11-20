'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCheck,
  Package,
  Sparkles,
  ChevronRight,
  X,
  PackageCheck,
  Tractor,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import {
  AppNotification,
  INITIAL_SYSTEM_NOTIFICATION,
  loadNotifications,
  markServerNotificationsRead,
  getStoredReadIds,
  saveReadIds,
  getCachedNotifications,
  setCachedNotifications,
} from '@/lib/notifications';

export default function NotificationDropdown() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isMounted, setIsMounted] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isNotifPage = pathname === '/notifikasi';

  const handleBellClick = () => {
    // Di mode mobile (< 640px), navigasi langsung ke halaman khusus notifikasi
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      router.push('/notifikasi');
      return;
    }
    // Di mode desktop (>= 640px), tampilkan dropdown panel beranimasi ke bawah
    setIsOpen((prev) => !prev);
  };

  // Load and sync transactions into notifications
  const syncNotifications = useCallback(async () => {
    // Jika status auth masih memuat, jangan fallback ke mode tamu agar badge tidak kedap-kedip
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      // Guest: Only initial system notification
      const readMap = getStoredReadIds(null);
      const guestNotifs = [
        {
          ...INITIAL_SYSTEM_NOTIFICATION,
          isRead: Boolean(readMap[INITIAL_SYSTEM_NOTIFICATION.id]),
        },
      ];
      setNotifications(guestNotifs);
      setCachedNotifications(guestNotifs, null);
      return;
    }

    try {
      const built = await loadNotifications(user.id);
      setNotifications(built);
      setCachedNotifications(built, user.id);
    } catch (e) {
      console.error('Error syncing notifications:', e);
      const readMap = getStoredReadIds(user.id);
      const fallbackNotifs = [
        {
          ...INITIAL_SYSTEM_NOTIFICATION,
          isRead: Boolean(readMap[INITIAL_SYSTEM_NOTIFICATION.id]),
        },
      ];
      setNotifications(fallbackNotifs);
      setCachedNotifications(fallbackNotifs, user.id);
    }
  }, [user, isAuthLoading]);

  // Sync on mount and when user / auth state changes
  useEffect(() => {
    setIsMounted(true);
    const cached = getCachedNotifications(user?.id);
    if (cached.length > 0) {
      setNotifications(cached);
    }
    if (!isAuthLoading) {
      syncNotifications();
    }
  }, [syncNotifications, isAuthLoading, user?.id]);

  // Listen to transaction events to update notifications live
  useEffect(() => {
    const handleTxUpdate = () => {
      syncNotifications();
    };

    // Cek notifikasi baru tiap 60 detik & saat tab dibuka kembali
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') syncNotifications();
    }, 60_000);
    const onVisible = () => document.visibilityState === 'visible' && syncNotifications();
    document.addEventListener('visibilitychange', onVisible);

    window.addEventListener('koperasi-new-transaction', handleTxUpdate);
    window.addEventListener('order-created', handleTxUpdate);
    window.addEventListener('rental-created', handleTxUpdate);
    window.addEventListener('koperasi-notifications-updated', handleTxUpdate);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('koperasi-new-transaction', handleTxUpdate);
      window.removeEventListener('order-created', handleTxUpdate);
      window.removeEventListener('rental-created', handleTxUpdate);
      window.removeEventListener('koperasi-notifications-updated', handleTxUpdate);
    };
  }, [syncNotifications]);

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
    const readMap = getStoredReadIds(user?.id);
    notifications.forEach((n) => {
      readMap[n.id] = true;
    });
    saveReadIds(readMap, user?.id);
    markServerNotificationsRead('all');

    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    setCachedNotifications(updated, user?.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('koperasi-notifications-updated'));
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    const readMap = getStoredReadIds(user?.id);
    readMap[notif.id] = true;
    markServerNotificationsRead([notif]);
    saveReadIds(readMap, user?.id);

    const updated = notifications.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    setCachedNotifications(updated, user?.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('koperasi-notifications-updated'));
    }

    setIsOpen(false);
    if (notif.href) {
      router.push(notif.href);
    }
  };

  const getIcon = (notif: AppNotification) => {
    if (notif.type === 'system') {
      return <Sparkles className="w-4 h-4 text-[#233414]" />;
    }
    if (notif.id.startsWith('rental')) {
      return <Tractor className="w-4 h-4 text-amber-700" />;
    }
    return <Package className="w-4 h-4 text-emerald-700" />;
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
        onClick={handleBellClick}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
          isOpen || isNotifPage
            ? 'bg-[#233414] text-[#D4F63D] border-[#233414]'
            : 'bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#233414] border-[#d5dccf]'
        }`}
        title="Notifikasi"
        aria-label="Lihat Notifikasi"
      >
        <Bell className="w-4 h-4" />
        {isMounted && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full font-bold text-[10px] tabular-nums flex items-center justify-center ring-2 bg-[#233414] text-[#D4F63D] ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel with Smooth Downward Animation (Desktop Only, Mobile uses dedicated /notifikasi page) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notification-dropdown-card"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
            className="hidden sm:flex sm:absolute sm:top-[calc(100%+20px)] sm:right-0 sm:w-80 md:w-96 bg-white rounded-2xl border border-[#dce1d6] shadow-2xl z-50 flex-col max-h-[500px] overflow-hidden"
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
                      {getIcon(notif)}
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
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
}
