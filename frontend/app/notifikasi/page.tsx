'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  ArrowLeft,
  CheckCheck,
  Package,
  Tractor,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  ShoppingBag,
  Store,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
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

type FilterType = 'all' | 'unread' | 'transaksi' | 'system';

export default function NotifikasiPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isMounted, setIsMounted] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load and sync notifications
  const syncNotifications = useCallback(async () => {
    if (isAuthLoading) return;

    if (!user) {
      const readMap = getStoredReadIds(null);
      const guestNotifs = [
        {
          ...INITIAL_SYSTEM_NOTIFICATION,
          isRead: Boolean(readMap[INITIAL_SYSTEM_NOTIFICATION.id]),
        },
      ];
      setNotifications(guestNotifs);
      setCachedNotifications(guestNotifs, null);
      setIsLoading(false);
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
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

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

  // Listen to transaction and notification updates live
  useEffect(() => {
    const handleUpdate = () => {
      syncNotifications();
    };

    window.addEventListener('koperasi-new-transaction', handleUpdate);
    window.addEventListener('order-created', handleUpdate);
    window.addEventListener('rental-created', handleUpdate);
    window.addEventListener('koperasi-notifications-updated', handleUpdate);

    return () => {
      window.removeEventListener('koperasi-new-transaction', handleUpdate);
      window.removeEventListener('order-created', handleUpdate);
      window.removeEventListener('rental-created', handleUpdate);
      window.removeEventListener('koperasi-notifications-updated', handleUpdate);
    };
  }, [syncNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );
  const transaksiCount = useMemo(
    () => notifications.filter((n) => n.type === 'transaksi').length,
    [notifications]
  );
  const systemCount = useMemo(
    () => notifications.filter((n) => n.type === 'system').length,
    [notifications]
  );

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

    if (notif.href) {
      router.push(notif.href);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'transaksi') return n.type === 'transaksi';
      if (filter === 'system') return n.type === 'system';
      return true;
    });
  }, [notifications, filter]);

  const getNotifIcon = (notif: AppNotification) => {
    if (notif.type === 'system') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-[#f2f6ee] border border-[#d5dccf] text-[#233414] flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
      );
    }
    if (notif.id.startsWith('rental')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-[#fef8ed] border border-[#f4e2bf] text-amber-800 flex items-center justify-center shrink-0">
          <Tractor className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#eef7ee] border border-[#cbe4cb] text-emerald-800 flex items-center justify-center shrink-0">
        <Package className="w-4 h-4" />
      </div>
    );
  };

  const getCategoryLabel = (notif: AppNotification) => {
    if (notif.type === 'system') return 'Sistem Koperasi';
    if (notif.id.startsWith('rental')) return 'Sewa Alsintan';
    return 'Pesanan Komoditas';
  };

  return (
    <div className="min-h-screen bg-[#f8f9f6] flex flex-col text-[#1a2610]">
      {/* Desktop Header */}
      <div className="hidden sm:block">
        <AppHeader activePage="none" />
      </div>

      {/* Mobile Top App Bar (Fixed di top, solid white, anti-tembus) */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#e2e7dc] px-4 h-14 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/toko');
              }
            }}
            className="w-9 h-9 rounded-full bg-[#f4f5f1] hover:bg-[#EAEDE7] active:bg-[#dce1d6] text-[#233414] flex items-center justify-center transition-colors cursor-pointer border border-[#d5dccf]"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-[#1a2610] leading-tight">
              Notifikasi
            </h1>
            <p className="text-[10px] font-semibold text-[#526046]">
              {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs font-semibold text-[#344d15] hover:text-[#1a2610] bg-[#f4f5f1] hover:bg-[#EAEDE7] px-2.5 py-1.5 rounded-full border border-[#d5dccf] flex items-center gap-1 transition-colors cursor-pointer"
            title="Tandai semua telah dibaca"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="text-[11px]">Tandai Dibaca</span>
          </button>
        )}
      </header>
      {/* Spacer placeholder mode mobile agar konten tidak tertutup fixed navbar */}
      <div className="sm:hidden h-14 shrink-0 pointer-events-none" aria-hidden="true" />

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 sm:py-8 pb-28 sm:pb-16">
        {/* Desktop Title & Action */}
        <div className="hidden sm:flex items-center justify-between mb-6 pb-4 border-b border-[#e2e7dc]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#233414] text-[#D4F63D] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-[#1a2610] tracking-tight">
                Pusat Notifikasi
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#233414] text-[#D4F63D] text-xs font-bold tabular-nums">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <p className="text-xs text-[#526046] mt-1 ml-11">
              Pemberitahuan aktivitas pesanan komoditas hasil panen dan sewa alsintan Anda.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-[#233414] hover:bg-[#EAEDE7] bg-[#f4f5f1] border border-[#d5dccf] px-3.5 py-2 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-[#344d15]" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>

        {/* Filter Pills Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 sm:pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'all'
                ? 'bg-[#233414] text-white shadow-xs'
                : 'bg-white hover:bg-[#EAEDE7] text-[#526046] hover:text-[#1a2610] border border-[#dce1d6]'
            }`}
          >
            <span>Semua</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                filter === 'all'
                  ? 'bg-white/20 text-[#D4F63D]'
                  : 'bg-[#f4f5f1] text-[#526046]'
              }`}
            >
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'unread'
                ? 'bg-[#233414] text-white shadow-xs'
                : 'bg-white hover:bg-[#EAEDE7] text-[#526046] hover:text-[#1a2610] border border-[#dce1d6]'
            }`}
          >
            <span>Belum Dibaca</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  filter === 'unread'
                    ? 'bg-[#D4F63D] text-[#1a2610] font-bold'
                    : 'bg-[#233414] text-[#D4F63D] font-bold'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('transaksi')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'transaksi'
                ? 'bg-[#233414] text-white shadow-xs'
                : 'bg-white hover:bg-[#EAEDE7] text-[#526046] hover:text-[#1a2610] border border-[#dce1d6]'
            }`}
          >
            <span>Transaksi</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                filter === 'transaksi'
                  ? 'bg-white/20 text-[#D4F63D]'
                  : 'bg-[#f4f5f1] text-[#526046]'
              }`}
            >
              {transaksiCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('system')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'system'
                ? 'bg-[#233414] text-white shadow-xs'
                : 'bg-white hover:bg-[#EAEDE7] text-[#526046] hover:text-[#1a2610] border border-[#dce1d6]'
            }`}
          >
            <span>Sistem</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                filter === 'system'
                  ? 'bg-white/20 text-[#D4F63D]'
                  : 'bg-[#f4f5f1] text-[#526046]'
              }`}
            >
              {systemCount}
            </span>
          </button>
        </div>

        {/* Notification Feed */}
        {isLoading ? (
          <div className="space-y-3 mt-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-[20px] bg-white border border-[#e2e7dc] animate-pulse flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#eaede7]" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-[#eaede7] rounded-md w-1/3" />
                  <div className="h-4 bg-[#eaede7] rounded-md w-3/4" />
                  <div className="h-3 bg-[#eaede7] rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State (Taste Skill: quiet, honest, beautiful) */
          <div className="mt-8 py-12 px-4 rounded-[24px] bg-white border border-[#e2e7dc] text-center max-w-md mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#f4f5f1] border border-[#dce1d6] text-[#6b7b5f] flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-6 h-6 stroke-[1.6]" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#1a2610]">
              {filter === 'unread'
                ? 'Semua Notifikasi Telah Dibaca'
                : 'Belum Ada Notifikasi'}
            </h3>
            <p className="text-xs text-[#526046] max-w-xs mx-auto mt-1.5 leading-relaxed">
              {filter === 'unread'
                ? 'Bagus! Anda telah memeriksa semua notifikasi pesanan dan aktivitas sewa alsintan.'
                : 'Pemberitahuan perkembangan pesanan dan verifikasi alsintan akan tampil otomatis di sini.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#233414] border border-[#d5dccf] transition-colors cursor-pointer"
              >
                Tampilkan Semua
              </button>
              <Link
                href="/toko"
                className="px-4 py-2 rounded-full text-xs font-semibold bg-[#233414] hover:bg-[#344d15] text-white transition-colors flex items-center gap-1.5"
              >
                <Store className="w-3.5 h-3.5 text-[#D4F63D]" />
                <span>Belanja di Toko</span>
              </Link>
            </div>
          </div>
        ) : (
          /* List of Notifications */
          <div className="space-y-2.5 mt-2">
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.isRead;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3.5 sm:p-4 rounded-[20px] transition-all cursor-pointer border flex items-start gap-3.5 ${
                    isUnread
                      ? 'bg-white hover:bg-[#fafbf9] border-[#cfd8c7] shadow-xs ring-1 ring-[#233414]/5'
                      : 'bg-white/80 hover:bg-white border-[#e2e7dc] opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Category Icon */}
                  {getNotifIcon(notif)}

                  {/* Main Info */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold text-[#344d15] uppercase tracking-wider">
                        {getCategoryLabel(notif)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-[#6b7b5f] font-medium tabular-nums flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#526046]/70" />
                          {notif.time}
                        </span>
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#233414] ring-2 ring-white shrink-0"
                            title="Belum dibaca"
                          />
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs sm:text-[13px] font-bold text-[#1a2610] leading-snug group-hover:text-[#233414] transition-colors">
                      {notif.title}
                    </h4>

                    <p className="text-xs text-[#526046] mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    {/* Action hint pill */}
                    {notif.href && (
                      <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#233414] bg-[#f4f5f1] group-hover:bg-[#EAEDE7] px-2.5 py-1 rounded-full transition-colors border border-[#dce1d6]">
                        <span>
                          {notif.id.startsWith('rental')
                            ? 'Lihat Detail Sewa'
                            : notif.type === 'transaksi'
                            ? 'Lihat Detail Pesanan'
                            : 'Buka Halaman'}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-[#526046] group-hover:text-[#233414] transition-colors" />
                      </div>
                    )}
                  </div>

                  {/* Chevron Right */}
                  <ChevronRight className="w-4 h-4 text-[#526046]/40 group-hover:text-[#233414] transition shrink-0 self-center hidden sm:block" />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activePage="none" />
    </div>
  );
}
