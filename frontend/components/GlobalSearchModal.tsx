'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  Store,
  Tractor,
  User as UserIcon,
  CheckCircle2,
  ArrowRight,
  Loader2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FlattenedSearchItem {
  id: string;
  type: 'user' | 'product' | 'equipment' | 'query';
  title: string;
  subtitle?: string;
  extra?: string;
  badge?: string;
  verified?: boolean;
  imageUrl?: string;
  url: string;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    products: any[];
    equipments: any[];
    users: any[];
  }>({
    products: [],
    equipments: [],
    users: [],
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Focus input saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults({ products: [], equipments: [], users: [] });
      setHasSearched(false);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Debounced live search ke API
  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], equipments: [], users: [] });
      setHasSearched(false);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=5`);
        const data = await res.json();
        if (res.ok && data.results) {
          setResults(data.results);
          setHasSearched(true);
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

  // Flattened item list untuk navigasi keyboard (Gambar 3 style)
  const flattenedItems: FlattenedSearchItem[] = useMemo(() => {
    const list: FlattenedSearchItem[] = [];

    // 1. Akun Petani & Pembeli (Tampil dengan foto profil seperti Gambar 3)
    results.users.forEach((u) => {
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

    // 2. Query Suggestion (seperti di Tokopedia Gambar 3: icon search + keyword)
    if (query.trim().length > 0) {
      list.push({
        id: `query-${query.trim()}`,
        type: 'query',
        title: query.trim(),
        subtitle: `Cari "${query.trim()}" di semua etalase`,
        url: `/search?q=${encodeURIComponent(query.trim())}`,
      });
    }

    // 3. Komoditas Toko Online
    results.products.forEach((p) => {
      list.push({
        id: `prod-${p.id}`,
        type: 'product',
        title: p.nama,
        subtitle: `Rp ${Number(p.hargaPerSatuan).toLocaleString('id-ID')} / ${p.satuan}`,
        extra: p.kategori,
        imageUrl: p.imageUrl || undefined,
        url: `/toko/${p.id}`,
      });
    });

    // 4. Sewa Alat Pertanian (Alsintan)
    results.equipments.forEach((e) => {
      list.push({
        id: `equip-${e.id}`,
        type: 'equipment',
        title: e.nama,
        subtitle: `Rp ${Number(e.hargaSewa).toLocaleString('id-ID')} / ${e.satuanSewa}`,
        extra: e.kategori,
        imageUrl: e.imageUrl || undefined,
        url: `/sewa-alat`,
      });
    });

    return list;
  }, [results, query]);

  // Menangani submit pencarian menuju halaman /search?q=...
  const handleGoToSearchPage = useCallback(
    (customQuery?: string) => {
      const q = customQuery !== undefined ? customQuery : query;
      if (!q.trim()) return;
      onClose();
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    },
    [query, onClose, router]
  );

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

  const totalResults =
    results.products.length + results.equipments.length + results.users.length;
  const isNoResults = hasSearched && !isLoading && query.trim().length > 0 && totalResults === 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar (Persis Gambar 1: Purple Ring Focus) */}
        <div className="p-3 sm:p-4 bg-white relative">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 flex items-center pointer-events-none">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-slate-700 stroke-[2.2]" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari toko online, sewa alat, akun petani/pembeli..."
              className="w-full pl-11 pr-11 py-3 text-sm sm:text-base font-medium text-slate-900 bg-white border-2 border-purple-400 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 rounded-2xl outline-none transition-all placeholder:text-slate-400 shadow-xs"
            />

            {query.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-600 hover:bg-slate-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Search Content Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100">
          {/* 1. STATE KOSONG / BELUM MENGETIK */}
          {!hasSearched && query.trim().length === 0 && (
            <div className="py-6 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-2xs border border-emerald-100">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                Cari Apapun di Ekosistem Koperasi
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Ketik nama komoditas panen, jenis alat alsintan yang ingin disewa, atau nama akun petani & pembeli.
              </p>

              {/* Rekomendasi Populer */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium">Populer:</span>
                {['Jagung', 'Kelapa', 'Traktor', 'Lionel Kisra'].map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      setQuery(keyword);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 rounded-lg transition cursor-pointer"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. STATE TIDAK DITEMUKAN (Persis Desain Radar Gambar 1) */}
          {isNoResults && (
            <div className="py-10 sm:py-12 px-4 text-center flex flex-col items-center justify-center">
              {/* Concentric Radar Rings Circle Icon (Mirip Gambar 1) */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-full border border-slate-100 animate-pulse pointer-events-none" />
                <div className="absolute inset-4 rounded-full border border-slate-200/60 pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-slate-200 pointer-events-none" />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-400 relative z-10">
                  <Search className="w-6 h-6 text-slate-400 stroke-[2.2]" />
                </div>
              </div>

              <h4 className="text-base sm:text-lg font-bold text-slate-900">
                No results found
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mt-1 mb-5">
                Your search did not match any results. Please try again.
              </p>

              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs cursor-pointer hover:border-slate-400 active:scale-95"
              >
                Clear search
              </button>
            </div>
          )}

          {/* 3. HASIL PENCARIAN (Gaya Tokopedia Gambar 3) */}
          {totalResults > 0 && (
            <div className="space-y-3 p-1">
              {/* Grup Akun (Petani Mitra & Anggota) - Tampil dengan Foto Profil seperti Gambar 3 */}
              {results.users.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Akun (Petani / Pembeli)</span>
                    <span>{results.users.length} akun</span>
                  </div>

                  <div className="space-y-1 mt-1">
                    {results.users.map((userItem) => {
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
                          onClick={onClose}
                          className={`p-2 sm:p-2.5 rounded-2xl transition flex items-center justify-between group cursor-pointer border ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-300 shadow-2xs'
                              : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Foto Profil / Avatar Akun */}
                            <Avatar className="w-10 h-10 rounded-full border-2 border-white shadow-2xs shrink-0 ring-1 ring-slate-100">
                              <AvatarImage src={userItem.avatarUrl || ''} alt={userItem.name} className="object-cover" />
                              <AvatarFallback className="bg-emerald-700 text-white font-bold text-xs">
                                {userItem.name ? userItem.name.slice(0, 2).toUpperCase() : 'U'}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate">
                                  {userItem.name}
                                </span>
                                {userItem.isVerified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white shrink-0" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500">
                                <span className="font-semibold text-emerald-700">
                                  {userItem.role === 'PETANI' ? 'Petani Mitra' : 'Anggota Pembeli'}
                                </span>
                                {userItem.address && (
                                  <>
                                    <span className="text-slate-300">&bull;</span>
                                    <span className="truncate max-w-[140px] flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5 text-slate-400 inline shrink-0" />
                                      {userItem.address}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                            <span>Buka Profil</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Saran Query Pencarian Cepat (Persis Gambar 3 Tokopedia) */}
              {query.trim().length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  {(() => {
                    const queryItemIndex = flattenedItems.findIndex((it) => it.id === `query-${query.trim()}`);
                    const isSelected = queryItemIndex === selectedIndex;

                    return (
                      <button
                        type="button"
                        onClick={() => handleGoToSearchPage()}
                        className={`w-full p-2.5 rounded-2xl transition flex items-center justify-between group cursor-pointer text-left border ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-300 shadow-2xs'
                            : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-emerald-700 shrink-0">
                            <Search className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                              {query.trim()}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-400">
                              Lihat semua hasil pencarian &quot;{query.trim()}&quot;
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* Grup Toko Online (Komoditas Panen) */}
              {results.products.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="px-2 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Komoditas Toko Online</span>
                    <span>{results.products.length} produk</span>
                  </div>

                  <div className="space-y-1 mt-1">
                    {results.products.map((product) => {
                      const itemIndex = flattenedItems.findIndex((it) => it.id === `prod-${product.id}`);
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <Link
                          key={product.id}
                          href={`/toko/${product.id}`}
                          onClick={onClose}
                          className={`p-2 sm:p-2.5 rounded-2xl transition flex items-center justify-between group cursor-pointer border ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-300 shadow-2xs'
                              : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.nama} className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate block">
                                {product.nama}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500">
                                <span className="font-bold text-emerald-800">
                                  Rp {product.hargaPerSatuan?.toLocaleString('id-ID')} / {product.satuan}
                                </span>
                                <span className="text-slate-300">&bull;</span>
                                <span className="text-slate-400">{product.kategori}</span>
                                {product.petani?.name && (
                                  <>
                                    <span className="text-slate-300">&bull;</span>
                                    <span className="text-slate-500 truncate">Oleh {product.petani.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                            <span>Lihat Produk</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grup Sewa Alat (Alsintan) */}
              {results.equipments.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="px-2 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Sewa Alat Pertanian (Alsintan)</span>
                    <span>{results.equipments.length} alat</span>
                  </div>

                  <div className="space-y-1 mt-1">
                    {results.equipments.map((item) => {
                      const itemIndex = flattenedItems.findIndex((it) => it.id === `equip-${item.id}`);
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <Link
                          key={item.id}
                          href="/sewa-alat"
                          onClick={onClose}
                          className={`p-2 sm:p-2.5 rounded-2xl transition flex items-center justify-between group cursor-pointer border ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-300 shadow-2xs'
                              : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.nama} className="w-full h-full object-cover" />
                              ) : (
                                <Tractor className="w-5 h-5 text-amber-700" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate block">
                                {item.nama}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500">
                                <span className="font-bold text-amber-800">
                                  Rp {item.hargaSewa?.toLocaleString('id-ID')} / {item.satuanSewa}
                                </span>
                                <span className="text-slate-300">&bull;</span>
                                <span className="text-slate-400">{item.kategori}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-amber-800 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                            <span>Sewa Alat</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Shortcuts (Persis Gambar 1: navigate, select, close) */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md font-mono text-slate-600 shadow-2xs">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md font-mono text-slate-600 shadow-2xs">
                ↓
              </kbd>
              <span>navigate</span>
            </span>

            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md font-mono text-slate-600 shadow-2xs">
                ↵
              </kbd>
              <span>select</span>
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md font-mono text-slate-600 shadow-2xs">
                esc
              </kbd>
              <span>close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
