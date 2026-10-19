'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
  Search,
  Store,
  Tractor,
  User as UserIcon,
  CheckCircle2,
  ArrowRight,
  Loader2,
  MapPin,
  Sparkles,
  ChevronRight,
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
    <div className="min-h-screen bg-[#f4f5f1] pb-20">
      <AppHeader />

      {/* Header Filter Pencarian */}
      <div className="bg-white border-b border-[#dce1d6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Tab Filter Navigasi */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#233414] text-white'
                  : 'bg-[#EAEDE7] hover:bg-[#dce1d6] text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <span>Semua</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  activeTab === 'all'
                    ? 'bg-[#344d15] text-[#D4F63D]'
                    : 'bg-white border border-[#cfd6c9] text-[#1a2610]'
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
                  ? 'bg-[#233414] text-white'
                  : 'bg-[#EAEDE7] hover:bg-[#dce1d6] text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <Store className={`w-3.5 h-3.5 ${activeTab === 'products' ? 'text-[#D4F63D]' : ''}`} />
              <span>Toko Online</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  activeTab === 'products'
                    ? 'bg-[#344d15] text-[#D4F63D]'
                    : 'bg-white border border-[#cfd6c9] text-[#1a2610]'
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
                  ? 'bg-[#233414] text-white'
                  : 'bg-[#EAEDE7] hover:bg-[#dce1d6] text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <Tractor className={`w-3.5 h-3.5 ${activeTab === 'equipments' ? 'text-[#D4F63D]' : ''}`} />
              <span>Sewa Alat</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  activeTab === 'equipments'
                    ? 'bg-[#344d15] text-[#D4F63D]'
                    : 'bg-white border border-[#cfd6c9] text-[#1a2610]'
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
                  ? 'bg-[#233414] text-white'
                  : 'bg-[#EAEDE7] hover:bg-[#dce1d6] text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <UserIcon className={`w-3.5 h-3.5 ${activeTab === 'users' ? 'text-[#D4F63D]' : ''}`} />
              <span>Akun & Petani</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  activeTab === 'users'
                    ? 'bg-[#344d15] text-[#D4F63D]'
                    : 'bg-white border border-[#cfd6c9] text-[#1a2610]'
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
            <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
            <span className="text-xs text-[#526046] font-semibold">Memuat hasil pencarian...</span>
          </div>
        )}

        {/* Belum Ada Input Pencarian */}
        {!isLoading && !currentQuery && (
          <div className="bg-white border border-[#dce1d6] rounded-2xl p-8 sm:p-14 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#e2f2c8] text-[#233414] flex items-center justify-center mx-auto mb-4 border border-[#c9e39e]">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#1a2610]">
              Mulai Pencarian Terpadu
            </h2>
            <p className="text-xs sm:text-sm text-[#526046] mt-1 max-w-xs mx-auto">
              Ketik kata kunci pada bilah pencarian di atas untuk menelusuri hasil komoditas, sewa alat, dan profil pengguna.
            </p>
          </div>
        )}

        {/* State Tidak Ditemukan */}
        {!isLoading && currentQuery && totalCount === 0 && (
          <div className="bg-white border border-[#dce1d6] rounded-2xl p-8 sm:p-14 text-center max-w-lg mx-auto">
            <div className="relative w-32 h-32 flex items-center justify-center mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border border-[#EAEDE7] animate-pulse pointer-events-none" />
              <div className="absolute inset-4 rounded-full border border-[#dce1d6] pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-[#cfd6c9] pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] flex items-center justify-center text-[#233414] relative z-10">
                <Search className="w-6 h-6 text-[#233414] stroke-[2.2]" />
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-[#1a2610]">
              Hasil Tidak Ditemukan
            </h2>
            <p className="text-xs sm:text-sm text-[#526046] mt-1 mb-5 max-w-xs mx-auto">
              Pencarian untuk &quot;{currentQuery}&quot; tidak menemukan hasil. Periksa ejaan atau gunakan kata kunci lain.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                router.push('/search');
              }}
              className="px-4 py-2 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition cursor-pointer"
            >
              Bersihkan Pencarian
            </button>
          </div>
        )}

        {/* Tampilan Hasil Pencarian */}
        {!isLoading && currentQuery && totalCount > 0 && (
          <div className="space-y-8">
            {/* 1. SEKSI AKUN & PETANI */}
            {(activeTab === 'all' || activeTab === 'users') && data.users.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#233414]" />
                    <h2 className="text-sm sm:text-base font-extrabold text-[#1a2610]">
                      Akun & Petani Mitra ({data.users.length})
                    </h2>
                  </div>
                  {activeTab === 'all' && data.users.length > 3 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('users')}
                      className="text-xs font-bold text-[#233414] hover:text-[#344d15] flex items-center gap-0.5 cursor-pointer"
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
                      className="bg-white border border-[#dce1d6] hover:border-[#344d15] rounded-2xl p-4 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar className="w-12 h-12 rounded-full border border-[#cfd6c9] shrink-0">
                          <AvatarImage src={u.avatarUrl || ''} alt={u.name} className="object-cover" />
                          <AvatarFallback className="bg-[#233414] text-[#D4F63D] font-bold text-sm">
                            {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] transition truncate">
                              {u.name}
                            </span>
                            {u.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-[#344d15] fill-[#e2f2c8] shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#526046] mt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
                                u.role === 'PETANI'
                                  ? 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e]'
                                  : 'bg-[#EAEDE7] text-[#1a2610] border-[#cfd6c9]'
                              }`}
                            >
                              {u.role === 'PETANI' ? 'Petani Mitra' : 'Anggota Pembeli'}
                            </span>
                          </div>

                          {u.address && (
                            <div className="text-[11px] text-[#5b6950] mt-1 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#5b6950] shrink-0" />
                              <span className="truncate">{u.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-[#f4f5f1] group-hover:bg-[#233414] text-[#526046] group-hover:text-[#D4F63D] flex items-center justify-center transition shrink-0 ml-2 border border-[#cfd6c9] group-hover:border-[#233414]">
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SEKSI KOMODITAS TOKO ONLINE */}
            {(activeTab === 'all' || activeTab === 'products') && data.products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#233414]" />
                    <h2 className="text-sm sm:text-base font-extrabold text-[#1a2610]">
                      Komoditas Toko Online ({data.products.length})
                    </h2>
                  </div>
                  {activeTab === 'all' && data.products.length > 6 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('products')}
                      className="text-xs font-bold text-[#233414] hover:text-[#344d15] flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Lihat Semua Produk</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 lg:gap-4">
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
                        className={`border rounded-xl sm:rounded-2xl overflow-hidden transition-colors duration-150 flex flex-col justify-between h-full ${
                          isOutOfStock
                            ? 'bg-[#f4f5f1] border-[#d5dccf] opacity-80 cursor-not-allowed'
                            : 'bg-white border-[#dce1d6] hover:border-[#344d15] cursor-pointer group'
                        }`}
                      >
                        <div>
                          {/* Product Image */}
                          <div className="relative aspect-square sm:aspect-[4/3] w-full shrink-0 bg-[#EAEDE7] overflow-hidden border-b border-[#EAEDE7]">
                            <img
                              src={
                                prod.imageUrl ||
                                'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                              }
                              alt={prod.nama}
                              className={`w-full h-full object-cover transition-transform duration-300 ${
                                isOutOfStock
                                  ? 'grayscale opacity-75'
                                  : 'group-hover:scale-[1.03]'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            {isOutOfStock && (
                              <div className="absolute top-1.5 right-1.5 bg-[#ffedea] text-[#831c1e] border border-red-200 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 z-10">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c4242a]" />
                                <span>Habis</span>
                              </div>
                            )}
                            <div className="absolute top-1.5 left-1.5 bg-[#233414] text-[#D4F63D] text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md max-w-[65%] truncate z-10">
                              {prod.kategori}
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="p-2.5 sm:p-3.5 flex flex-col justify-between gap-1">
                            <h3
                              className={`text-xs sm:text-sm font-bold tracking-tight leading-snug line-clamp-2 transition-colors ${
                                isOutOfStock
                                  ? 'text-[#68785b]'
                                  : 'text-[#1a2610] group-hover:text-[#344d15]'
                              }`}
                              title={prod.nama}
                            >
                              {prod.nama}
                            </h3>

                            {prod.petani?.name && (
                              <div className="text-[10px] sm:text-[11px] text-[#5b6950] truncate">
                                Oleh {prod.petani.name}
                              </div>
                            )}

                            <div className="text-xs sm:text-sm font-extrabold text-[#233414] mt-1 tabular-nums">
                              Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                              <span className="text-[10px] font-medium text-[#5b6950]"> /{prod.satuan}</span>
                            </div>

                            {isOutOfStock && (
                              <div className="text-[10px] font-bold text-[#c4242a] mt-0.5">
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

            {/* 3. SEKSI SEWA ALAT */}
            {(activeTab === 'all' || activeTab === 'equipments') && data.equipments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Tractor className="w-4 h-4 text-[#233414]" />
                    <h2 className="text-sm sm:text-base font-extrabold text-[#1a2610]">
                      Sewa Alat Pertanian ({data.equipments.length})
                    </h2>
                  </div>
                  {activeTab === 'all' && data.equipments.length > 4 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('equipments')}
                      className="text-xs font-bold text-[#233414] hover:text-[#344d15] flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Lihat Semua Alat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {data.equipments.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push('/sewa-alat')}
                      className="bg-white border border-[#dce1d6] hover:border-[#344d15] rounded-xl sm:rounded-2xl overflow-hidden transition-colors flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-square sm:aspect-video w-full bg-[#EAEDE7] overflow-hidden border-b border-[#EAEDE7]">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.nama}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#EAEDE7] text-[#233414]">
                              <Tractor className="w-10 h-10" />
                            </div>
                          )}
                          <div className="absolute top-1.5 left-1.5 bg-[#233414] text-[#D4F63D] text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md max-w-[80%] truncate">
                            {item.kategori}
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3.5">
                          <h3 className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] transition truncate">
                            {item.nama}
                          </h3>
                          {item.spesifikasi && (
                            <p className="text-[11px] text-[#5b6950] line-clamp-1 mt-0.5">
                              {item.spesifikasi}
                            </p>
                          )}
                          <div className="text-xs sm:text-sm font-extrabold text-[#233414] mt-1.5 sm:mt-2 tabular-nums">
                            Rp {Number(item.hargaSewa).toLocaleString('id-ID')}
                            <span className="text-[10px] font-medium text-[#5b6950]"> /{item.satuanSewa}</span>
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
        <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
