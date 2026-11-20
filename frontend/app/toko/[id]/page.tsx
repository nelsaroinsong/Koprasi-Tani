'use client';

import React, { useState, useEffect, use, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  Minus,
  Plus,
  ArrowLeft,
  ChevronLeft,
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
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { toast } from 'sonner';
import { getCart, saveCart } from '@/lib/cart';
import RatingAndReviewsShowcase from '@/components/reviews/RatingAndReviewsShowcase';

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

  // Carousel & Image States
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

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
  }, [fetchProductDetail, user?.id]);

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
      const stock = Math.max(0, Number(prod.stok) || 0);
      const inCart = itemIdx > -1 ? existingCart[itemIdx].quantity || 0 : 0;
      const addable = Math.min(quantity, stock - inCart);

      // Jumlah di keranjang tidak boleh melebihi stok gudang
      if (addable <= 0) {
        showToast({
          title: 'Stok Sudah di Keranjang',
          message: `Semua stok "${prod.nama}" (${stock} ${prod.satuan}) sudah ada di keranjang Anda.`,
          type: 'info',
        });
        if (redirectAfter) router.push('/checkout/toko');
        return;
      }

      if (itemIdx > -1) {
        existingCart[itemIdx].quantity = inCart + addable;
        existingCart[itemIdx].stok = stock;
      } else {
        existingCart.push({
          id: prod.id,
          nama: prod.nama,
          kategori: prod.kategori,
          hargaPerSatuan: Number(prod.hargaPerSatuan),
          satuan: prod.satuan,
          imageUrl: prod.imageUrl,
          quantity: addable,
          stok: stock,
          petaniName: productData.petani?.name || 'Petani Binaan',
        });
      }

      saveCart(existingCart, user);

      showToast({
        title: 'Dimasukkan ke Keranjang',
        message:
          addable < quantity
            ? `Hanya ${addable} ${prod.satuan} "${prod.nama}" ditambahkan — sisa stok sudah ada di keranjang (total ${inCart + addable} ${prod.satuan}).`
            : `${addable} ${prod.satuan} "${prod.nama}" berhasil ditambahkan ke keranjang.`,
        type: 'success',
      });

      if (redirectAfter) {
        router.push('/checkout/toko');
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

    if (!productData?.userState?.hasPurchased) {
      showToast({
        title: 'Tidak Dapat Memberikan Ulasan',
        message: 'Ulasan hanya dapat diberikan setelah Anda berhasil membeli dan pesanan komoditas ini berstatus Selesai.',
        type: 'error',
      });
      setIsReviewFormOpen(false);
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

  const executeDeleteReview = async (reviewId: string) => {
    try {
      setDeletingReviewId(reviewId);
      const res = await fetch(`/api/products/${productId}/reviews?reviewId=${reviewId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast({
          title: 'Ulasan Dihapus',
          message: 'Ulasan Anda berhasil dihapus.',
          type: 'success',
        });
        fetchProductDetail();
      } else {
        showToast({
          title: 'Gagal Menghapus Ulasan',
          message: data.error || 'Terjadi kesalahan saat menghapus ulasan.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error delete review:', err);
      showToast({
        title: 'Gagal Menghapus Ulasan',
        message: 'Terjadi kendala koneksi ke server.',
        type: 'error',
      });
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    toast('Hapus Ulasan Anda?', {
      description: 'Apakah Anda yakin ingin menghapus ulasan ini secara permanen?',
      action: {
        label: 'Hapus',
        onClick: () => executeDeleteReview(reviewId),
      },
      cancel: {
        label: 'Batal',
        onClick: () => {},
      },
      actionButtonStyle: {
        backgroundColor: '#dc2626',
        color: '#ffffff',
      },
      duration: 8000,
    });
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

  // Multiple Images Parser (Daftar seluruh foto produk terdaftar)
  const rawImageUrl = product?.imageUrl;
  const productImages: string[] = rawImageUrl
    ? (rawImageUrl.includes(',')
        ? rawImageUrl.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [rawImageUrl])
    : ['https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=800&q=80'];

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth > 0) {
      const newIndex = Math.round(scrollLeft / clientWidth);
      if (newIndex !== currentImageIndex && newIndex >= 0 && newIndex < productImages.length) {
        setCurrentImageIndex(newIndex);
      }
    }
  };

  const scrollToImage = (index: number) => {
    if (!carouselRef.current) return;
    const clientWidth = carouselRef.current.clientWidth;
    carouselRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth',
    });
    setCurrentImageIndex(index);
  };

  // Preset options for quantity pills (like 50 ml / 100 ml / 150 ml in Gambar 5)
  const quickPresets = [1, 2, 5, 10, 25].filter(
    (val) => val <= maxStock || val === 1
  );

  return (
    <div className="min-h-screen bg-white sm:bg-[#f4f5f1] flex flex-col font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="hidden sm:block">
        <AppHeader activePage="toko" />
      </div>

      {/* Desktop Compact Back & Share Subbar */}
      <div className="hidden sm:block bg-white border-b border-[#dce1d6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-[#5b6950]">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <button
              type="button"
              onClick={() => router.push('/toko')}
              className="text-[#1a2610] hover:text-[#344d15] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Katalog</span>
            </button>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#526046] font-medium">{product.kategori}</span>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#1a2610] font-bold truncate max-w-xs">
              {product.nama}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[#526046] hover:text-[#233414] px-2.5 py-1 rounded-lg hover:bg-[#EAEDE7] transition-colors cursor-pointer text-xs font-medium"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-2 pb-36 sm:pb-12 sm:py-6 lg:py-8 space-y-6">
        {/* Top Product Detail Section (Edge-to-edge on mobile, 2 columns on desktop) */}
        <div className="bg-white sm:rounded-3xl sm:border sm:border-[#dce1d6] p-0 sm:p-6 lg:p-8 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 sm:gap-8 lg:gap-10 items-start">
            {/* Left Column: Clean Edge-to-Edge Product Image Card with Floating Back Button & Dynamic Photo Pill */}
            <div className="md:col-span-5 flex flex-col items-center w-full">
              <div className="relative aspect-square w-full sm:rounded-3xl rounded-none overflow-hidden bg-[#f4f5f1] border-b border-[#EAEDE7] sm:border group">
                {/* Floating Back Button directly on top of the product photo (Mobile only) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      typeof window !== 'undefined' &&
                      window.history.length > 1 &&
                      (window.history.state?.idx === undefined || window.history.state?.idx > 0)
                    ) {
                      router.back();
                    } else {
                      router.push('/toko');
                    }
                  }}
                  className="sm:hidden absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white backdrop-blur-md shadow-xs border border-black/5 flex items-center justify-center text-neutral-800 active:scale-95 transition-all cursor-pointer"
                  aria-label="Kembali"
                >
                  <ChevronLeft className="w-5 h-5 text-neutral-800" />
                </button>

                {/* Horizontal Swipe / Scroll Image Carousel */}
                <div
                  ref={carouselRef}
                  onScroll={handleScroll}
                  onClick={() => setIsImageModalOpen(true)}
                  className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar cursor-zoom-in"
                  title="Klik untuk memperbesar foto atau geser ke samping"
                >
                  {productImages.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="w-full h-full shrink-0 snap-center relative aspect-square overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={`${product.nama} - Foto ${idx + 1}`}
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="w-full h-full object-cover pointer-events-none select-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Desktop Prev / Next Navigation Arrows (Only when > 1 image) */}
                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToImage(Math.max(0, currentImageIndex - 1));
                      }}
                      disabled={currentImageIndex === 0}
                      className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-slate-800 backdrop-blur-md shadow-md border border-slate-200/80 items-center justify-center transition cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
                      title="Foto sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToImage(Math.min(productImages.length - 1, currentImageIndex + 1));
                      }}
                      disabled={currentImageIndex === productImages.length - 1}
                      className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-slate-800 backdrop-blur-md shadow-md border border-slate-200/80 items-center justify-center transition cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
                      title="Foto berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Total Photo Pill Badge on Bottom-Right (Dynamic "{currentImageIndex + 1}/{productImages.length}") */}
                <div className="absolute bottom-4 right-4 z-20 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-md border border-black/5 shadow-xs flex items-center justify-center pointer-events-none">
                  <span className="text-[11px] sm:text-xs font-semibold text-neutral-700 tabular-nums">
                    {currentImageIndex + 1}/{productImages.length}
                  </span>
                </div>
              </div>

              {/* Thumbnails list below main image (Only when > 1 image) */}
              {productImages.length > 1 && (
                <div className="w-full flex items-center justify-center gap-2 mt-3 px-2 overflow-x-auto no-scrollbar">
                  {productImages.map((thumbSrc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToImage(idx)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                        currentImageIndex === idx
                          ? 'border-[#233414] shadow-xs ring-1 ring-[#233414]'
                          : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                      title={`Lihat foto ${idx + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbSrc}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Clean Product Details */}
            <div className="md:col-span-7 flex flex-col space-y-4 px-4 sm:px-0 pt-4 sm:pt-0 pb-4 sm:pb-0">
              {/* Brand / Category Label + Title + Rating + Price */}
              <div>
                <div className="text-xs font-medium text-[#5b6950]">
                  {product.kategori} • {petani?.name || 'Petani Binaan Koperasi'}
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1a2610] tracking-tight leading-snug mt-1">
                  {product.nama}
                </h1>

                {/* Star Rating & Reviews Count (Gambar 5 style) */}
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(Number(stats?.avgRating || 5))
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-[#EAEDE7] text-[#cfd6c9]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-[#1a2610] tabular-nums">
                    {stats?.totalReviews > 0 ? stats.avgRating : '5.0'}
                  </span>
                  <span className="text-[#5b6950] tabular-nums">
                    ({stats?.totalReviews || 0} ulasan)
                  </span>
                  <span className="text-[#cfd6c9]">•</span>
                  <span className="text-[#526046] tabular-nums">
                    {product.totalSold ? `${product.totalSold} ${product.satuan} terjual` : 'Panen Baru'}
                  </span>
                </div>

                {/* Bold Price */}
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-[#1a2610] tracking-tight tabular-nums">
                    Rp {unitPrice.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs sm:text-sm text-[#5b6950] font-semibold">
                    / {product.satuan}
                  </span>
                </div>
              </div>

              {/* Quantity / Package Pill Selector + Stepper (Gambar 5 "50 ml | 100 ml | 150 ml" style) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#526046]">Pilih Kuantitas ({product.satuan})</span>
                  <span className="text-[#5b6950] tabular-nums">
                    Subtotal: <strong className="text-[#233414]">Rp {totalPrice.toLocaleString('id-ID')}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {quickPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(preset)}
                      disabled={isOutOfStock}
                      className={`h-9 px-3.5 rounded-xl text-xs transition-all cursor-pointer tabular-nums ${
                        quantity === preset
                          ? 'bg-white text-[#1a2610] border-2 border-[#1a2610] font-extrabold shadow-2xs'
                          : 'bg-white text-[#526046] border border-[#dce1d6] hover:border-[#344d15] font-semibold'
                      }`}
                    >
                      {preset} {product.satuan}
                    </button>
                  ))}

                  {/* Custom Stepper Pill */}
                  <div className="inline-flex items-center h-9 rounded-xl border border-[#dce1d6] bg-[#f4f5f1] px-1 ml-auto sm:ml-0">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1a2610] hover:bg-white disabled:opacity-30 cursor-pointer transition"
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
                      className="w-10 text-center text-xs font-extrabold text-[#1a2610] bg-transparent focus:outline-none tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.min(maxStock, prev + 1))}
                      disabled={quantity >= maxStock || isOutOfStock}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1a2610] hover:bg-white disabled:opacity-30 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact Status Checklist (Gambar 5 "In stock" & "Free delivery" style) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2.5 text-xs text-[#1a2610]">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-[#e2f2c8] text-[#344d15]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOutOfStock ? 'bg-red-600' : 'bg-[#547318]'
                      }`}
                    />
                  </span>
                  <span className="font-medium">
                    {isOutOfStock
                      ? 'Stok habis di gudang koperasi'
                      : `Tersedia di gudang (${maxStock.toLocaleString('id-ID')} ${product.satuan} siap ambil)`}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-[#526046]">
                  <Warehouse className="w-4 h-4 text-[#5b6950] shrink-0" />
                  <span>Serah terima fisik & bayar tunai di Kasir Koperasi (Bebas Biaya Admin)</span>
                </div>
              </div>

              {/* Description Text (Gambar 5 Clean Paragraph Style) */}
              <div className="pt-2 border-t border-[#EAEDE7]">
                <p className="text-xs sm:text-[13px] text-[#526046] leading-relaxed whitespace-pre-line">
                  {product.deskripsi ||
                    `Komoditas segar ${product.nama} hasil panen anggota binaan Koperasi Sinar Pagi Sejahtera. Telah melewati seleksi mutu dan penimbangan resmi di gudang koperasi untuk memastikan kesegaran dan kepuasan pembeli.`}
                </p>
              </div>

              {/* Compact Petani Info Row */}
              <div className="p-3 rounded-2xl border border-[#EAEDE7] bg-[#f4f5f1]/70 flex items-center justify-between gap-3">
                <Link
                  href={`/toko/petani/${product.petaniId}`}
                  className="flex items-center gap-2.5 min-w-0 group"
                >
                  <Avatar className="w-10 h-10 rounded-full border border-[#cfd6c9] shrink-0">
                    <AvatarImage src={petani?.avatarUrl || ''} alt={petani?.name} />
                    <AvatarFallback className="bg-[#EAEDE7] text-[#233414] font-bold text-xs">
                      {petani?.name ? petani.name.slice(0, 2).toUpperCase() : 'PT'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] truncate">
                        {petani?.name || 'Petani Koperasi'}
                      </span>
                      {petani?.isVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#344d15] fill-[#e2f2c8] shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-[#5b6950] truncate">
                      {petani?.address || 'Minahasa Utara'} • {followersCount} pengikut
                    </div>
                  </div>
                </Link>

                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`h-8 px-3 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                    isFollowed
                      ? 'bg-white border border-[#cfd6c9] text-[#1a2610]'
                      : 'bg-[#233414] text-white hover:bg-[#344d15]'
                  }`}
                >
                  {isFollowLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isFollowed ? (
                    <span>Mengikuti</span>
                  ) : (
                    <span>+ Ikuti</span>
                  )}
                </button>
              </div>

              {/* Desktop Action Bar (Matching Gambar 5 Bottom Bar) */}
              <div className="hidden sm:flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleAddToCart(true)}
                  disabled={isOutOfStock}
                  className="h-12 px-5 rounded-2xl bg-[#EAEDE7] hover:bg-[#dce1d6] text-[#1a2610] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Beli & Langsung ke Checkout"
                >
                  <ShoppingBag className="w-4 h-4 text-[#233414]" />
                  <span>Beli Langsung</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  disabled={isOutOfStock}
                  className={`flex-1 h-12 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm ${
                    isOutOfStock
                      ? 'bg-[#83917d] text-white cursor-not-allowed opacity-80 shadow-none'
                      : 'bg-[#344d15] hover:bg-[#233414] text-white cursor-pointer'
                  }`}
                >
                  <ShoppingCart className={`w-4 h-4 ${isOutOfStock ? 'text-white/80' : 'text-[#D4F63D]'}`} />
                  <span>
                    {isOutOfStock
                      ? 'Stok Kosong'
                      : `+ Keranjang • Rp ${totalPrice.toLocaleString('id-ID')}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ULASAN PEMBELI (Taste Skills: Rating & Reviews Showcase) */}
        <div className="space-y-4 px-4 sm:px-0">
          {/* Form Tulis Ulasan (Collapsible) */}
          {isReviewFormOpen && productData.userState?.hasPurchased && (
            <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-[#dce1d6] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1a2610]">Beri Bintang &amp; Ulasan Komoditas</h3>
                  <p className="text-xs text-[#526046] mt-0.5">Ulasan Anda membantu pembeli lain dan petani binaan koperasi.</p>
                </div>
                <span className="text-xs font-semibold text-[#233414] tabular-nums bg-[#eaede7] px-2.5 py-1 rounded-full">
                  Nilai: {newRating} dari 5
                </span>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4 pt-1">
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
                    className="w-full p-3.5 rounded-xl border border-[#cfd6c9] bg-[#fbfcf9] text-xs sm:text-[13px] text-[#1a2610] placeholder:text-[#68785b] focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] transition-colors"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewFormOpen(false)}
                    className="h-9 px-4 rounded-full border border-[#cfd6c9] bg-white text-[#1a2610] text-xs font-semibold hover:bg-[#EAEDE7] transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="h-9 px-5 rounded-full bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-2xs"
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
            </div>
          )}

          <RatingAndReviewsShowcase
            stats={stats}
            reviews={reviews}
            currentUserId={user?.id}
            canReview={Boolean(productData.userState?.hasPurchased)}
            isReviewFormOpen={isReviewFormOpen}
            onToggleReviewForm={() => setIsReviewFormOpen(!isReviewFormOpen)}
            onDeleteReview={handleDeleteReview}
            deletingReviewId={deletingReviewId}
            seeAllUrl={`/toko/${product.id}/ulasan`}
            itemTypeLabel="komoditas"
          />
        </div>
      </main>

      {/* Fixed Bottom Action Bar on Mobile: OUTSIDE <main>, anchored directly to the viewport */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#dce1d6] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          disabled={isOutOfStock}
          className="w-12 h-12 rounded-2xl bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#dce1d6] text-[#1a2610] flex items-center justify-center shrink-0 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Beli Langsung ke Checkout"
        >
          <ShoppingBag className="w-5 h-5 text-[#233414]" />
        </button>

        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          disabled={isOutOfStock}
          className={`flex-1 h-12 px-5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm ${
            isOutOfStock
              ? 'bg-[#83917d] text-white cursor-not-allowed opacity-80 shadow-none'
              : 'bg-[#233414] hover:bg-[#344d15] text-white cursor-pointer'
          }`}
        >
          <span>
            {isOutOfStock
              ? 'Stok Kosong'
              : `+ Keranjang • Rp ${totalPrice.toLocaleString('id-ID')}`}
          </span>
        </button>
      </div>

      {/* Lightbox / Modal Tampilan Gambar Resolusi Penuh (Clean Image-Only Cinema View) */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out select-none"
          onClick={() => setIsImageModalOpen(false)}
        >
          {/* Close button on top-right */}
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="fixed top-4 right-4 z-50 w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-black/45 hover:bg-black/65 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Prev / Next Chevrons */}
          {productImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentImageIndex === 0}
                className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/45 hover:bg-black/65 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/15 shadow-md flex items-center justify-center transition-all cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
                title="Foto sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => Math.min(productImages.length - 1, prev + 1));
                }}
                disabled={currentImageIndex === productImages.length - 1}
                className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/45 hover:bg-black/65 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/15 shadow-md flex items-center justify-center transition-all cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
                title="Foto berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Pure Image Only - No White Card/Background */}
          <div
            className="relative max-w-[92vw] max-h-[85vh] flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                productImages[currentImageIndex] ||
                productImages[0] ||
                'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=1200&q=90'
              }
              alt={`${product.nama} - Foto ${currentImageIndex + 1}`}
              loading="lazy"
              decoding="async"
              className="max-w-[92vw] max-h-[82vh] w-auto h-auto object-contain rounded-xl select-none drop-shadow-2xl"
            />
          </div>

          {/* Photo Counter Pill at bottom */}
          {productImages.length > 1 && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white/90 font-medium text-[11px] sm:text-xs tabular-nums">
              {currentImageIndex + 1} / {productImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
