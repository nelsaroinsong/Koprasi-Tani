'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
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
  SlidersHorizontal,
  ChevronRight,
  Tag,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ActiveTab = 'all' | 'products' | 'equipments' | 'users';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'all';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<{
    products: any[];
    equipments: any[];
    users: any[];
    counts: {
      products: number;
      equipments: number;
      users: number;
      total: number;
    };
  }>({
    products: [],
    equipments: [],
    users: [],
    counts: { products: 0, equipments: 0, users: 0, total: 0 },
  });

  // Sync state dengan query string di URL jika berubah
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchTerm(q);
    const tab = (searchParams.get('tab') as ActiveTab) || 'all';
    setActiveTab(tab);
  }, [searchParams]);

  // Fetch hasil pencarian
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (!q.trim()) {
      setData({
        products: [],
        equipments: [],
        users: [],
        counts: { products: 0, equipments: 0, users: 0, total: 0 },
      });
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=20`)
      .then((res) => res.json())
      .then((resData) => {
        if (isMounted && resData.results) {
          const safeUsers = (resData.results.users || []).filter(
            (u: any) =>
              u.role !== 'ADMIN' &&
              !u.name?.toLowerCase().includes('admin') &&
              !u.email?.toLowerCase().includes('admin')
          );
          setData({
            products: resData.results.products || [],
            equipments: resData.results.equipments || [],
            users: safeUsers,
            counts: {
              products: resData.results.products?.length || 0,
              equipments: resData.results.equipments?.length || 0,
              users: safeUsers.length,
              total:
                (resData.results.products?.length || 0) +
                (resData.results.equipments?.length || 0) +
                safeUsers.length,
            },
          });
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil data pencarian:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Handle submit form pencarian baru
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}&tab=${activeTab}`);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const currentQ = searchParams.get('q') || '';
    if (currentQ) {
      router.push(`/search?q=${encodeURIComponent(currentQ)}&tab=${tab}`);
    }
  };

  const currentQuery = searchParams.get('q') || '';
  const totalCount = data.counts.total;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      <AppHeader />

      {/* Header Banner Pencarian */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-3xl">
            {/* Breadcrumb sederhana */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <Link href="/" className="hover:text-emerald-700 transition">
                Beranda
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-800 font-semibold">Pencarian</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {currentQuery ? (
                <>
                  Hasil pencarian untuk{' '}
                  <span className="text-emerald-700">&quot;{currentQuery}&quot;</span>
                </>
              ) : (
                'Pencarian Ekosistem Koperasi'
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Temukan komoditas panen petani lokal, penyewaan alsintan modern, atau akun mitra koperasi.
            </p>
          </div>

          {/* Tab Filter Navigasi */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-5 border-t border-slate-100 no-scrollbar">
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Semua</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'all' ? 'bg-emerald-800 text-emerald-100' : 'bg-white text-slate-600'
                }`}
              >
                {data.counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('products')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Toko Online</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'products' ? 'bg-emerald-800 text-emerald-100' : 'bg-white text-slate-600'
                }`}
              >
                {data.counts.products}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('equipments')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'equipments'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Tractor className="w-3.5 h-3.5" />
              <span>Sewa Alat</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'equipments' ? 'bg-emerald-800 text-emerald-100' : 'bg-white text-slate-600'
                }`}
              >
                {data.counts.equipments}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('users')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Akun & Petani</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'users' ? 'bg-emerald-800 text-emerald-100' : 'bg-white text-slate-600'
                }`}
              >
                {data.counts.users}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Konten Hasil */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">Loading...</span>
          </div>
        )}

        {/* Belum Ada Input Pencarian */}
        {!isLoading && !currentQuery && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-14 text-center max-w-lg mx-auto shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Mulai Pencarian Terpadu
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              Ketik kata kunci pada form di atas untuk menelusuri hasil komoditas, sewa alat, dan profil pengguna.
            </p>
          </div>
        )}

        {/* State Tidak Ditemukan (Radar Concentric Rings Mirip Gambar 1) */}
        {!isLoading && currentQuery && totalCount === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-14 text-center max-w-lg mx-auto shadow-2xs">
            <div className="relative w-32 h-32 flex items-center justify-center mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border border-slate-100 animate-pulse pointer-events-none" />
              <div className="absolute inset-4 rounded-full border border-slate-200/60 pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-slate-200 pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-400 relative z-10">
                <Search className="w-6 h-6 text-slate-400 stroke-[2.2]" />
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              No results found
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5 max-w-xs mx-auto">
              Pencarian untuk &quot;{currentQuery}&quot; tidak menemukan hasil. Periksa ejaan atau gunakan kata kunci lain.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                router.push('/search');
              }}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs cursor-pointer hover:border-slate-400"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Tampilan Hasil Pencarian */}
        {!isLoading && currentQuery && totalCount > 0 && (
          <div className="space-y-8">
            {/* 1. SEKSI AKUN & PETANI (Muncul jika Tab = 'all' atau 'users') */}
            {(activeTab === 'all' || activeTab === 'users') && data.users.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-emerald-700" />
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Akun & Petani Mitra ({data.users.length})
                    </h2>
                  </div>
                  {activeTab === 'all' && data.users.length > 3 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('users')}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                    >
                      <span>Lihat Semua Akun</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {data.users.map((u) => (
                    <Link
                      key={u.id}
                      href={u.role === 'PETANI' ? `/toko/petani/${u.id}` : `/profile`}
                      className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar Profil Akun */}
                        <Avatar className="w-12 h-12 rounded-full border-2 border-white shadow-2xs shrink-0 ring-1 ring-slate-100">
                          <AvatarImage src={u.avatarUrl || ''} alt={u.name} className="object-cover" />
                          <AvatarFallback className="bg-emerald-700 text-white font-bold text-sm">
                            {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate">
                              {u.name}
                            </span>
                            {u.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                u.role === 'PETANI'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200/60'
                              }`}
                            >
                              {u.role === 'PETANI' ? 'Petani Mitra' : 'Anggota Pembeli'}
                            </span>
                          </div>

                          {u.address && (
                            <div className="text-[11px] text-slate-400 mt-1 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{u.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-700 flex items-center justify-center transition shrink-0 ml-2">
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SEKSI KOMODITAS TOKO ONLINE (Muncul jika Tab = 'all' atau 'products') */}
            {(activeTab === 'all' || activeTab === 'products') && data.products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-700" />
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Komoditas Toko Online ({data.products.length})
                    </h2>
                  </div>
                  {activeTab === 'all' && data.products.length > 6 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('products')}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                    >
                      <span>Lihat Semua Produk</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {data.products.map((prod) => {
                    const isOutOfStock =
                      !prod.isTersedia || Number(prod.stok || 0) <= 0;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          if (isOutOfStock) return;
                          router.push(`/toko/${prod.id}`);
                        }}
                        className={`border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between h-full ${
                          isOutOfStock
                            ? 'bg-slate-100/90 border-slate-300/80 opacity-75 cursor-not-allowed shadow-none'
                            : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer group'
                        }`}
                      >
                        <div>
                          {/* Product Image 1:1 Aspect Ratio */}
                          <div className="relative aspect-square w-full shrink-0 bg-slate-100 overflow-hidden">
                            <img
                              src={
                                prod.imageUrl ||
                                'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                              }
                              alt={prod.nama}
                              className={`w-full h-full object-cover transition-transform duration-300 ${
                                isOutOfStock
                                  ? 'grayscale contrast-90'
                                  : 'group-hover:scale-105'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            {isOutOfStock && (
                              <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-xs text-rose-700 border border-rose-200 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 z-10">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Stok Habis</span>
                              </div>
                            )}
                            <div className="absolute bottom-1.5 left-1.5 bg-emerald-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs max-w-[80%] truncate z-10">
                              {prod.kategori}
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="p-2.5 sm:p-3 flex flex-col justify-between gap-1">
                            <h3
                              className={`text-xs font-semibold tracking-tight leading-tight line-clamp-2 h-[2.6em] transition-colors ${
                                isOutOfStock
                                  ? 'text-slate-500'
                                  : 'text-slate-800 group-hover:text-emerald-700'
                              }`}
                              title={prod.nama}
                            >
                              {prod.nama}
                            </h3>

                            {prod.petani?.name && (
                              <div className="text-[10px] text-slate-400 truncate">
                                Oleh {prod.petani.name}
                              </div>
                            )}

                            <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-1">
                              Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                              <span className="text-[10px] font-normal text-slate-500"> / {prod.satuan}</span>
                            </div>

                            {isOutOfStock && (
                              <div className="text-[10px] font-bold text-rose-600 mt-0.5">
                                Stok Habis (0)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. SEKSI SEWA ALAT (Muncul jika Tab = 'all' atau 'equipments') */}
            {(activeTab === 'all' || activeTab === 'equipments') && data.equipments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Tractor className="w-4 h-4 text-amber-700" />
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Sewa Alat Pertanian ({data.equipments.length})
                    </h2>
                  </div>
                  {activeTab === 'all' && data.equipments.length > 4 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('equipments')}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
                    >
                      <span>Lihat Semua Alat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {data.equipments.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push('/sewa-alat')}
                      className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.nama}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-600">
                              <Tractor className="w-10 h-10" />
                            </div>
                          )}
                          <div className="absolute bottom-1.5 left-1.5 bg-amber-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs max-w-[80%] truncate">
                            {item.kategori}
                          </div>
                        </div>

                        <div className="p-3">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-700 transition truncate">
                            {item.nama}
                          </h3>
                          {item.spesifikasi && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.spesifikasi}
                            </p>
                          )}
                          <div className="text-xs sm:text-sm font-extrabold text-amber-800 mt-2">
                            Rp {Number(item.hargaSewa).toLocaleString('id-ID')}
                            <span className="text-[10px] font-normal text-slate-500"> / {item.satuanSewa}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
