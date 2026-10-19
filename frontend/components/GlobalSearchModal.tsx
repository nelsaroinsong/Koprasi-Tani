'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FlattenedSearchItem {
  id: string;
  type: 'user' | 'query';
  title: string;
  subtitle?: string;
  extra?: string;
  verified?: boolean;
  imageUrl?: string;
  url: string;
}

const SEARCH_HISTORY_KEY = 'koperasi_search_history';

function getStoredSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveStoredSearchHistory(term: string) {
  if (typeof window === 'undefined' || !term.trim()) return;
  try {
    const existing = getStoredSearchHistory().filter(
      (item) => item.toLowerCase() !== term.trim().toLowerCase()
    );
    const updated = [term.trim(), ...existing].slice(0, 8);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Load search history, popular searches riil dari API, dan focus input saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSearchHistory(getStoredSearchHistory());

      // Ambil data pencarian populer riil (berdasarkan seberapa sering dicari)
      fetch('/api/search/popular')
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.terms)) {
            setPopularSearches(data.terms);
          } else {
            setPopularSearches([]);
          }
        })
        .catch(() => {
          setPopularSearches([]);
        });

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setUsers([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Debounced live search ke API
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=6`);
        const data = await res.json();
        if (res.ok && data.results) {
          // Filter ketat memastikan TIDAK PERNAH memuat akun admin
          const safe = (data.results.users || []).filter(
            (u: any) =>
              u.role !== 'ADMIN' &&
              !u.name?.toLowerCase().includes('admin') &&
              !u.email?.toLowerCase().includes('admin')
          );
          setUsers(safe);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Error saat live search:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter ketat pengguna non-admin dan hanya cocok berdasarkan NAMA
  const safeUsers = useMemo(() => {
    const qLower = query.toLowerCase().trim();
    return (users || []).filter(
      (u: any) =>
        u.role !== 'ADMIN' &&
        !u.name?.toLowerCase().includes('admin') &&
        !u.email?.toLowerCase().includes('admin') &&
        (!qLower || u.name?.toLowerCase().includes(qLower))
    );
  }, [users, query]);

  // Saran kata kunci populer yang cocok dengan huruf yang diketik
  const matchingPopularSuggestions = useMemo(() => {
    const qLower = query.toLowerCase().trim();
    if (!qLower || popularSearches.length === 0) return [];
    return popularSearches.filter(
      (term) =>
        term.toLowerCase().includes(qLower) &&
        term.toLowerCase() !== qLower
    ).slice(0, 3);
  }, [query, popularSearches]);

  // Flattened item list untuk navigasi keyboard
  const flattenedItems: FlattenedSearchItem[] = useMemo(() => {
    const list: FlattenedSearchItem[] = [];

    if (query.trim().length > 0) {
      // 1. Query Utama
      list.push({
        id: `query-primary`,
        type: 'query',
        title: query.trim(),
        url: `/search?q=${encodeURIComponent(query.trim())}`,
      });

      // 2. Saran Populer yang Cocok
      matchingPopularSuggestions.forEach((term) => {
        list.push({
          id: `query-pop-${term}`,
          type: 'query',
          title: term,
          url: `/search?q=${encodeURIComponent(term)}`,
        });
      });

      // 3. Akun Petani & Pembeli yang Cocok
      safeUsers.forEach((u) => {
        list.push({
          id: `user-${u.id}`,
          type: 'user',
          title: u.name,
          subtitle: u.role === 'PETANI' ? 'Petani Mitra' : 'Anggota Pembeli',
          extra: u.address || undefined,
          verified: !!u.isVerified,
          imageUrl: u.avatarUrl || undefined,
          url: u.role === 'PETANI' ? `/toko/petani/${u.id}` : `/profile`,
        });
      });
    } else {
      // Saat belum mengetik: item riwayat + item populer riil
      searchHistory.forEach((h) => {
        list.push({
          id: `hist-${h}`,
          type: 'query',
          title: h,
          url: `/search?q=${encodeURIComponent(h)}`,
        });
      });

      popularSearches.forEach((p) => {
        list.push({
          id: `pop-${p}`,
          type: 'query',
          title: p,
          url: `/search?q=${encodeURIComponent(p)}`,
        });
      });
    }

    return list;
  }, [safeUsers, query, matchingPopularSuggestions, searchHistory, popularSearches]);

  // Menangani submit pencarian menuju halaman /search?q=... dan menyimpan ke history serta mencatat frekuensi
  const handleGoToSearchPage = useCallback(
    (customQuery?: string) => {
      const q = customQuery !== undefined ? customQuery : query;
      if (!q.trim()) return;
      saveStoredSearchHistory(q.trim());
      setSearchHistory(getStoredSearchHistory());

      // Catat pencarian ke API untuk mengukur kepopuleran
      fetch('/api/search/popular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim() }),
      }).catch(() => {});

      onClose();
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    },
    [query, onClose, router]
  );

  // Hapus satu item dari search history
  const handleRemoveHistoryItem = (itemToRemove: string) => {
    const updated = searchHistory.filter((item) => item !== itemToRemove);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
    setSearchHistory(updated);
  };

  // Tangani shortcut keyboard ESC & navigasi atas/bawah
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (flattenedItems.length === 0) return -1;
          return prev < flattenedItems.length - 1 ? prev + 1 : 0;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (flattenedItems.length === 0) return -1;
          return prev > 0 ? prev - 1 : flattenedItems.length - 1;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && flattenedItems[selectedIndex]) {
          const item = flattenedItems[selectedIndex];
          if (item.type === 'query') {
            saveStoredSearchHistory(item.title);
          }
          onClose();
          router.push(item.url);
        } else {
          handleGoToSearchPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleGoToSearchPage, selectedIndex, flattenedItems, router]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1a2610]/60 backdrop-blur-xs flex items-start justify-center p-2.5 sm:p-6 pt-5 sm:pt-16 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg sm:max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#dce1d6] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-2.5 sm:p-4 bg-white relative border-b border-[#EAEDE7]">
          <div className="relative flex items-center">
            {/* Search Icon / Loader */}
            <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-[#526046] flex items-center pointer-events-none z-10">
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#233414] animate-spin" />
              ) : (
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#233414] stroke-[2.2]" />
              )}
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari di Koperasi Sinar Pagi Sejahtera..."
              style={{
                paddingLeft: '2.85rem',
                paddingRight: '2.6rem',
              }}
              className="w-full py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-medium text-[#1a2610] bg-white border-2 border-[#233414] hover:border-[#344d15] focus:border-[#233414] focus:ring-4 focus:ring-[#233414]/15 rounded-xl sm:rounded-2xl outline-none transition-all placeholder:text-[#5b6950] placeholder:text-xs sm:placeholder:text-sm"
            />

            {/* Clear Button (X) */}
            {query.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#233414] hover:bg-[#344d15] text-white flex items-center justify-center transition cursor-pointer z-10"
                title="Hapus pencarian"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Search Content Body */}
        <div className="max-h-[70vh] sm:max-h-[60vh] overflow-y-auto p-1.5 sm:p-2 divide-y divide-[#EAEDE7]">
          {/* 1. STATE BELUM MENGETIK: RIWAYAT PENCARIAN & PENCARIAN POPULER */}
          {query.trim().length === 0 && (
            <div className="space-y-0.5">
              {/* Item Riwayat Terakhir */}
              {searchHistory.map((histItem) => {
                const itemIndex = flattenedItems.findIndex((it) => it.id === `hist-${histItem}`);
                const isSelected = itemIndex === selectedIndex;

                return (
                  <div
                    key={histItem}
                    onClick={() => handleGoToSearchPage(histItem)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#e2f2c8]/70 text-[#1a2610]'
                        : 'hover:bg-[#f4f5f1] text-[#1a2610]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Clock className="w-4 h-4 text-[#5b6950] group-hover:text-[#233414] transition shrink-0" />
                      <span className="text-xs sm:text-sm font-medium group-hover:text-[#344d15] truncate transition">
                        {histItem}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveHistoryItem(histItem);
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[#5b6950] hover:text-[#1a2610] hover:bg-[#EAEDE7] transition cursor-pointer shrink-0 ml-2"
                      title="Hapus riwayat"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>
                );
              })}

              {/* Item Pencarian Populer / Trending Riil */}
              {popularSearches.length > 0 &&
                popularSearches.map((popItem) => {
                  const itemIndex = flattenedItems.findIndex((it) => it.id === `pop-${popItem}`);
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <div
                      key={popItem}
                      onClick={() => handleGoToSearchPage(popItem)}
                      className={`group flex items-center px-3 py-2.5 rounded-xl transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#e2f2c8]/70 text-[#1a2610]'
                          : 'hover:bg-[#f4f5f1] text-[#1a2610]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <TrendingUp className="w-4 h-4 text-[#5b6950] group-hover:text-[#233414] transition shrink-0" />
                        <span className="text-xs sm:text-sm font-medium group-hover:text-[#344d15] truncate transition">
                          {popItem}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* 2. STATE SEDANG MENGETIK: DAFTAR QUERY & AKUN */}
          {query.trim().length > 0 && (
            <div className="space-y-0.5">
              {/* Query Utama yang Sedang Diketik */}
              {(() => {
                const itemIndex = flattenedItems.findIndex((it) => it.id === 'query-primary');
                const isSelected = itemIndex === selectedIndex;

                return (
                  <div
                    onClick={() => handleGoToSearchPage(query)}
                    className={`group flex items-center px-3 py-2.5 rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#e2f2c8]/70 text-[#1a2610]'
                        : 'hover:bg-[#f4f5f1] text-[#1a2610]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Search className="w-4 h-4 text-[#5b6950] group-hover:text-[#233414] transition shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold group-hover:text-[#344d15] truncate transition">
                        {query.trim()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Saran Kata Kunci Populer Riil yang Cocok */}
              {matchingPopularSuggestions.map((term) => {
                const itemIndex = flattenedItems.findIndex((it) => it.id === `query-pop-${term}`);
                const isSelected = itemIndex === selectedIndex;

                return (
                  <div
                    key={term}
                    onClick={() => handleGoToSearchPage(term)}
                    className={`group flex items-center px-3 py-2.5 rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#e2f2c8]/70 text-[#1a2610]'
                        : 'hover:bg-[#f4f5f1] text-[#1a2610]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Search className="w-4 h-4 text-[#5b6950] group-hover:text-[#233414] transition shrink-0" />
                      <span className="text-xs sm:text-sm font-medium group-hover:text-[#344d15] truncate transition">
                        {term}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Daftar Akun Toko/Petani yang Cocok */}
              {safeUsers.map((userItem) => {
                const itemIndex = flattenedItems.findIndex((it) => it.id === `user-${userItem.id}`);
                const isSelected = itemIndex === selectedIndex;

                return (
                  <Link
                    key={userItem.id}
                    href={
                      userItem.role === 'PETANI'
                        ? `/toko/petani/${userItem.id}`
                        : `/profile`
                    }
                    prefetch={true}
                    onMouseEnter={() => {
                      if (userItem.role === 'PETANI') {
                        router.prefetch(`/toko/petani/${userItem.id}`);
                        fetch(`/api/petani/${userItem.id}`).catch(() => {});
                      }
                    }}
                    onClick={() => {
                      saveStoredSearchHistory(userItem.name);
                      onClose();
                    }}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#e2f2c8]/70'
                        : 'hover:bg-[#f4f5f1]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Bulat Akun */}
                      <Avatar className="w-9 h-9 rounded-full border border-[#cfd6c9] shrink-0">
                        <AvatarImage src={userItem.avatarUrl || ''} alt={userItem.name} className="object-cover" />
                        <AvatarFallback className="bg-[#233414] text-[#D4F63D] font-bold text-xs">
                          {userItem.name ? userItem.name.slice(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] transition truncate">
                            {userItem.name}
                          </span>
                          {userItem.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#344d15] fill-[#e2f2c8] shrink-0" />
                          )}
                        </div>

                        <div className="text-[11px] text-[#5b6950] truncate mt-0.5">
                          {userItem.address ? userItem.address : (userItem.role === 'PETANI' ? 'Petani Mitra' : 'Anggota Pembeli')}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-[#233414] opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
