'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  Minus,
  Plus,
  ArrowLeft,
  Share2,
  CheckCircle2,
  Warehouse,
  ShieldCheck,
  Star,
  Package,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Loader2,
  Calendar,
  Check,
  Tag,
  AlertCircle,
  X,
  Maximize2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getCart, saveCart } from '@/lib/cart';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [productData, setProductData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepper state
  const [quantity, setQuantity] = useState(1);

  // Lightbox Modal Gambar Ukuran Asli
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Follow button state
  const [isFollowed, setIsFollowed] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Review Form state
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Helpful reaction counts state (local state map)
  const [helpfulLikes, setHelpfulLikes] = useState<{ [id: string]: boolean }>({});

  const fetchProductDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Komoditas ini tidak ditemukan atau sudah tidak tersedia.');
        } else {
          setError('Gagal memuat informasi komoditas.');
        }
        return;
      }
      const data = await res.json();
      setProductData(data);
      setIsFollowed(Boolean(data.petani?.isFollowed));
      setFollowersCount(data.petani?.followersCount || 0);
    } catch (err: any) {
      console.error('Error fetching product detail:', err);
      setError('Terjadi kendala koneksi ke server.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

  const handleToggleFollow = async () => {
    if (!user) {
      showToast({
        title: 'Perlu Login',
        message: 'Silakan login terlebih dahulu untuk mengikuti petani.',
        type: 'info',
      });
      router.push('/login');
      return;
    }

    if (!productData?.petani?.id) return;

    try {
      setIsFollowLoading(true);
      const res = await fetch(`/api/petani/${productData.petani.id}/follow`, {
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
          title: 'Gagal Mengikuti',
          message: data.error || 'Terjadi kesalahan',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error toggle follow:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleAddToCart = (redirectAfter = false) => {
    if (!productData?.product) return;
    const prod = productData.product;

    try {
      const existingCart = getCart(user);
      const itemIdx = existingCart.findIndex((i) => i.id === prod.id);

      if (itemIdx > -1) {
        existingCart[itemIdx].quantity = (existingCart[itemIdx].quantity || 1) + quantity;
      } else {
        existingCart.push({
          id: prod.id,
          nama: prod.nama,
          kategori: prod.kategori,
          hargaPerSatuan: Number(prod.hargaPerSatuan),
          satuan: prod.satuan,
          imageUrl: prod.imageUrl,
          quantity,
          petaniName: productData.petani?.name || 'Petani Binaan',
        });
      }

      saveCart(existingCart, user);

      showToast({
        title: 'Dimasukkan ke Keranjang',
        message: `${quantity} ${prod.satuan} "${prod.nama}" berhasil ditambahkan ke keranjang.`,
        type: 'success',
      });

      if (redirectAfter) {
        router.push('/pesanan');
      }
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast({
        title: 'Perlu Login',
        message: 'Silakan login terlebih dahulu untuk memberikan ulasan.',
        type: 'info',
      });
      router.push('/login');
      return;
    }

    try {
      setIsSubmittingReview(true);
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: newRating,
          komentar: newComment,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast({
          title: 'Ulasan Terkirim',
          message: 'Terima kasih atas ulasan dan penilaian Anda!',
          type: 'success',
        });
        setNewComment('');
        setIsReviewFormOpen(false);
        fetchProductDetail();
      } else {
        showToast({
          title: 'Gagal Mengirim Ulasan',
          message: data.error || 'Terjadi kesalahan saat menyimpan ulasan.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error submit review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: productData?.product?.nama || 'Komoditas Koperasi',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast({
        title: 'Tautan Disalin',
        message: 'Tautan produk berhasil disalin ke clipboard.',
        type: 'info',
      });
    }
  };

  const toggleHelpful = (reviewId: string) => {
    setHelpfulLikes((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const now = new Date();
      const past = new Date(dateString);
      const diffMs = now.getTime() - past.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 1) return 'Hari ini';
      if (diffDays === 1) return 'Kemarin';
      if (diffDays < 7) return `${diffDays} hari lalu`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
      return `${Math.floor(diffDays / 365)} tahun lalu`;
    } catch {
      return 'Baru saja';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="toko" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-[#233414] animate-spin" />
          <p className="text-xs sm:text-[13px] text-[#344d15] font-medium">
            Memuat rincian komoditas...
          </p>
        </div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="toko" />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EAEDE7] text-[#233414] flex items-center justify-center mb-4 border border-[#cfd6c9]">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-[#344d15]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1a2610] mb-1.5">
            Komoditas Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-[13px] text-[#526046] mb-6 leading-relaxed">
            {error || 'Komoditas tidak tersedia.'}
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

  const { product, stats, reviews, petani } = productData;
  const maxStock = Number(product.stok) || 1;
  const unitPrice = Number(product.hargaPerSatuan) || 0;
  const totalPrice = unitPrice * quantity;
  const isOutOfStock = !product.isTersedia || Number(product.stok || 0) <= 0;

  // Preset options for quantity
  const quickPresets = [1, 2, 5, 10, 25, 50].filter(
    (val) => val <= maxStock || val === 1
  );

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <AppHeader activePage="toko" />

      {/* Breadcrumb Navigation Bar */}
      <div className="bg-white border-b border-[#dce1d6] sticky top-16 z-30">
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
            <span className="text-[#526046] font-medium">{product.kategori}</span>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#1a2610] font-bold truncate max-w-[160px] sm:max-w-xs">
              {product.nama}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-[#526046] hover:text-[#233414] px-2.5 py-1 rounded-lg hover:bg-[#EAEDE7] transition-colors cursor-pointer text-xs font-medium shrink-0"
            title="Bagikan Tautan Produk"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bagikan</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-12 space-y-5 sm:space-y-7">
        {/* Top Product Detail Section (2 Columns) */}
        <div className="bg-white rounded-2xl border border-[#dce1d6] p-3.5 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 lg:gap-10">
            {/* Left Column: Product Image & Cooperative Panen Badges */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div
                onClick={() => setIsImageModalOpen(true)}
                className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#EAEDE7] border border-[#dce1d6] group cursor-zoom-in"
                title="Klik untuk melihat foto ukuran asli"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    product.imageUrl ||
                    'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={product.nama}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-[#1a2610]/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-[#233414] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[#344d15] font-semibold">
                    <Maximize2 className="w-3.5 h-3.5 text-[#D4F63D]" />
                    <span>Lihat Ukuran Asli</span>
                  </div>
                </div>

                {/* Floating Badges */}
                <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-[#233414] text-[#D4F63D] text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg">
                  {product.kategori}
                </div>

                <div
                  className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border ${
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
                  <span>{product.isTersedia && !isOutOfStock ? 'Stok Tersedia' : 'Non-Aktif'}</span>
                </div>

                <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 bg-[#233414] border border-[#344d15] text-white text-[10px] sm:text-xs font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4F63D]" />
                  <span>Panen Koperasi Resmi</span>
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#f4f5f1] border border-[#dce1d6] flex flex-col gap-2 text-[11px] sm:text-xs text-[#1a2610]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#344d15] shrink-0" />
                  <span className="text-[#526046]">
                    <strong className="text-[#1a2610]">100% Panen Petani Lokal:</strong> Asal Minahasa Utara terjamin.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#344d15] shrink-0" />
                  <span className="text-[#526046]">
                    <strong className="text-[#1a2610]">Ditimbang di Gudang:</strong> Kuantitas fisik dan kualitas diverifikasi.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Title, Price, Petani Card, Description, Quantity & Action */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-5">
              <div className="space-y-3">
                {/* Title */}
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-[#1a2610] tracking-tight leading-tight">
                  {product.nama}
                </h1>

                {/* Rating & Terjual Summary Row */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-[#526046]">
                  {stats?.totalReviews > 0 ? (
                    <div className="flex items-center gap-1 font-semibold text-[#1a2610] tabular-nums">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{stats.avgRating}</span>
                      <span className="text-[#5b6950] font-normal">
                        ({stats.totalReviews} ulasan)
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#5b6950] text-xs">Belum ada ulasan</span>
                  )}
                  <span className="text-[#cfd6c9]">•</span>
                  <div className="text-[#526046] tabular-nums">
                    <span className="font-semibold text-[#1a2610]">
                      {product.totalSold ? `${product.totalSold} ${product.satuan}` : '0'}
                    </span>{' '}
                    terjual
                  </div>
                  <span className="text-[#cfd6c9]">•</span>
                  <div className="text-[#344d15] font-semibold tabular-nums">
                    Stok: <strong>{Number(product.stok).toLocaleString('id-ID')} {product.satuan}</strong>
                  </div>
                </div>

                {/* Big Price Display */}
                <div className="p-3.5 sm:p-4 bg-[#f4f5f1] rounded-xl border border-[#dce1d6] flex items-baseline gap-2">
                  <span className="text-xl sm:text-3xl font-extrabold text-[#233414] tracking-tight tabular-nums">
                    Rp {Number(product.hargaPerSatuan).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs sm:text-sm text-[#5b6950] font-medium">
                    /{product.satuan}
                  </span>
                </div>
              </div>

              {/* SELLER / PETANI INFO CARD */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-[#dce1d6] bg-white hover:border-[#344d15] transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Petani Photo Profile */}
                    <Avatar className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#cfd6c9] shrink-0">
                      <AvatarImage src={petani?.avatarUrl || ''} alt={petani?.name} />
                      <AvatarFallback className="bg-[#EAEDE7] text-[#233414] font-bold text-sm">
                        {petani?.name ? petani.name.slice(0, 2).toUpperCase() : 'PT'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Petani Name & Meta */}
                    <div className="min-w-0">
                      <Link
                        href={`/toko/petani/${product.petaniId}`}
                        className="group inline-flex items-center gap-1.5"
                      >
                        <h2 className="text-sm sm:text-base font-bold text-[#1a2610] group-hover:text-[#344d15] transition-colors truncate">
                          {petani?.name || 'Petani Koperasi'}
                        </h2>
                        {petani?.isVerified && (
                          <span title="Petani Terverifikasi Koperasi" className="shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-[#344d15] fill-[#e2f2c8]" />
                          </span>
                        )}
                      </Link>
                      <div className="text-[11px] sm:text-xs text-[#5b6950] truncate">
                        {petani?.address || 'Kab. Minahasa Utara, Sulawesi Utara'}
                      </div>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <button
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
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
                </div>

                {/* Farmer Stats Under Card */}
                <div className="mt-3 pt-3 border-t border-[#EAEDE7] flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#526046]">
                  <div className="flex items-center gap-1 tabular-nums">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    {petani?.avgRating ? (
                      <>
                        <span className="font-bold text-[#1a2610]">{petani.avgRating}</span>
                        <span className="text-[#5b6950]">({petani.totalReviews} ulasan)</span>
                      </>
                    ) : (
                      <span className="text-[#5b6950]">Belum ada rating</span>
                    )}
                  </div>
                  <span className="text-[#cfd6c9]">•</span>
                  <div className="flex items-center gap-1 text-[#526046] tabular-nums">
                    <Package className="w-3.5 h-3.5 text-[#5b6950]" />
                    <span>
                      <strong className="text-[#1a2610]">{petani?.totalBarang || 1}</strong> total barang
                    </span>
                  </div>
                  <Link
                    href={`/toko/petani/${product.petaniId}`}
                    className="text-[#233414] hover:text-[#344d15] font-semibold text-xs ml-auto hover:underline"
                  >
                    Kunjungi Toko Petani →
                  </Link>
                </div>
              </div>

              <Separator className="my-1 bg-[#dce1d6]" />

              {/* Deskripsi Produk */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-[#1a2610] uppercase tracking-wider">
                  Deskripsi Komoditas
                </h2>
                <div className="text-xs sm:text-[13px] text-[#526046] leading-relaxed whitespace-pre-line bg-[#f4f5f1] p-3.5 rounded-xl border border-[#dce1d6]">
                  {product.deskripsi ||
                    `Komoditas segar ${product.nama} hasil panen anggota binaan Koperasi Sinar Pagi Sejahtera. Telah melewati seleksi mutu dan penimbangan resmi di gudang koperasi untuk memastikan kesegaran dan kepuasan pembeli.`}
                </div>
              </div>

              <Separator className="my-1 bg-[#dce1d6]" />

              {/* Atur Jumlah Beli & Total */}
              <div className="space-y-3.5 bg-[#f4f5f1] p-3.5 sm:p-4 rounded-xl border border-[#dce1d6]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a2610]">Atur Jumlah Pembelian</span>
                  <span className="text-[11px] sm:text-xs text-[#5b6950] tabular-nums">
                    Sisa Stok: <strong className="text-[#1a2610]">{maxStock} {product.satuan}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  {/* Stepper */}
                  <div className="flex items-center rounded-xl border border-[#cfd6c9] bg-white overflow-hidden">
                    <button
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#1a2610] hover:bg-[#EAEDE7] disabled:opacity-30 cursor-pointer transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxStock}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val) || val < 1) setQuantity(1);
                        else setQuantity(Math.min(maxStock, val));
                      }}
                      className="w-12 sm:w-14 h-8 sm:h-9 text-center text-xs font-bold text-[#1a2610] border-x border-[#dce1d6] focus:outline-none tabular-nums"
                    />
                    <button
                      onClick={() => setQuantity((prev) => Math.min(maxStock, prev + 1))}
                      disabled={quantity >= maxStock}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#1a2610] hover:bg-[#EAEDE7] disabled:opacity-30 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setQuantity(preset)}
                        className={`h-8 sm:h-9 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                          quantity === preset
                            ? 'bg-[#233414] text-white border-[#233414]'
                            : 'bg-white text-[#1a2610] border-[#cfd6c9] hover:bg-[#EAEDE7]'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                    {maxStock > 1 && (
                      <button
                        onClick={() => setQuantity(maxStock)}
                        className="h-8 sm:h-9 px-2.5 rounded-lg text-xs font-semibold border bg-[#e2f2c8] text-[#233414] border-[#c9e39e] hover:bg-[#d4e9b2] transition-colors cursor-pointer"
                      >
                        Maksimal
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtotal Calculation */}
                <div className="pt-2.5 flex items-center justify-between border-t border-[#dce1d6]">
                  <span className="text-xs text-[#526046] font-medium">Subtotal Belanja:</span>
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-extrabold text-[#233414] tabular-nums">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Add to Cart & Buy Now */}
                <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleAddToCart(false)}
                    disabled={!product.isTersedia || maxStock <= 0}
                    className="w-full h-10 sm:h-11 px-4 rounded-xl border border-[#233414] bg-white hover:bg-[#EAEDE7] text-[#233414] font-semibold text-xs sm:text-[13px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4 text-[#233414]" />
                    <span>+ Masuk Keranjang</span>
                  </button>

                  <button
                    onClick={() => handleAddToCart(true)}
                    disabled={!product.isTersedia || maxStock <= 0}
                    className="w-full h-10 sm:h-11 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-xs sm:text-[13px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D4F63D]" />
                    <span>Beli Langsung</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ULASAN PEMBELI */}
        <section className="bg-white rounded-2xl border border-[#dce1d6] p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dce1d6] pb-4">
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-[#1a2610] tracking-tight uppercase flex items-center gap-2">
                <span>Ulasan Pembeli</span>
              </h2>
              <p className="text-xs text-[#526046] mt-0.5">
                Pengalaman nyata pembeli komoditas dari petani binaan Koperasi
              </p>
            </div>

            {productData.userState?.hasPurchased ? (
              <button
                onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                className="h-9 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D4F63D]" />
                <span>{isReviewFormOpen ? 'Tutup Formulir' : 'Tulis Ulasan'}</span>
              </button>
            ) : (
              <div className="text-[11px] sm:text-xs text-[#526046] bg-[#f4f5f1] border border-[#dce1d6] px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5b6950] shrink-0" />
                <span>Ulasan dapat diberikan setelah pesanan Anda selesai diterima</span>
              </div>
            )}
          </div>

          {/* Form Tulis Ulasan (Collapsible) */}
          {isReviewFormOpen && (
            <form
              onSubmit={handleSubmitReview}
              className="p-4 sm:p-5 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1a2610]">Beri Bintang & Ulasan Anda</span>
                <span className="text-[11px] text-[#5b6950] tabular-nums">Nilai: {newRating} dari 5</span>
              </div>

              {/* Star selector */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= newRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-[#dce1d6] text-[#cfd6c9]'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment text */}
              <div>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ceritakan kualitas komoditas, kesegaran panen, atau kecepatan pelayanan gudang koperasi..."
                  className="w-full p-3 rounded-xl border border-[#cfd6c9] bg-white text-xs sm:text-[13px] text-[#1a2610] placeholder:text-[#5b6950] focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] transition-colors"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReviewFormOpen(false)}
                  className="h-9 px-4 rounded-xl border border-[#cfd6c9] bg-white text-[#1a2610] text-xs font-semibold hover:bg-[#EAEDE7] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="h-9 px-5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingReview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4F63D]" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <span>Kirim Ulasan</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* RATING BREAKDOWN CARD */}
          {stats?.totalReviews > 0 ? (
            <div className="rounded-2xl border border-[#dce1d6] bg-[#f4f5f1] p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
                {/* Score & Satisfaction Percentage */}
                <div className="md:col-span-5 flex flex-col justify-center space-y-2 border-b md:border-b-0 md:border-r border-[#dce1d6] pb-4 md:pb-0 md:pr-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-8 h-8 sm:w-9 sm:h-9 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex items-baseline gap-1 tabular-nums">
                      <span className="text-3xl sm:text-4xl font-extrabold text-[#1a2610] tracking-tight">
                        {stats.avgRating}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-[#5b6950]">/ 5.0</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-[#1a2610]">
                    {stats.satisfiedPercentage}% pembeli merasa puas
                  </p>

                  <div className="text-[11px] sm:text-xs text-[#5b6950] tabular-nums">
                    {stats.totalReviews} rating • {stats.totalReviews} ulasan
                  </div>
                </div>

                {/* Progress Bars 5 to 1 */}
                <div className="md:col-span-7 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((starNum) => {
                    const count = stats.breakdown?.[starNum] || 0;
                    const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

                    return (
                      <div key={starNum} className="flex items-center gap-2 text-xs text-[#526046] tabular-nums">
                        <div className="flex items-center gap-1 w-8 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-[#1a2610]">{starNum}</span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="flex-1 h-2 rounded-full bg-[#EAEDE7] overflow-hidden">
                          <div
                            className="h-full bg-[#233414] rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Count in Parentheses */}
                        <span className="w-12 text-right text-[11px] text-[#5b6950] shrink-0 font-medium">
                          ({count})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#dce1d6] flex items-center justify-center gap-2 text-[11px] text-[#5b6950]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#344d15]" />
                <span>Diambil dari pembeli terverifikasi Koperasi Sinar Pagi Sejahtera</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cfd6c9] bg-[#f4f5f1] p-6 sm:p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mx-auto mb-3">
                <Star className="w-5 h-5 text-[#233414]" />
              </div>
              <h3 className="text-sm font-bold text-[#1a2610]">Belum Ada Ulasan Pembeli</h3>
              <p className="text-xs text-[#526046] max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                Komoditas ini belum memiliki ulasan dari pembeli. Beli sekarang dan berikan penilaian setelah pesanan Anda selesai!
              </p>
              {productData.userState?.hasPurchased ? (
                <button
                  onClick={() => setIsReviewFormOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#D4F63D]" />
                  <span>Beri Ulasan Pertama</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#dce1d6] text-[#526046] text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#344d15]" />
                  <span>Ulasan dapat diberikan setelah Anda membeli komoditas ini</span>
                </div>
              )}
            </div>
          )}

          {/* LIST OF REVIEWS */}
          {reviews && reviews.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-[#1a2610] uppercase tracking-wider">
                Semua Ulasan ({reviews.length})
              </h3>

              <div className="divide-y divide-[#EAEDE7]">
                {reviews.map((rev: any) => {
                  const isHelpful = Boolean(helpfulLikes[rev.id]);

                  return (
                    <div key={rev.id} className="py-4 space-y-2">
                      {/* Rating Stars & Relative Time */}
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
                          {formatRelativeTime(rev.createdAt)}
                        </span>
                      </div>

                      {/* User Info (Avatar + Name) */}
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7 rounded-full border border-[#cfd6c9]">
                          <AvatarImage src={rev.user?.avatarUrl || ''} alt={rev.user?.name} />
                          <AvatarFallback className="bg-[#EAEDE7] text-[#233414] text-[10px] font-bold">
                            {rev.user?.name ? rev.user.name.slice(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-[#1a2610]">
                          {rev.user?.name || 'Pembeli Terverifikasi'}
                        </span>
                      </div>

                      {/* Purchased Variant Info */}
                      <div className="text-[11px] text-[#5b6950] font-medium">
                        Varian: {product.satuan} • Panen Koperasi
                      </div>

                      {/* Review Text */}
                      <p className="text-xs sm:text-[13px] text-[#1a2610] leading-relaxed">
                        {rev.komentar || 'Pembeli tidak memberikan komentar tertulis.'}
                      </p>

                      {/* Review Photos (if any) */}
                      {rev.fotoUrl && (
                        <div className="pt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rev.fotoUrl}
                            alt="Foto ulasan"
                            loading="lazy"
                            decoding="async"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-[#dce1d6]"
                          />
                        </div>
                      )}

                      {/* Footer Actions: Thumbs Up "Membantu" */}
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          onClick={() => toggleHelpful(rev.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            isHelpful
                              ? 'text-[#233414] bg-[#e2f2c8] border-[#c9e39e]'
                              : 'text-[#526046] border-transparent hover:text-[#1a2610] hover:bg-[#f4f5f1]'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${isHelpful ? 'fill-[#233414]' : ''}`} />
                          <span>Membantu {isHelpful ? '(1)' : ''}</span>
                        </button>

                        <button
                          onClick={() => {
                            showToast({
                              title: 'Balasan',
                              message: 'Fitur tanggapan petani akan segera hadir.',
                              type: 'info',
                            });
                          }}
                          className="text-xs text-[#5b6950] hover:text-[#1a2610] transition-colors cursor-pointer"
                        >
                          Lihat Balasan
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Lightbox / Modal Tampilan Gambar Resolusi Penuh (Ukuran Asli) */}
      {isImageModalOpen && (
        <div
          onClick={() => setIsImageModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in-0 duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[92vh] bg-[#1a2610] rounded-2xl overflow-hidden flex flex-col border border-[#344d15] cursor-default"
          >
            {/* Header Modal */}
            <div className="px-4 py-3 bg-[#233414] text-white flex items-center justify-between border-b border-[#344d15]">
              <div className="flex items-center gap-2 text-xs font-bold truncate pr-4">
                <span className="truncate">{product.nama}</span>
                <span className="text-[#D4F63D] font-normal">| Tampilan Ukuran Asli</span>
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Container Foto Full Size */}
            <div className="overflow-auto flex-1 flex items-center justify-center p-3 sm:p-6 bg-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  product.imageUrl ||
                  'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=1200&q=90'
                }
                alt={product.nama}
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-[78vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
