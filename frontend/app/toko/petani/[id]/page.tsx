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
import { cappedAddQuantity, getCart, saveCart } from '@/lib/cart';

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
      showToast({
        title: 'Gagal',
        message: 'Koneksi terputus. Periksa internet Anda lalu coba lagi.',
        type: 'error',
      });
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
      const { addable, inCart } = cappedAddQuantity(existingCart, product.id, 1, Number(product.stok));
      if (addable <= 0) {
        showToast({
          title: 'Stok Sudah di Keranjang',
          message: `Semua stok "${product.nama}" (${Number(product.stok)} ${product.satuan}) sudah ada di keranjang Anda.`,
          type: 'info',
        });
        return;
      }

      if (itemIdx > -1) {
        existingCart[itemIdx].quantity = inCart + addable;
        existingCart[itemIdx].stok = Number(product.stok);
      } else {
        existingCart.push({
          id: product.id,
          nama: product.nama,
          kategori: product.kategori,
          hargaPerSatuan: Number(product.hargaPerSatuan),
          satuan: product.satuan,
          imageUrl: product.imageUrl,
          quantity: 1,
          stok: Number(product.stok),
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
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="none" />

        {/* Top Breadcrumb Skeleton */}
        <div className="bg-white border-b border-[#dce1d6] sticky top-14 sm:top-16 z-30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-24 h-4 bg-[#EAEDE7] rounded animate-pulse" />
              <div className="w-3 h-3 bg-[#EAEDE7] rounded animate-pulse" />
              <div className="w-20 h-4 bg-[#EAEDE7] rounded animate-pulse" />
            </div>
            <div className="w-16 h-4 bg-[#EAEDE7] rounded animate-pulse" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-5 sm:space-y-6">
          {/* Header Card Skeleton */}
          <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#EAEDE7] animate-pulse shrink-0" />
                <div className="space-y-2">
                  <div className="w-40 h-6 bg-[#EAEDE7] rounded-md animate-pulse" />
                  <div className="w-48 h-4 bg-[#EAEDE7] rounded-md animate-pulse" />
                  <div className="flex gap-2 pt-1">
                    <div className="w-24 h-8 bg-[#EAEDE7] rounded-xl animate-pulse" />
                    <div className="w-28 h-8 bg-[#EAEDE7] rounded-xl animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-[#f4f5f1] rounded-xl animate-pulse" />
                <div className="w-24 h-12 bg-[#f4f5f1] rounded-xl animate-pulse" />
              </div>
            </div>
          </div>

          {/* Filter & Products Grid Skeleton */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-[#dce1d6]">
              <div className="w-32 h-5 bg-[#EAEDE7] rounded animate-pulse" />
              <div className="w-28 h-8 bg-[#f4f5f1] rounded-xl animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 lg:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl sm:rounded-2xl border border-[#dce1d6] overflow-hidden space-y-2 p-2.5 sm:p-3.5"
                >
                  <div className="w-full aspect-square sm:aspect-[4/3] bg-[#EAEDE7] rounded-lg animate-pulse" />
                  <div className="w-3/4 h-4 bg-[#EAEDE7] rounded animate-pulse" />
                  <div className="w-1/2 h-4 bg-[#EAEDE7] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="none" />
        <div className="flex-1 max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EAEDE7] text-[#233414] flex items-center justify-center mb-4 border border-[#cfd6c9]">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-[#344d15]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1a2610] mb-1.5">
            Toko Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-[13px] text-[#526046] mb-6 leading-relaxed">
            {error || 'Data petani tidak tersedia.'}
          </p>
          <Link
            href="/toko"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4F63D]" />
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
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <AppHeader activePage="none" />

      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-[#dce1d6] sticky top-14 sm:top-16 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-[#5b6950]">
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <Link
              href="/toko"
              className="text-[#526046] hover:text-[#233414] font-medium flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Belanja Koperasi</span>
            </Link>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#526046] font-medium">Petani Mitra</span>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#1a2610] font-bold truncate max-w-[180px] sm:max-w-xs">
              {petani.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[#526046] hover:text-[#233414] px-2.5 py-1 rounded-lg hover:bg-[#EAEDE7] transition-colors cursor-pointer text-xs font-medium"
              title="Bagikan Profil Toko"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-12 space-y-5 sm:space-y-6">
        {/* HEADER TOKO PETANI */}
        <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 lg:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
            {/* Left: Avatar, Name, Location, Action Buttons */}
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
              {/* Avatar Logo Toko */}
              <Avatar className="w-15 h-15 sm:w-20 sm:h-20 rounded-2xl border border-[#cfd6c9] shrink-0">
                <AvatarImage src={petani.avatarUrl || ''} alt={petani.name} />
                <AvatarFallback className="bg-[#233414] text-[#D4F63D] font-bold text-lg sm:text-2xl rounded-2xl">
                  {petani.name ? petani.name.slice(0, 2).toUpperCase() : 'PT'}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h1 className="text-base sm:text-2xl font-bold text-[#1a2610] tracking-tight truncate">
                      {petani.name}
                    </h1>
                    {petani.isVerified && (
                      <span title="Petani Binaan Terverifikasi Koperasi" className="shrink-0">
                        <CheckCircle2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#344d15] fill-[#e2f2c8]" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#526046] mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#5b6950] shrink-0" />
                    <span className="truncate">
                      {petani.address || 'Kab. Minahasa Utara, Sulawesi Utara'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Follow, Chat Penjual, Share */}
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  {user?.id === petaniId ? (
                    /* Toko milik sendiri: tidak bisa follow / chat diri sendiri */
                    <Link
                      href="/dashboard"
                      className="h-8 sm:h-9 px-4 sm:px-5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white border border-[#233414] text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <span>Kelola di Dashboard</span>
                    </Link>
                  ) : (
                  <>
                  {/* Follow Button */}
                  <button
                    aria-pressed={isFollowed}
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`h-8 sm:h-9 px-4 sm:px-5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isFollowed
                        ? 'bg-[#f4f5f1] border border-[#cfd6c9] text-[#1a2610] hover:bg-[#EAEDE7]'
                        : 'bg-[#233414] hover:bg-[#344d15] text-white border border-[#233414]'
                    }`}
                  >
                    {isFollowLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowed ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#344d15]" />
                        <span>Mengikuti</span>
                      </>
                    ) : (
                      <span>+ Follow</span>
                    )}
                  </button>

                  {/* Chat Penjual Button */}
                  <button
                    onClick={handleChat}
                    className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl border border-[#233414] text-[#233414] bg-white hover:bg-[#EAEDE7] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#344d15]" />
                    <span>Chat Penjual</span>
                  </button>
                  </>
                  )}

                  {/* Share Icon Button */}
                  <button
                    onClick={handleShare}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-[#cfd6c9] text-[#526046] hover:text-[#1a2610] hover:bg-[#EAEDE7] transition-colors flex items-center justify-center cursor-pointer"
                    title="Bagikan Profil"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Rating & Total Terjual Summary */}
            <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-[#EAEDE7] pt-3 md:pt-0 md:pl-6 space-y-1">
              <div className="flex items-center gap-2 tabular-nums">
                <div className="flex items-center gap-1 text-[#1a2610] font-bold text-sm sm:text-base">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{petani.avgRating || '5.0'}</span>
                  <span className="text-[#5b6950] font-normal text-xs">
                    ({petani.totalReviews ? `${petani.totalReviews} ulasan` : 'Belum ada rating'})
                  </span>
                </div>
                <span className="text-[#cfd6c9]">•</span>
                <div className="text-[#1a2610] font-bold text-sm sm:text-base">
                  <span>{petani.totalTerjual || 0}</span>
                  <span className="text-[#5b6950] font-normal text-xs ml-1">terjual</span>
                </div>
              </div>
              <div className="text-[11px] text-[#5b6950] font-medium">
                Rating & Ulasan Petani Binaan Koperasi
              </div>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION ("Produk" & "Ulasan") */}
        <div className="border-b border-[#dce1d6] flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('PRODUK')}
            className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PRODUK'
                ? 'text-[#233414]'
                : 'text-[#5b6950] hover:text-[#1a2610]'
            }`}
          >
            <span>Produk</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border tabular-nums ${
                activeTab === 'PRODUK'
                  ? 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e]'
                  : 'bg-[#EAEDE7] text-[#526046] border-[#cfd6c9]'
              }`}
            >
              {products.length}
            </span>
            {activeTab === 'PRODUK' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#233414] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ULASAN')}
            className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ULASAN'
                ? 'text-[#233414]'
                : 'text-[#5b6950] hover:text-[#1a2610]'
            }`}
          >
            <span>Ulasan</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border tabular-nums ${
                activeTab === 'ULASAN'
                  ? 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e]'
                  : 'bg-[#EAEDE7] text-[#526046] border-[#cfd6c9]'
              }`}
            >
              {reviews.length}
            </span>
            {activeTab === 'ULASAN' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#233414] rounded-full" />
            )}
          </button>
        </div>

        {/* TAB CONTENT: PRODUK */}
        {activeTab === 'PRODUK' && (
          <div className="space-y-4">
            {/* Unified Filter Bar: Etalase Toko Pills + Search & Sort */}
            <div className="bg-white rounded-2xl border border-[#dce1d6] p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-[#1a2610] uppercase tracking-wider">
                    Etalase Toko ({etalase.length + 1})
                  </h2>
                  <span className="text-xs text-[#5b6950] tabular-nums">
                    • Menampilkan {filteredProducts.length} barang
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search input in farmer store */}
                  <div className="relative flex-1 sm:w-52">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5b6950] pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari di toko ini..."
                      className="w-full h-8 sm:h-9 pl-8 pr-3 rounded-xl border border-[#cfd6c9] text-xs bg-[#f4f5f1] focus:bg-white focus:outline-none focus:border-[#233414] focus:ring-1 focus:ring-[#233414] text-[#1a2610] placeholder:text-[#5b6950] transition-colors"
                    />
                  </div>

                  {/* Sort Select */}
                  <div className="relative shrink-0">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Urutkan Produk"
                      className="appearance-none h-8 sm:h-9 pl-3 pr-7 rounded-xl border border-[#cfd6c9] text-xs font-semibold text-[#1a2610] bg-white hover:bg-[#EAEDE7] focus:outline-none focus:border-[#233414] cursor-pointer transition-colors"
                    >
                      <option value="terbaru">Terbaru</option>
                      <option value="harga-rendah">Harga Terendah</option>
                      <option value="harga-tinggi">Harga Tertinggi</option>
                      <option value="stok">Stok Terbanyak</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#5b6950] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Etalase Category Pills */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedEtalase('Semua Produk')}
                  className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-lg sm:rounded-xl text-xs whitespace-nowrap transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
                    selectedEtalase === 'Semua Produk'
                      ? 'bg-[#233414] text-white border-[#233414] font-semibold'
                      : 'bg-[#f4f5f1] text-[#233414] hover:bg-[#EAEDE7] border-[#cfd6c9] font-medium'
                  }`}
                >
                  <span>Semua Produk</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md tabular-nums ${
                      selectedEtalase === 'Semua Produk'
                        ? 'bg-[#344d15] text-[#D4F63D]'
                        : 'bg-white text-[#5b6950]'
                    }`}
                  >
                    {products.length}
                  </span>
                </button>

                {etalase.map((item: any) => {
                  const isSelected = selectedEtalase === item.nama;
                  return (
                    <button
                      key={item.nama}
                      onClick={() => setSelectedEtalase(item.nama)}
                      className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-lg sm:rounded-xl text-xs whitespace-nowrap transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#233414] text-white border-[#233414] font-semibold'
                          : 'bg-[#f4f5f1] text-[#233414] hover:bg-[#EAEDE7] border-[#cfd6c9] font-medium'
                      }`}
                    >
                      <span className="truncate">{item.nama}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md tabular-nums ${
                          isSelected
                            ? 'bg-[#344d15] text-[#D4F63D]'
                            : 'bg-white text-[#5b6950]'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Responsive Products Grid (2 col mobile, 3 sm, 4 md, 5 lg) */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#cfd6c9] p-10 sm:p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] text-[#344d15] flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#1a2610]">
                  Tidak ada komoditas di etalase ini
                </h3>
                <p className="text-xs text-[#526046] mt-1">
                  Coba pilih etalase lain atau reset pencarian Anda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 lg:gap-4">
                {filteredProducts.map((prod: any) => {
                  const isOutOfStock =
                    !prod.isTersedia || Number(prod.stok || 0) <= 0;

                  return (
                    <article
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
                      className={`border rounded-xl sm:rounded-2xl overflow-hidden transition-colors duration-150 flex flex-col justify-between h-full ${
                        isOutOfStock
                          ? 'bg-[#f4f5f1] border-[#d5dccf] cursor-not-allowed'
                          : 'bg-white border-[#dce1d6] hover:border-[#344d15] cursor-pointer group'
                      }`}
                    >
                      <div>
                        {/* Image Container - 1:1 on mobile, 4:3 on tablet/desktop */}
                        <div className="relative aspect-square sm:aspect-[4/3] w-full shrink-0 bg-[#EAEDE7] overflow-hidden border-b border-[#EAEDE7]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              (prod.imageUrl?.includes(',') ? prod.imageUrl.split(',')[0].trim() : prod.imageUrl) ||
                              'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=600&q=80'
                            }
                            alt={prod.nama}
                            loading="lazy"
                            decoding="async"
                            className={`w-full h-full object-cover transition-transform duration-300 ${
                              isOutOfStock
                                ? 'grayscale opacity-75'
                                : 'group-hover:scale-[1.03]'
                            }`}
                          />



                          {/* Top-Right Status Badge */}
                          <div
                            className={`absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg flex items-center gap-1 z-10 border ${
                              isOutOfStock
                                ? 'bg-[#ffedea] text-[#831c1e] border-red-200'
                                : 'bg-white text-[#1a2610] border-[#dce1d6]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                isOutOfStock ? 'bg-[#c4242a]' : 'bg-[#547318]'
                              }`}
                            />
                            <span>
                              {isOutOfStock
                                ? 'Habis'
                                : prod.isTersedia
                                ? 'Aktif'
                                : 'Off'}
                            </span>
                          </div>
                        </div>

                        {/* Info Body */}
                        <div className="p-2.5 sm:p-3.5 lg:p-4">
                          <h3
                            className={`text-xs sm:text-sm lg:text-[15px] font-bold tracking-tight leading-snug line-clamp-1 transition-colors ${
                              isOutOfStock
                                ? 'text-[#5b6950]'
                                : 'text-[#1a2610] group-hover:text-[#344d15]'
                            }`}
                            title={prod.nama}
                          >
                            {prod.nama}
                          </h3>
                          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between gap-1.5 flex-wrap">
                            <div className="flex items-baseline gap-0.5 sm:gap-1">
                              <span
                                className={`text-xs sm:text-[15px] lg:text-base font-extrabold tracking-tight tabular-nums ${
                                  isOutOfStock ? 'text-[#5b6950]' : 'text-[#233414]'
                                }`}
                              >
                                Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                              </span>
                              <span className="text-[10px] sm:text-xs text-[#5b6950] font-medium">
                                /{prod.satuan}
                              </span>
                            </div>

                            {isOutOfStock ? (
                              <span className="text-[10px] sm:text-xs text-[#c4242a] font-semibold tabular-nums">
                                Stok 0
                              </span>
                            ) : (
                              <span className="text-[10px] sm:text-xs text-[#344d15] font-semibold tabular-nums">
                                Stok {Number(prod.stok).toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5 lg:px-4 lg:pb-4 pt-0">
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            if (isOutOfStock) return;
                            handleAddToCart(prod, e);
                          }}
                          className={`w-full h-8 sm:h-9 lg:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            isOutOfStock
                              ? 'bg-[#EAEDE7] text-[#5b6950] border border-[#cfd6c9] cursor-not-allowed'
                              : 'bg-[#233414] hover:bg-[#344d15] text-white cursor-pointer'
                          }`}
                        >
                          <ShoppingCart
                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                              isOutOfStock ? 'text-[#5b6950]' : 'text-[#D4F63D]'
                            }`}
                          />
                          <span>{isOutOfStock ? 'Stok Habis' : '+ Keranjang'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: ULASAN TOKO */}
        {activeTab === 'ULASAN' && (
          <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 lg:p-7 space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-[#1a2610] tracking-tight uppercase">
                Ulasan Produk Petani
              </h2>
              <p className="text-xs text-[#526046] mt-0.5">
                Semua ulasan dari pembeli terhadap komoditas yang disetor oleh {petani.name}
              </p>
            </div>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cfd6c9] bg-[#f4f5f1] p-8 sm:p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mx-auto mb-3">
                  <Star className="w-5 h-5 text-[#233414]" />
                </div>
                <h3 className="text-sm font-bold text-[#1a2610]">Belum Ada Ulasan Masuk</h3>
                <p className="text-xs text-[#526046] max-w-sm mx-auto mt-1 leading-relaxed">
                  Komoditas petani ini belum memiliki ulasan dari pembeli.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EAEDE7]">
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
                                : 'fill-[#EAEDE7] text-[#cfd6c9]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-[#5b6950]">
                        {new Date(rev.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 rounded-full border border-[#cfd6c9]">
                        <AvatarImage src={rev.user?.avatarUrl || ''} alt={rev.user?.name} />
                        <AvatarFallback className="bg-[#EAEDE7] text-[#233414] text-[9px] font-bold">
                          {rev.user?.name ? rev.user.name.slice(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-[#1a2610]">
                        {rev.user?.name || 'Pembeli'}
                      </span>
                      <span className="text-[#cfd6c9]">•</span>
                      <Link
                        href={`/toko/${rev.product?.id}`}
                        className="text-[11px] text-[#233414] hover:text-[#344d15] hover:underline font-semibold"
                      >
                        Komoditas: {rev.product?.nama}
                      </Link>
                    </div>

                    <p className="text-xs sm:text-[13px] text-[#526046] pt-0.5 leading-relaxed">
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
