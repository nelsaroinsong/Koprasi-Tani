'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Clock, ShieldAlert, X, ChevronUp } from 'lucide-react';
import {
  formatCountdown,
  formatWitaRange,
  type MaintenanceEvaluation,
} from '@/lib/maintenance';
import { ADMIN_LOGIN_PATH, isAdminPath } from '@/lib/admin-routes';

const MINIMIZE_STORAGE_KEY = 'ksps_maint_banner_minimized';

/** Halaman mobile yang menampilkan BottomNav (sesuai logika BottomNav.tsx) */
function hasMobileBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth-callback') ||
    pathname.startsWith('/verifikasi-petani') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/notifikasi') ||
    pathname.startsWith('/toko/petani') ||
    pathname.startsWith('/toko/filter') ||
    pathname.startsWith('/sewa-alat/filter')
  ) {
    return false;
  }
  return (
    pathname.startsWith('/toko') ||
    pathname.startsWith('/sewa-alat') ||
    pathname.startsWith('/pesanan') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/profil') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/search')
  );
}

/** Format hitung mundur ringkas untuk pill/kartu agar tidak meluber di layar kecil */
function formatShortCountdown(targetIso: string | null | undefined, nowMs: number): string {
  if (!targetIso) return '';
  const diffSec = Math.max(0, Math.floor((new Date(targetIso).getTime() - nowMs) / 1000));
  if (diffSec <= 0) return 'sebentar lagi';
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}d`;
  return `${seconds} detik`;
}

/**
 * Penjaga & Pemberitahuan Pemeliharaan Global (UX-friendly, tidak pernah menutupi Navbar maupun BottomNav):
 * - Fase Pra-Pemeliharaan: kartu notifikasi mengambang rapi di kanan bawah (desktop) / tepat di atas BottomNav (mobile).
 *   Bisa diperkecil menjadi pill mungil agar pengguna tetap melihat hitung mundur tanpa terganggu.
 * - Fase Pemeliharaan Aktif: pengguna non-admin otomatis diarahkan ke /maintenance;
 *   Admin yang sedang meninjau halaman publik melihat pill indikator khusus di sudut bawah.
 */
export default function MaintenanceGuard() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role === 'ADMIN';

  const [status, setStatus] = useState<MaintenanceEvaluation | null>(null);
  const [minimizedKey, setMinimizedKey] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isExemptPage =
    !pathname ||
    isAdminPath(pathname) ||
    pathname === '/maintenance' ||
    pathname.startsWith(ADMIN_LOGIN_PATH);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/maintenance', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as MaintenanceEvaluation;
      setStatus(data);
    } catch {
      // Abaikan jika offline
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setMinimizedKey(sessionStorage.getItem(MINIMIZE_STORAGE_KEY));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (isExemptPage) return;
    void fetchStatus();

    const interval = setInterval(() => {
      void fetchStatus();
    }, 60_000);

    const onFocus = () => {
      void fetchStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isExemptPage, fetchStatus]);

  // Saat fase pengumuman, jadwalkan pengecekan tepat ketika jam mulai tiba
  const upcomingStart = status?.upcomingWindow?.startAt || null;
  useEffect(() => {
    if (!upcomingStart || isExemptPage) return;
    const msLeft = new Date(upcomingStart).getTime() - Date.now();
    if (msLeft <= 0 || msLeft > 24 * 60 * 60 * 1000) return;
    const timer = setTimeout(() => {
      void fetchStatus();
    }, msLeft + 1000);
    return () => clearTimeout(timer);
  }, [upcomingStart, isExemptPage, fetchStatus]);

  // Detik hitung mundur saat pemberitahuan tampil
  useEffect(() => {
    if (!status?.isAnnouncement) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status?.isAnnouncement]);

  // Pengguna non-admin pada tab terbuka otomatis dialihkan begitu pemeliharaan aktif
  useEffect(() => {
    if (isExemptPage || isAdmin) return;
    if (status?.isMaintenance) {
      window.location.href = '/maintenance';
    }
  }, [status?.isMaintenance, isAdmin, isExemptPage]);

  if (isExemptPage || !status) return null;

  const mobileBottomClass = hasMobileBottomNav(pathname)
    ? 'bottom-[calc(82px+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(16px+env(safe-area-inset-bottom))]';

  // 1. Pill indikator elegan untuk Admin yang sedang meninjau situs publik saat pemeliharaan aktif
  if (status.isMaintenance && isAdmin) {
    return (
      <div
        className={`fixed right-3 left-3 sm:left-auto sm:right-5 ${mobileBottomClass} sm:bottom-5 z-[65] flex justify-end pointer-events-none`}
      >
        <div className="pointer-events-auto inline-flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-2xl bg-[#18181B]/95 backdrop-blur-md text-white border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.22)] text-xs max-w-full">
          <span className="w-6 h-6 rounded-lg bg-[#D4F63D]/15 text-[#D4F63D] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
          </span>
          <span className="font-medium truncate">
            Pemeliharaan <b className="text-[#D4F63D]">Aktif</b> · Mode Admin
          </span>
          <Link
            href="/admin"
            className="px-2.5 py-1 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold text-[11px] transition shrink-0"
          >
            Panel Admin
          </Link>
        </div>
      </div>
    );
  }

  // 2. Pemberitahuan Pra-Pemeliharaan (Floating Card rapi + bisa diperkecil jadi pill mungil)
  if (status.isAnnouncement && status.upcomingWindow) {
    const windowKey = status.upcomingWindow.startAt;
    const isMinimized = minimizedKey === windowKey;
    const rangeText = formatWitaRange(status.upcomingWindow.startAt, status.upcomingWindow.endAt);
    const fullCountdown = formatCountdown(status.upcomingWindow.startAt, nowMs);
    const shortCountdown = formatShortCountdown(status.upcomingWindow.startAt, nowMs);

    const minimize = () => {
      setMinimizedKey(windowKey);
      try {
        sessionStorage.setItem(MINIMIZE_STORAGE_KEY, windowKey);
      } catch {}
    };

    const expand = () => {
      setMinimizedKey(null);
      try {
        sessionStorage.removeItem(MINIMIZE_STORAGE_KEY);
      } catch {}
    };

    // Tampilan diperkecil: pill mungil di sudut bawah kanan, sama sekali tidak mengganggu
    if (isMinimized) {
      return (
        <div
          className={`fixed right-3 sm:right-5 ${mobileBottomClass} sm:bottom-5 z-[62]`}
        >
          <button
            type="button"
            onClick={expand}
            className="group inline-flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-full bg-white/95 backdrop-blur-md border border-[#dce1d6] hover:border-[#233414]/40 text-[#1a2610] shadow-[0_8px_24px_rgba(26,38,16,0.14)] text-xs font-semibold transition cursor-pointer"
            aria-label="Lihat jadwal pemeliharaan sistem"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Pemeliharaan</span>
            {shortCountdown && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#233414] text-[#D4F63D] text-[10.5px] font-semibold tabular-nums">
                {shortCountdown}
              </span>
            )}
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1a2610] transition" />
          </button>
        </div>
      );
    }

    // Tampilan kartu mengambang rapi (tidak menutupi navbar atas maupun bottom nav mobile)
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed left-3 right-3 sm:left-auto sm:right-5 sm:w-[390px] ${mobileBottomClass} sm:bottom-5 z-[62]`}
      >
        <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-[#dce1d6] shadow-[0_14px_38px_rgba(26,38,16,0.14)] overflow-hidden">
          {/* Garis aksen tipis di atas kartu */}
          <div className="h-1 w-full bg-gradient-to-r from-[#233414] via-[#4a6b28] to-[#D4F63D]" />

          <div className="p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 stroke-[2]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-bold text-[#1a2610] leading-snug">
                    {status.title}
                  </h3>
                  <button
                    type="button"
                    onClick={minimize}
                    className="w-6 h-6 -mr-1 -mt-0.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer transition"
                    title="Perkecil pemberitahuan"
                    aria-label="Perkecil pemberitahuan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="mt-1 text-[12px] text-[#526046] leading-relaxed">
                  Layanan sementara tidak dapat digunakan pada{' '}
                  <b className="text-[#1a2610] font-semibold tabular-nums">{rangeText}</b>.
                </p>

                {fullCountdown && (
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#233414] text-[#D4F63D] text-[11px] font-semibold tabular-nums">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Dimulai dalam {fullCountdown}</span>
                    </span>
                    <button
                      type="button"
                      onClick={minimize}
                      className="text-[11px] font-semibold text-[#526046] hover:text-[#1a2610] cursor-pointer transition"
                    >
                      Mengerti
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
