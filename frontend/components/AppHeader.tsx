'use client';

import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ShoppingBag,
  ShoppingCart,
  Tractor,
  Package,
  LogIn,
  User as UserIcon,
  LayoutDashboard,
  ChevronDown,
  Check,
} from 'lucide-react';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import NotificationDropdown from '@/components/NotificationDropdown';
import { useAuth } from '@/context/auth-context';

export interface SubCategoryItem {
  id?: string;
  name: string;
  slug?: string;
  emoji?: string;
  imageUrl?: string;
  description?: string;
  mobileBg?: string;
  isActive?: boolean;
}

interface AppHeaderProps {
  activePage?: 'toko' | 'sewa-alat' | 'pesanan' | 'dashboard' | 'profile' | 'beranda' | 'cart' | 'none';
  showCatalogSubNav?: boolean;
  selectedKategori?: string;
  onSelectKategori?: (kategori: string) => void;
  sortBy?: string;
  onSelectSort?: (sortBy: string) => void;
  categories?: SubCategoryItem[];
}

const DEFAULT_TOKO_CATEGORIES: SubCategoryItem[] = [
  { id: 'cat-kelapa', name: 'Kelapa' },
  { id: 'cat-jagung', name: 'Jagung' },
  { id: 'cat-turunan', name: 'Turunan' },
  { id: 'cat-olahan', name: 'Olahan' },
];

interface DesktopPillMetrics {
  x: number;
  width: number;
}

interface DesktopPillState {
  from: DesktopPillMetrics | null;
  to: DesktopPillMetrics;
  animate: boolean;
}

let lastDesktopPill: DesktopPillMetrics | null = null;
const headerCategoriesCache: Record<string, { items: SubCategoryItem[]; at: number }> = {};
const HEADER_CATEGORIES_TTL_MS = 5 * 60 * 1000;

export default function AppHeader({
  activePage,
  showCatalogSubNav,
  selectedKategori,
  onSelectKategori,
  sortBy,
  onSelectSort,
  categories,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // Optimistic tab state for instantaneous sliding background response on desktop
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);
  const [desktopPillState, setDesktopPillState] = useState<DesktopPillState | null>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const desktopPillRef = useRef<HTMLDivElement>(null);
  const desktopLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const initialDesktopPrevRef = useRef<DesktopPillMetrics | null | undefined>(undefined);
  const prevDesktopTabRef = useRef<string | null>(null);

  // Category dropdown popover state for desktop sub-navbar
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    }
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Sync optimistic tab whenever pathname or activePage prop changes
  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname, activePage]);

  // Pre-warm router cache for all core pages in the background
  useEffect(() => {
    const routes = ['/toko', '/sewa-alat', '/pesanan', '/profile'];
    if (user?.role === 'PETANI') {
      routes.push('/dashboard');
    }
    const timer = setTimeout(() => {
      routes.forEach((r) => {
        try {
          router.prefetch(r);
        } catch {}
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [router, user?.role]);

  // Deteksi halaman aktif secara otomatis berdasarkan pathname jika props tidak spesifik
  const currentActive = useMemo(() => {
    if (activePage === 'none') return 'none';
    if (pathname.startsWith('/toko/petani')) return 'none';
    if (activePage && activePage !== 'beranda') return activePage;
    if (pathname === '/cart' || pathname.startsWith('/cart')) return 'cart';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/pesanan')) return 'pesanan';
    if (pathname.startsWith('/profile') || pathname.startsWith('/profil')) return 'profile';
    if (pathname.startsWith('/sewa-alat')) return 'sewa-alat';
    if (pathname.startsWith('/toko') && !pathname.startsWith('/toko/mengikuti')) return 'toko';
    if (pathname === '/') return 'beranda';
    return activePage;
  }, [activePage, pathname]);

  const activeDesktopTab = optimisticTab || currentActive;

  const desktopNavItems = useMemo(
    () => [
      {
        key: 'toko',
        label: 'Toko Online',
        href: '/toko',
        icon: ShoppingBag,
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
      ...(user?.role === 'PETANI'
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
        href: user ? '/profile' : '/login',
        icon: UserIcon,
      },
    ],
    [user?.role, Boolean(user)]
  );

  const isToko = currentActive === 'toko';
  const isSewaAlat = currentActive === 'sewa-alat';

  // Measure active desktop nav link strictly along horizontal axis relative to navbar container
  useLayoutEffect(() => {
    const validKey = desktopNavItems.some((item) => item.key === activeDesktopTab)
      ? activeDesktopTab
      : null;

    if (!validKey) {
      setDesktopPillState(null);
      lastDesktopPill = null;
      initialDesktopPrevRef.current = null;
      prevDesktopTabRef.current = null;
      return;
    }

    const activeEl = desktopLinkRefs.current[validKey];
    if (!activeEl || activeEl.offsetWidth === 0) return;

    const target: DesktopPillMetrics = {
      x: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
    };

    const isInitialMountTab =
      prevDesktopTabRef.current === null || prevDesktopTabRef.current === validKey;

    if (isInitialMountTab) {
      if (initialDesktopPrevRef.current === undefined) {
        initialDesktopPrevRef.current = lastDesktopPill;
      }
      prevDesktopTabRef.current = validKey;

      const prev = initialDesktopPrevRef.current;
      const moved =
        prev !== null &&
        (Math.abs(prev.x - target.x) > 1 || Math.abs(prev.width - target.width) > 1);
      const shouldAnimate = moved && !prefersReducedMotion;

      setDesktopPillState({
        from: shouldAnimate ? prev : null,
        to: target,
        animate: shouldAnimate,
      });
    } else {
      prevDesktopTabRef.current = validKey;
      setDesktopPillState({
        from: null,
        to: target,
        animate: !prefersReducedMotion,
      });
    }

    lastDesktopPill = target;
  }, [activeDesktopTab, desktopNavItems, prefersReducedMotion]);

  // Keep desktop pill aligned on resize without wobble
  useEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      const validKey = desktopNavItems.some((item) => item.key === activeDesktopTab)
        ? activeDesktopTab
        : null;
      if (!validKey) return;
      const activeEl = desktopLinkRefs.current[validKey];
      if (!activeEl || activeEl.offsetWidth === 0) return;

      const target: DesktopPillMetrics = {
        x: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      };
      lastDesktopPill = target;
      setDesktopPillState({ from: null, to: target, animate: false });
    });

    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeDesktopTab, desktopNavItems]);

  // Snapshot live horizontal desktop pill position on unmount for smooth route continuity
  useLayoutEffect(() => {
    return () => {
      const nav = desktopNavRef.current;
      const pill = desktopPillRef.current;
      if (!nav || !pill) return;

      const navRect = nav.getBoundingClientRect();
      const pillRect = pill.getBoundingClientRect();
      if (navRect.width > 0 && pillRect.width > 0) {
        lastDesktopPill = {
          x: pillRect.left - navRect.left - nav.clientLeft,
          width: pillRect.width,
        };
      }
    };
  }, []);
  const shouldShowSubNav = showCatalogSubNav ?? (isToko || isSewaAlat);
  // Halaman katalog utama punya sidebar filter di desktop (lg+) yang menggantikan sub-navbar ini
  const hasCatalogSidebar = pathname === '/toko' || pathname === '/sewa-alat';
  const basePath = isSewaAlat ? '/sewa-alat' : '/toko';

  // Dynamic categories fetching if not supplied via props
  const [fetchedCategories, setFetchedCategories] = useState<SubCategoryItem[]>([]);

  useEffect(() => {
    if (categories && categories.length > 0) return;
    let isMounted = true;
    const endpoint = isSewaAlat
      ? '/api/equipment-categories?activeOnly=true'
      : isToko
      ? '/api/categories'
      : null;

    if (endpoint) {
      const cached = headerCategoriesCache[endpoint];
      if (cached && Date.now() - cached.at < HEADER_CATEGORIES_TTL_MS) {
        setFetchedCategories(cached.items);
        return () => {
          isMounted = false;
        };
      }

      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data?.categories && Array.isArray(data.categories)) {
            headerCategoriesCache[endpoint] = { items: data.categories, at: Date.now() };
            setFetchedCategories(data.categories);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isSewaAlat, isToko, categories]);

  const currentCategoryList = useMemo(() => {
    const list =
      categories && categories.length > 0
        ? categories
        : fetchedCategories && fetchedCategories.length > 0
        ? fetchedCategories
        : isToko
        ? DEFAULT_TOKO_CATEGORIES
        : [];
    return list.filter((c) => c.isActive !== false);
  }, [categories, fetchedCategories, isToko]);

  const handleSemua = () => {
    if (onSelectKategori) onSelectKategori('SEMUA');
    if (onSelectSort) onSelectSort('default');
    if (!onSelectKategori && !onSelectSort) {
      router.push(basePath);
    }
    setIsCategoryDropdownOpen(false);
  };

  const handleKategoriSelect = (catName: string) => {
    if (onSelectKategori) {
      onSelectKategori(catName);
    }
    if (onSelectSort) {
      onSelectSort('default');
    }
    if (!onSelectKategori && !onSelectSort) {
      router.push(catName === 'SEMUA' ? basePath : `${basePath}?kategori=${encodeURIComponent(catName)}`);
    }
    setIsCategoryDropdownOpen(false);
  };

  const handleSortSelect = (targetSort: string) => {
    const nextSort = sortBy === targetSort ? 'default' : targetSort;
    if (onSelectSort) {
      onSelectSort(nextSort);
    }
    if (onSelectKategori && nextSort !== 'default') {
      onSelectKategori('SEMUA');
    }
    if (!onSelectSort) {
      router.push(nextSort === 'default' ? basePath : `${basePath}?sortBy=${nextSort}`);
    }
    setIsCategoryDropdownOpen(false);
  };

  const isSemuaActive =
    (!selectedKategori || selectedKategori === 'SEMUA') &&
    (!sortBy || sortBy === 'default');
  const isKategoriActive =
    Boolean(selectedKategori && selectedKategori !== 'SEMUA') &&
    (!sortBy || sortBy === 'default');
  const isTerbaruActive = sortBy === 'terbaru';
  const isTerpopulerActive = sortBy === 'terpopuler';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#dce1d6] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 relative">
          {/* Left: Official Koperasi Full Logo (Matching Preloader & LandingHeader) */}
          <div className="flex items-center shrink-0 z-10">
            <Link
              href={user ? '/toko' : '/'}
              prefetch={true}
              className="flex items-center group focus:outline-none shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/images/landing/koperasi-full-dark.png"
                alt="Logo Koperasi Sinar Pagi Sejahtera"
                className="h-6 sm:h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-102"
              />
            </Link>
          </div>

          {/* Center: Desktop Navigation Links with Smooth Horizontal Sliding Active Pill */}
          <nav
            ref={desktopNavRef}
            aria-label="Navigasi Utama Desktop"
            className="hidden lg:flex items-center justify-center gap-1 p-1 rounded-full bg-[#f4f5f1] border border-[#dce1d6] text-xs font-semibold absolute left-1/2 -translate-x-1/2"
          >
            {desktopPillState && (
              <motion.div
                ref={desktopPillRef}
                aria-hidden="true"
                initial={
                  desktopPillState.from
                    ? { x: desktopPillState.from.x, width: desktopPillState.from.width }
                    : false
                }
                animate={{
                  x: desktopPillState.to.x,
                  width: desktopPillState.to.width,
                }}
                transition={
                  desktopPillState.animate && !prefersReducedMotion
                    ? { type: 'spring', stiffness: 450, damping: 35 }
                    : { duration: 0 }
                }
                className="pointer-events-none absolute left-0 top-1 bottom-1 bg-[#233414] rounded-full shadow-xs z-0"
              />
            )}

            {desktopNavItems.map((item) => {
              const isItemActive = activeDesktopTab === item.key;
              const Icon = item.icon;

              return (
                <Link
                  key={item.key}
                  ref={(el) => {
                    desktopLinkRefs.current[item.key] = el;
                  }}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setOptimisticTab(item.key)}
                  aria-current={isItemActive ? 'page' : undefined}
                  className={`group relative z-10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 select-none cursor-pointer focus:outline-none transition-colors duration-200 ${
                    !isItemActive ? 'hover:bg-[#EAEDE7]/70' : ''
                  }`}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors duration-200 shrink-0 ${
                        isItemActive
                          ? 'text-[#D4F63D] stroke-[2.2]'
                          : 'text-[#526046] group-hover:text-[#1a2610] stroke-[1.8]'
                      }`}
                    />
                    <span
                      className={`transition-colors duration-200 whitespace-nowrap ${
                        isItemActive
                          ? 'text-white font-semibold'
                          : 'text-[#344d15] group-hover:text-[#1a2610]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Pencarian, Keranjang Belanja & Profil Dropdown */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            {!user && (
              <>
                <NotificationDropdown />
                <Link
                  href="/cart"
                  prefetch={true}
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
                    currentActive === 'cart'
                      ? 'bg-[#233414] text-[#D4F63D] border-[#233414]'
                      : 'bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#233414] border-[#d5dccf]'
                  }`}
                  title="Keranjang Belanja"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Link>
              </>
            )}

            {user ? (
              <UserProfileDropdown />
            ) : (
              <Link
                href="/login"
                className="text-xs font-semibold bg-[#233414] hover:bg-[#344d15] text-white px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-[#D4F63D]" />
                <span>Masuk</span>
              </Link>
            )}
          </div>
        </div>

        {/* Sub-navbar Mode Desktop Saja (Khusus Toko atau Sewa Alat) */}
        {shouldShowSubNav && (
          <div className={`hidden md:block ${hasCatalogSidebar ? 'lg:hidden' : ''} border-t border-[#EAEDE7] bg-white`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-start gap-8 text-[13px]">
              {/* 1. Semua */}
              <button
                type="button"
                onClick={handleSemua}
                className={`h-10 flex items-center transition-colors duration-150 cursor-pointer select-none relative ${
                  isSemuaActive
                    ? 'text-[#1a2610] font-semibold'
                    : 'text-[#526046] hover:text-[#1a2610] font-medium'
                }`}
              >
                <span>Semua</span>
                {isSemuaActive && (
                  <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#1a2610] rounded-full" />
                )}
              </button>

              {/* 2. Kategori (with Minimalist Taste Skills Dropdown) */}
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                  className={`h-10 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer select-none relative ${
                    isKategoriActive
                      ? 'text-[#1a2610] font-semibold'
                      : 'text-[#526046] hover:text-[#1a2610] font-medium'
                  }`}
                >
                  <span>
                    {isKategoriActive
                      ? `Kategori: ${selectedKategori}`
                      : 'Kategori'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 stroke-[1.8] transition-transform duration-200 ${
                      isCategoryDropdownOpen ? 'rotate-180 text-[#1a2610]' : 'text-[#708063]'
                    }`}
                  />
                  {isKategoriActive && (
                    <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#1a2610] rounded-full" />
                  )}
                </button>

                <AnimatePresence>
                  {isCategoryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-xl border border-[#e2e7dc] shadow-[0_12px_28px_rgba(26,38,16,0.12)] p-1 z-50 origin-top-left"
                    >
                      {/* All Option */}
                      <button
                        type="button"
                        onClick={() => handleKategoriSelect('SEMUA')}
                        className={`group w-full px-3 py-2 rounded-lg text-[13px] transition-colors flex items-center justify-between cursor-pointer ${
                          !selectedKategori || selectedKategori === 'SEMUA'
                            ? 'bg-[#eef1e8]/70 text-[#1a2610] font-semibold'
                            : 'text-[#415036] hover:bg-[#f6f8f4] hover:text-[#1a2610] font-medium'
                        }`}
                      >
                        <span className="truncate">Semua</span>
                        {(!selectedKategori || selectedKategori === 'SEMUA') && (
                          <Check className="w-3.5 h-3.5 text-[#233414] stroke-[2.2] shrink-0" />
                        )}
                      </button>

                      <div className="my-1 border-t border-[#eaede7]" />

                      {/* Category List with Clean Typographic Alignment (Tanpa Titik Active) */}
                      <div className="max-h-60 overflow-y-auto no-scrollbar space-y-0.5">
                        {currentCategoryList.map((cat) => {
                          const isSelected = selectedKategori?.toLowerCase() === cat.name.toLowerCase();
                          return (
                            <button
                              key={cat.id || cat.name}
                              type="button"
                              onClick={() => handleKategoriSelect(cat.name)}
                              className={`group w-full px-3 py-2 rounded-lg text-[13px] transition-colors flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-[#eef1e8]/70 text-[#1a2610] font-semibold'
                                  : 'text-[#415036] hover:bg-[#f6f8f4] hover:text-[#1a2610] font-medium'
                              }`}
                            >
                              <span className="truncate">{cat.name}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-[#233414] stroke-[2.2] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. Terbaru */}
              <button
                type="button"
                onClick={() => handleSortSelect('terbaru')}
                className={`h-10 flex items-center transition-colors duration-150 cursor-pointer select-none relative ${
                  isTerbaruActive
                    ? 'text-[#1a2610] font-semibold'
                    : 'text-[#526046] hover:text-[#1a2610] font-medium'
                }`}
              >
                <span>Terbaru</span>
                {isTerbaruActive && (
                  <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#1a2610] rounded-full" />
                )}
              </button>

              {/* 4. Terpopuler */}
              <button
                type="button"
                onClick={() => handleSortSelect('terpopuler')}
                className={`h-10 flex items-center transition-colors duration-150 cursor-pointer select-none relative ${
                  isTerpopulerActive
                    ? 'text-[#1a2610] font-semibold'
                    : 'text-[#526046] hover:text-[#1a2610] font-medium'
                }`}
              >
                <span>Terpopuler</span>
                {isTerpopulerActive && (
                  <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#1a2610] rounded-full" />
                )}
              </button>
            </div>
          </div>
        )}
      </header>
      {/* Spacer placeholder to reserve exact height for fixed header (56px mobile, 64px desktop default, 105px when desktop sub-navbar is rendered) */}
      <div
        className={`${
          shouldShowSubNav
            ? `h-14 sm:h-16 md:h-[105px] ${hasCatalogSidebar ? 'lg:h-16' : ''}`
            : 'h-14 sm:h-16'
        } shrink-0 pointer-events-none`}
        aria-hidden="true"
      />
    </>
  );
}
