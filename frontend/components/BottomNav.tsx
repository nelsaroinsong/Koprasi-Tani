'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Store,
  Tractor,
  Package,
  User as UserIcon,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface BottomNavProps {
  activePage?: 'toko' | 'sewa-alat' | 'pesanan' | 'dashboard' | 'profile' | 'beranda' | 'cart' | 'none';
}

interface PillMetrics {
  x: number;
  width: number;
  instant: boolean;
}

function shouldShowBottomNav(pathname: string, hasUser: boolean): boolean {
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

  if (!hasUser && (pathname.startsWith('/dashboard') || pathname === '/profile' || pathname === '/profil')) {
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

export default function BottomNav({ activePage }: BottomNavProps = {}) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user } = useAuth();
  const isPetani = user?.role === 'PETANI';

  const isVisible = activePage === 'none' ? false : shouldShowBottomNav(pathname, Boolean(user));

  // Optimistic tab state for zero-latency sliding response on tap
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);
  const [pill, setPill] = useState<PillMetrics | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const hasMeasuredRef = useRef(false);

  // Pre-warm router cache for all main tabs during browser idle time
  useEffect(() => {
    if (!isVisible) return;
    const routes = ['/toko', '/sewa-alat', '/pesanan', '/profile'];
    if (isPetani) {
      routes.push('/dashboard');
    }

    const prefetchAll = () => {
      routes.forEach((r) => {
        try {
          router.prefetch(r);
        } catch {}
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as unknown as {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback: (id: number) => void;
      }).requestIdleCallback(prefetchAll, { timeout: 1200 });
      return () => {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      };
    }

    const timer = setTimeout(prefetchAll, 150);
    return () => clearTimeout(timer);
  }, [router, isPetani, isVisible]);

  const canonicalActiveKey = useMemo(() => {
    if (!isVisible) return null;
    if (activePage && activePage !== 'beranda' && activePage !== 'cart') {
      return activePage;
    }
    if (pathname.startsWith('/checkout/sewa-alat') || pathname.startsWith('/sewa-alat')) {
      return 'sewa-alat';
    }
    if (
      pathname.startsWith('/checkout/toko') ||
      (pathname.startsWith('/toko') && !pathname.startsWith('/toko/mengikuti') && !pathname.startsWith('/toko/petani'))
    ) {
      return 'toko';
    }
    if (pathname.startsWith('/pesanan')) return 'pesanan';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/profile') || pathname.startsWith('/profil')) return 'profile';
    return null;
  }, [activePage, pathname, isVisible]);

  const activeKey = optimisticTab || canonicalActiveKey;

  // Reset optimistic tab once actual route catches up
  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname, activePage]);

  const navItems = useMemo(
    () => [
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
        icon: Package,
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
        href: user ? '/profile' : `/login?callbackUrl=${encodeURIComponent(pathname || '/profile')}`,
        icon: UserIcon,
      },
    ],
    [isPetani, user, pathname]
  );

  // Measure active tab purely along horizontal axis; CSS compositor handles smooth spring glide
  useLayoutEffect(() => {
    if (!isVisible || !activeKey) {
      setPill(null);
      hasMeasuredRef.current = false;
      return;
    }

    const activeEl = linkRefs.current[activeKey];
    if (!activeEl || activeEl.offsetWidth === 0) return;

    const nextX = activeEl.offsetLeft;
    const nextWidth = activeEl.offsetWidth;
    const isFirstMeasure = !hasMeasuredRef.current;

    hasMeasuredRef.current = true;
    setPill((prev) => {
      if (prev && Math.abs(prev.x - nextX) < 0.5 && Math.abs(prev.width - nextWidth) < 0.5) {
        return prev;
      }
      return {
        x: nextX,
        width: nextWidth,
        instant: isFirstMeasure,
      };
    });
  }, [activeKey, isVisible, isPetani]);

  // Keep pill snapped cleanly on orientation/viewport resize without spring lag
  useEffect(() => {
    if (!isVisible) return;
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (!activeKey) return;
      const activeEl = linkRefs.current[activeKey];
      if (!activeEl || activeEl.offsetWidth === 0) return;

      hasMeasuredRef.current = true;
      setPill({
        x: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        instant: true,
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi Bawah Layanan Koperasi"
      className="nav-pill-track fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#dce1d6] lg:hidden pt-1 pb-[max(0.875rem,env(safe-area-inset-bottom,0px))] shadow-xs"
    >
      <div
        ref={containerRef}
        className="max-w-md mx-auto flex items-center justify-around h-14 sm:h-15 px-2 relative"
      >
        {/* GPU-Composited Horizontal Sliding Pill (Hanya geser horizontal di dalam navbar) */}
        {pill && (
          <div
            aria-hidden="true"
            data-instant={pill.instant ? 'true' : 'false'}
            style={{
              transform: `translate3d(${pill.x}px, 0, 0)`,
              width: `${pill.width}px`,
            }}
            className="nav-pill-indicator pointer-events-none absolute left-0 top-0 bottom-0 my-auto h-12 bg-[#1a2610] rounded-full shadow-sm z-0"
          />
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = activeKey === item.key;

          return (
            <Link
              key={item.key}
              ref={(el) => {
                linkRefs.current[item.key] = el;
              }}
              href={item.href}
              prefetch={true}
              onPointerDown={() => {
                try {
                  router.prefetch(item.href);
                } catch {}
              }}
              onClick={() => {
                if (activeKey !== item.key) {
                  setOptimisticTab(item.key);
                }
              }}
              aria-current={isItemActive ? 'page' : undefined}
              className="relative z-10 focus:outline-none flex items-center justify-center py-1 touch-manipulation select-none"
              aria-label={item.label}
              title={item.label}
            >
              <div
                className={`h-10 rounded-full flex items-center justify-center select-none cursor-pointer transition-colors duration-150 ${
                  isItemActive
                    ? 'text-white px-3.5 sm:px-4 gap-2'
                    : 'w-10 h-10 text-[#526046] hover:text-[#1a2610]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors duration-150 ${
                    isItemActive
                      ? 'text-white stroke-[2.2]'
                      : 'text-[#526046] stroke-[1.8]'
                  }`}
                />
                {isItemActive && (
                  <span
                    key={item.key}
                    className="nav-label-enter text-xs font-bold text-white whitespace-nowrap"
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
