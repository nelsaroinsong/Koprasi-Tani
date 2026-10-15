'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  ArrowLeft,
  Share2,
  CheckCircle2,
  Warehouse,
  ShieldCheck,
  Star,
  Package,
  ThumbsUp,
  MessageCircle,
  Loader2,
  Filter,
  ChevronDown,
  Check,
  MapPin,
  Sparkles,
  Search,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getCart, saveCart } from '@/lib/cart';

// Cache instan client-side untuk navigasi cepat (0ms buka halaman saat sudah pernah dibuka)
const farmerStoreCache = new Map<string, any>();

export default function PetaniStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const petaniId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const cached = farmerStoreCache.get(petaniId);
  const [storeData, setStoreData] = useState<any | null>(cached || null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'PRODUK' | 'ULASAN'
  const [activeTab, setActiveTab] = useState<'PRODUK' | 'ULASAN'>('PRODUK');

  // Filter & Sort
  const [selectedEtalase, setSelectedEtalase] = useState('Semua Produk');
  const [sortBy, setSortBy] = useState<'terbaru' | 'harga-rendah' | 'harga-tinggi' | 'stok'>('terbaru');
  const [searchQuery, setSearchQuery] = useState('');

  // Follow State
  const [isFollowed, setIsFollowed] = useState(Boolean(cached?.petani?.isFollowed));
  const [followersCount, setFollowersCount] = useState(cached?.petani?.followersCount || 0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const fetchStoreData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && !farmerStoreCache.has(petaniId)) {
        setIsLoading(true);
      }
      setError(null);
      const res = await fetch(`/api/petani/${petaniId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Toko petani tidak ditemukan.');
        } else {
          setError('Gagal memuat profil toko petani.');
        }
        return;
      }
      const data = await res.json();
      farmerStoreCache.set(petaniId, data);
      setStoreData(data);
      setIsFollowed(Boolean(data.petani?.isFollowed));
      setFollowersCount(data.petani?.followersCount || 0);
    } catch (err) {
      console.error('Error fetching farmer profile:', err);
      if (!farmerStoreCache.has(petaniId)) {
        setError('Terjadi kendala saat memuat data petani.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [petaniId]);

  useEffect(() => {
    if (farmerStoreCache.has(petaniId)) {
      const cachedData = farmerStoreCache.get(petaniId);
      setStoreData(cachedData);
      setIsFollowed(Boolean(cachedData?.petani?.isFollowed));
      setFollowersCount(cachedData?.petani?.followersCount || 0);
      setIsLoading(false);
      // Revalidasi di latar belakang tanpa menghambat UI
      fetchStoreData(true);
    } else {
      fetchStoreData(false);
    }
  }, [petaniId, fetchStoreData]);

  const handleToggleFollow = async () => {
    if (!user) {
      showToast({
        title: 'Perlu Login',
        message: 'Silakan login terlebih dahulu untuk mengikuti toko petani.',
        type: 'info',
      });
      router.push('/login');
      return;
    }

    try {
      setIsFollowLoading(true);
      const res = await fetch(`/api/petani/${petaniId}/follow`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowed(data.isFollowed);
        setFollowersCount(data.followersCount);
        showToast({
          title: data.isFollowed ? 'Berhasil Mengikuti' : 'Batal Mengikuti',
          message: data.message,
          type: 'success',
        });
      } else {
        showToast({
          title: 'Gagal',
          message: data.error || 'Terjadi kesalahan.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error toggle follow:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleChat = () => {
    if (storeData?.petani?.phone) {
      const cleanPhone = storeData.petani.phone.replace(/[^0-9]/g, '');
      const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
      window.open(`https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(storeData.petani.name)},%20saya%20tertarik%20dengan%20hasil%20panen%20Anda%20di%20Koperasi%20Tani.`, '_blank');
    } else {
      showToast({
        title: 'Hubungi Koperasi',
        message: 'Kontak langsung petani dikelola melalui petugas gudang Koperasi Sinar Pagi Sejahtera.',
        type: 'info',
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Toko Panen ${storeData?.petani?.name || 'Petani Koperasi'}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast({
        title: 'Tautan Disalin',
        message: 'Tautan toko petani berhasil disalin.',
        type: 'info',
      });
    }
  };

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!product.isTersedia || Number(product.stok || 0) <= 0) {
        showToast({
          title: 'Stok Habis',
          message: `Komoditas "${product.nama}" saat ini sedang kosong/habis.`,
          type: 'warning',
        });
        return;
      }

      const existingCart = getCart(user);
      const itemIdx = existingCart.findIndex((i) => i.id === product.id);

      if (itemIdx > -1) {
        existingCart[itemIdx].quantity = (existingCart[itemIdx].quantity || 1) + 1;
      } else {
        existingCart.push({
          id: product.id,
          nama: product.nama,
          kategori: product.kategori,
          hargaPerSatuan: Number(product.hargaPerSatuan),
          satuan: product.satuan,
          imageUrl: product.imageUrl,
          quantity: 1,
          petaniName: storeData?.petani?.name || 'Petani Binaan',
        });
      }

      saveCart(existingCart, user);

      showToast({
        title: 'Ditambahkan',
        message: `1 ${product.satuan} "${product.nama}" berhasil masuk ke keranjang.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Error add to cart:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex flex-col">
        <AppHeader activePage="none" />

        {/* Top Breadcrumb Skeleton */}
        <div className="bg-white border-b border-slate-200/80 sticky top-16 z-30 shadow-2xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-24 h-4 bg-slate-200/80 rounded animate-pulse" />
              <div className="w-3 h-3 bg-slate-200/80 rounded animate-pulse" />
              <div className="w-20 h-4 bg-slate-200/80 rounded animate-pulse" />
            </div>
            <div className="w-16 h-4 bg-slate-200/80 rounded animate-pulse" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Header Card Skeleton */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200/80 animate-pulse shrink-0" />
                <div className="space-y-2">
                  <div className="w-40 h-6 bg-slate-200/80 rounded-md animate-pulse" />
                  <div className="w-48 h-4 bg-slate-200/80 rounded-md animate-pulse" />
                  <div className="flex gap-2 pt-1">
                    <div className="w-24 h-8 bg-slate-200/80 rounded-xl animate-pulse" />
                    <div className="w-28 h-8 bg-slate-200/80 rounded-xl animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-24 h-12 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-24 h-12 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>

          {/* Grid Layout Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Sidebar Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
              <div className="w-28 h-5 bg-slate-200/80 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="w-full h-8 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-full h-8 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-full h-8 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Products Grid Skeleton */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-200/80">
                <div className="w-32 h-5 bg-slate-200/80 rounded animate-pulse" />
                <div className="w-28 h-8 bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden space-y-2 p-2.5">
                    <div className="w-full aspect-square bg-slate-100 rounded-xl animate-pulse" />
                    <div className="w-3/4 h-4 bg-slate-200/80 rounded animate-pulse" />
                    <div className="w-1/2 h-4 bg-slate-200/80 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader activePage="none" />
        <div className="flex-1 max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Toko Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'Data petani tidak tersedia.'}</p>
          <Link
            href="/toko"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Belanja Koperasi</span>
          </Link>
        </div>
      </div>
    );
  }

  const { petani, products, reviews, etalase } = storeData;

  // Filter products by selected etalase & search
  let filteredProducts = products.filter((prod: any) => {
    if (selectedEtalase !== 'Semua Produk' && prod.kategori !== selectedEtalase) {
      return false;
    }
    if (searchQuery.trim() && !prod.nama.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort products
  filteredProducts = [...filteredProducts].sort((a: any, b: any) => {
    if (sortBy === 'harga-rendah') return Number(a.hargaPerSatuan) - Number(b.hargaPerSatuan);
    if (sortBy === 'harga-tinggi') return Number(b.hargaPerSatuan) - Number(a.hargaPerSatuan);
    if (sortBy === 'stok') return Number(b.stok) - Number(a.stok);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col">
      <AppHeader activePage="none" />

      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <Link href="/toko" className="hover:text-emerald-700 flex items-center gap-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Belanja Koperasi</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-medium">Petani Mitra</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-xs">
              {petani.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 px-2 py-1 rounded-md hover:bg-slate-100 transition cursor-pointer text-xs"
              title="Bagikan Profil Toko"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* HEADER TOKO PETANI (Matching Gambar 2 Reference) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Left: Avatar, Name, Location, Action Buttons */}
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              {/* Avatar Logo Toko */}
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-emerald-500/20 shadow-xs shrink-0">
                <AvatarImage src={petani.avatarUrl || ''} alt={petani.name} />
                <AvatarFallback className="bg-emerald-700 text-white font-black text-xl sm:text-2xl rounded-2xl">
                  {petani.name ? petani.name.slice(0, 2).toUpperCase() : 'PT'}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 space-y-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                      {petani.name}
                    </h1>
                    {petani.isVerified && (
                      <span title="Petani Binaan Terverifikasi Koperasi" className="shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {petani.address || 'Kab. Minahasa Utara, Sulawesi Utara'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Follow, Chat Penjual, Share (Gambar 2) */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {/* Follow Button (Green Pill) */}
                  <button
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                      isFollowed
                        ? 'bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                    }`}
                  >
                    {isFollowLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowed ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mengikuti</span>
                      </>
                    ) : (
                      <span>+ Follow</span>
                    )}
                  </button>

                  {/* Chat Penjual Button (Green Outline) */}
                  <button
                    onClick={handleChat}
                    className="px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chat Penjual</span>
                  </button>

                  {/* Share Icon Button */}
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    title="Bagikan Profil"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Rating & Total Terjual Summary (Gambar 2 Right Side) */}
            <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-slate-900 font-bold text-sm sm:text-base">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{petani.avgRating || '5.0'}</span>
                  <span className="text-slate-400 font-normal text-xs">
                    ({petani.totalReviews ? `${petani.totalReviews} ulasan` : 'Belum ada rating'})
                  </span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="text-slate-900 font-bold text-sm sm:text-base">
                  <span>{petani.totalTerjual || 0}</span>
                  <span className="text-slate-500 font-normal text-xs ml-1">terjual</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Rating & Ulasan Petani Binaan Koperasi
              </div>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION (Gambar 2: "Produk" & "Ulasan") */}
        <div className="border-b border-slate-200 flex items-center gap-8 text-sm font-bold">
          <button
            onClick={() => setActiveTab('PRODUK')}
            className={`pb-3 relative transition cursor-pointer ${
              activeTab === 'PRODUK'
                ? 'text-emerald-700'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Produk</span>
            <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {products.length}
            </span>
            {activeTab === 'PRODUK' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ULASAN')}
            className={`pb-3 relative transition cursor-pointer ${
              activeTab === 'ULASAN'
                ? 'text-emerald-700'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Ulasan</span>
            <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {reviews.length}
            </span>
            {activeTab === 'ULASAN' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>
        </div>

        {/* TAB CONTENT: PRODUK */}
        {activeTab === 'PRODUK' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Sidebar: Etalase Toko (Gambar 2 Left Sidebar) */}
            <aside className="md:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
                  Etalase Toko ({etalase.length + 1})
                </h2>

                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedEtalase('Semua Produk')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedEtalase === 'Semua Produk'
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Semua Produk</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-normal">
                      {products.length}
                    </span>
                  </button>

                  {etalase.map((item: any) => (
                    <button
                      key={item.nama}
                      onClick={() => setSelectedEtalase(item.nama)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        selectedEtalase === item.nama
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{item.nama}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-normal">
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Right: Products Grid (Tokopedia Style) */}
            <div className="md:col-span-9 space-y-4">
              {/* Header: Title, Search, and Sort Dropdown (Gambar 2) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedEtalase}
                  </h2>
                  <span className="text-xs text-slate-400">
                    ({filteredProducts.length} barang)
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search input in farmer store */}
                  <div className="relative flex-1 sm:w-44">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari di toko ini..."
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800"
                    />
                  </div>

                  {/* Sort Select */}
                  <div className="relative shrink-0">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Urutkan Produk"
                      className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:border-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="terbaru">Terbaru</option>
                      <option value="harga-rendah">Harga Terendah</option>
                      <option value="harga-tinggi">Harga Tertinggi</option>
                      <option value="stok">Stok Terbanyak</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Tokopedia Compact Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">Tidak ada komoditas di etalase ini</h3>
                  <p className="text-xs text-slate-400 mt-1">Coba pilih etalase lain atau reset pencarian Anda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {filteredProducts.map((prod: any) => {
                    const isOutOfStock =
                      !prod.isTersedia || Number(prod.stok || 0) <= 0;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          if (isOutOfStock) {
                            showToast({
                              title: 'Stok Habis',
                              message: `Komoditas "${prod.nama}" saat ini sedang kosong/habis.`,
                              type: 'warning',
                            });
                            return;
                          }
                          router.push(`/toko/${prod.id}`);
                        }}
                        className={`border rounded-xl overflow-hidden transition-all duration-200 flex flex-col justify-between h-full ${
                          isOutOfStock
                            ? 'bg-slate-100/90 border-slate-300/80 opacity-75 cursor-not-allowed shadow-none'
                            : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer group'
                        }`}
                      >
                        <div>
                          {/* Square Image with badges - Strict 1:1 Aspect Ratio */}
                          <div
                            className="relative aspect-square w-full shrink-0 bg-slate-100 overflow-hidden"
                            style={{ aspectRatio: '1 / 1' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                            />

                            {/* Status Badge di Kanan Atas */}
                            <div
                              className={`absolute top-1.5 right-1.5 backdrop-blur-xs text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 z-10 ${
                                isOutOfStock
                                  ? 'bg-white/95 text-rose-700 border border-rose-200'
                                  : 'bg-white/95 text-emerald-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOutOfStock
                                    ? 'bg-rose-500'
                                    : 'bg-emerald-500 animate-pulse'
                                }`}
                              />
                              <span>
                                {isOutOfStock
                                  ? 'Stok Habis'
                                  : prod.isTersedia
                                  ? 'Aktif'
                                  : 'Off'}
                              </span>
                            </div>

                            {/* Badge Kategori Pindah ke Kiri Bawah */}
                            <div className="absolute bottom-1.5 left-1.5 bg-emerald-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs max-w-[80%] truncate z-10">
                              {prod.kategori}
                            </div>
                          </div>

                          {/* Info Body */}
                          <div className="p-2 flex flex-col justify-between gap-0.5">
                            <h3
                              className={`text-xs font-semibold tracking-tight leading-snug line-clamp-1 transition-colors ${
                                isOutOfStock
                                  ? 'text-slate-500'
                                  : 'text-slate-800 group-hover:text-emerald-700'
                              }`}
                              title={prod.nama}
                            >
                              {prod.nama}
                            </h3>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                                isOutOfStock ? 'text-slate-500' : 'text-slate-900'
                              }`}>
                                Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                              </span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                /{prod.satuan}
                              </span>
                            </div>
                            {isOutOfStock ? (
                              <div className="text-[10px] text-rose-600 mt-0.5 font-bold">
                                Stok Habis (0)
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                Stok: {Number(prod.stok).toLocaleString('id-ID')} {prod.satuan}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="p-2 pt-0">
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              if (isOutOfStock) return;
                              handleAddToCart(prod, e);
                            }}
                            className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-2xs ${
                              isOutOfStock
                                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                                : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer'
                            }`}
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>{isOutOfStock ? 'Stok Habis' : '+ Keranjang'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: ULASAN TOKO */}
        {activeTab === 'ULASAN' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                Ulasan Produk Petani
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Semua ulasan dari pembeli terhadap komoditas yang disetor oleh {petani.name}
              </p>
            </div>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">Belum Ada Ulasan Masuk</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Komoditas petani ini belum memiliki ulasan dari pembeli.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="py-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-slate-200 text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 rounded-full border border-slate-200">
                        <AvatarImage src={rev.user?.avatarUrl || ''} alt={rev.user?.name} />
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-[9px] font-bold">
                          {rev.user?.name ? rev.user.name.slice(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-900">{rev.user?.name || 'Pembeli'}</span>
                      <span className="text-slate-300">•</span>
                      <Link
                        href={`/toko/${rev.product?.id}`}
                        className="text-[11px] text-emerald-700 hover:underline font-semibold"
                      >
                        Komoditas: {rev.product?.nama}
                      </Link>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 pt-0.5">
                      {rev.komentar || 'Pembeli tidak memberikan ulasan tertulis.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
