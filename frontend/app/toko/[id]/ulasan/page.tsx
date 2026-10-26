'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  ThumbsUp,
  MessageSquare,
  Loader2,
  Trash2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { toast } from 'sonner';
import { getPrimaryImage } from '@/lib/utils';

export default function ProductAllReviewsPage({
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

  // Filter state (ALL or 5, 4, 3, 2, 1)
  const [selectedStar, setSelectedStar] = useState<number | 'ALL'>('ALL');

  // Deleting state
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Helpful reaction counts state (local state map)
  const [helpfulLikes, setHelpfulLikes] = useState<{ [id: string]: boolean }>({});

  // Review Form state
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchProductDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Komoditas ini tidak ditemukan.');
        } else {
          setError('Gagal memuat informasi komoditas.');
        }
        return;
      }
      const data = await res.json();
      setProductData(data);
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
            Memuat semua ulasan komoditas...
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
          <div className="w-14 h-14 rounded-2xl bg-[#EAEDE7] text-[#233414] flex items-center justify-center mb-4 border border-[#cfd6c9]">
            <AlertCircle className="w-7 h-7 text-[#344d15]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1a2610] mb-1.5">
            Ulasan Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-[13px] text-[#526046] mb-6 leading-relaxed">
            {error || 'Komoditas tidak tersedia.'}
          </p>
          <Link
            href="/toko"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4F63D]" />
            <span>Kembali ke Toko</span>
          </Link>
        </div>
      </div>
    );
  }

  const { product, stats, reviews = [] } = productData;

  const filteredReviews = reviews.filter((r: any) => {
    if (selectedStar === 'ALL') return true;
    return Math.round(r.rating || 5) === selectedStar;
  });

  return (
    <div className="min-h-screen bg-white sm:bg-[#f4f5f1] flex flex-col font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="hidden sm:block">
        <AppHeader activePage="toko" />
      </div>

      {/* Mobile Top Bar (Fixed) */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white px-4 h-14 flex items-center justify-between border-b border-[#EAEDE7] shadow-2xs">
        <button
          type="button"
          onClick={() => router.push(`/toko/${productId}`)}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
          aria-label="Kembali ke Detail Komoditas"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-[#1a2610] truncate max-w-[200px]">
          Ulasan Pembeli ({reviews.length})
        </span>

        <div className="w-10" />
      </div>
      <div className="sm:hidden h-14 shrink-0 pointer-events-none" aria-hidden="true" />

      {/* Desktop Subbar */}
      <div className="hidden sm:block bg-white border-b border-[#dce1d6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-[#5b6950]">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <Link
              href={`/toko/${productId}`}
              className="text-[#1a2610] hover:text-[#344d15] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Detail {product.nama}</span>
            </Link>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#526046] font-medium">Semua Ulasan</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        {/* Compact Product Banner Card */}
        <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPrimaryImage(product.imageUrl, 'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=300&q=80')}
                alt={product.nama}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-bold text-[#526046] uppercase tracking-wider mb-0.5">
                {product.kategori}
              </span>
              <h1 className="text-sm sm:text-base font-bold text-[#1a2610] truncate">
                {product.nama}
              </h1>
              <p className="text-xs text-[#344d15] font-bold mt-0.5">
                Rp {Number(product.hargaPerSatuan || 0).toLocaleString('id-ID')}{' '}
                <span className="text-[11px] font-normal text-[#5b6950]">/ {product.satuan}</span>
              </p>
            </div>
          </div>

          <Link
            href={`/toko/${productId}`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dce1d6] text-xs font-semibold text-[#1a2610] hover:bg-[#EAEDE7] transition-colors shrink-0"
          >
            <span>Rincian Produk</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#5b6950]" />
          </Link>
        </div>

        {/* Rating Breakdown Overview */}
        <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dce1d6] pb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#1a2610] uppercase tracking-tight">
                Ringkasan Penilaian
              </h2>
              <p className="text-xs text-[#526046] mt-0.5">
                Total {stats?.totalReviews || reviews.length} ulasan dari pembeli komoditas ini
              </p>
            </div>

            {productData.userState?.hasPurchased && (
              <button
                onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                className="h-9 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D4F63D]" />
                <span>{isReviewFormOpen ? 'Tutup Formulir' : 'Tulis Ulasan'}</span>
              </button>
            )}
          </div>

          {/* Form Tulis Ulasan (Collapsible) */}
          {isReviewFormOpen && productData.userState?.hasPurchased && (
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

          {/* Score & Breakdown */}
          {stats?.totalReviews > 0 ? (
            <div className="rounded-2xl border border-[#dce1d6] bg-[#f4f5f1] p-5 sm:p-7">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-center">
                <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-center space-y-2 border-b md:border-b-0 md:border-r border-[#dce1d6] pb-4 md:pb-0 md:pr-6 lg:pr-10">
                  <div className="flex items-center gap-2">
                    <Star className="w-8 h-8 sm:w-9 sm:h-9 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex items-baseline gap-1 tabular-nums">
                      <span className="text-3xl sm:text-4xl font-extrabold text-[#1a2610] tracking-tight">
                        {Number(stats.avgRating || 5).toFixed(1)}
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

                <div className="md:col-span-7 lg:col-span-8 space-y-2">
                  {[5, 4, 3, 2, 1].map((starNum) => {
                    const count = stats.breakdown?.[starNum] || 0;
                    const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

                    return (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => setSelectedStar(selectedStar === starNum ? 'ALL' : starNum)}
                        className={`w-full flex items-center gap-2 text-xs tabular-nums p-1 rounded-lg transition-colors cursor-pointer text-left ${
                          selectedStar === starNum ? 'bg-[#EAEDE7]' : 'hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center gap-1 w-8 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-[#1a2610]">{starNum}</span>
                        </div>

                        <div className="flex-1 h-2 rounded-full bg-[#EAEDE7] overflow-hidden">
                          <div
                            className="h-full bg-[#233414] rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <span className="w-12 text-right text-[11px] text-[#5b6950] shrink-0 font-medium">
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#dce1d6] flex items-center justify-center gap-2 text-[11px] text-[#5b6950]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#344d15]" />
                <span>Diambil dari ulasan pembeli Koperasi Sinar Pagi Sejahtera</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cfd6c9] bg-[#f4f5f1] p-6 text-center">
              <p className="text-xs text-[#526046]">Belum ada data ulasan untuk komoditas ini.</p>
            </div>
          )}
        </div>

        {/* Filter Tabs by Star */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedStar('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStar === 'ALL'
                ? 'bg-[#233414] text-white shadow-2xs'
                : 'bg-white border border-[#dce1d6] text-[#526046] hover:bg-[#EAEDE7]'
            }`}
          >
            Semua ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((starNum) => {
            const count = stats?.breakdown?.[starNum] || 0;
            return (
              <button
                key={starNum}
                type="button"
                onClick={() => setSelectedStar(starNum)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedStar === starNum
                    ? 'bg-[#233414] text-white shadow-2xs'
                    : 'bg-white border border-[#dce1d6] text-[#526046] hover:bg-[#EAEDE7]'
                }`}
              >
                <Star className={`w-3 h-3 ${selectedStar === starNum ? 'fill-[#D4F63D] text-[#D4F63D]' : 'fill-amber-400 text-amber-400'}`} />
                <span>{starNum} Bintang ({count})</span>
              </button>
            );
          })}
        </div>

        {/* Review List */}
        <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAEDE7] pb-3">
            <h3 className="text-xs font-bold text-[#1a2610] uppercase tracking-wider">
              Daftar Ulasan {selectedStar !== 'ALL' ? `(${selectedStar} Bintang)` : ''} ({filteredReviews.length})
            </h3>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#f4f5f1] border border-[#cfd6c9] text-[#526046] flex items-center justify-center mx-auto">
                <Star className="w-5 h-5 text-[#5b6950]" />
              </div>
              <h4 className="text-xs font-bold text-[#1a2610]">Tidak Ada Ulasan</h4>
              <p className="text-[11px] text-[#526046]">
                {selectedStar !== 'ALL'
                  ? `Belum ada ulasan dengan penilaian ${selectedStar} bintang.`
                  : 'Belum ada ulasan untuk komoditas ini.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EAEDE7]">
              {filteredReviews.map((rev: any) => {
                const isHelpful = Boolean(helpfulLikes[rev.id]);
                const isOwnReview =
                  Boolean(user?.id) &&
                  (rev.userId === user?.id || rev.user?.id === user?.id);

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

                    {/* User Info & Delete Action for Own Review */}
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7 rounded-full border border-[#cfd6c9]">
                        <AvatarImage src={rev.user?.avatarUrl || ''} alt={rev.user?.name} />
                        <AvatarFallback className="bg-[#EAEDE7] text-[#233414] text-[10px] font-bold">
                          {rev.user?.name ? rev.user.name.slice(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-[#1a2610]">
                        {rev.user?.name || 'Pembeli Koperasi'}
                      </span>

                      {isOwnReview && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          disabled={deletingReviewId === rev.id}
                          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer text-xs font-medium border border-red-200 disabled:opacity-50"
                          title="Hapus Ulasan Anda"
                        >
                          {deletingReviewId === rev.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">Hapus Ulasan</span>
                        </button>
                      )}
                    </div>

                    {/* Review Text */}
                    <p className="text-xs sm:text-[13px] text-[#1a2610] leading-relaxed">
                      {rev.komentar || 'Pembeli tidak memberikan komentar tertulis.'}
                    </p>

                    {/* Review Photos */}
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

                    {/* Helpful Button */}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#5b6950]">
                      <button
                        type="button"
                        onClick={() => toggleHelpful(rev.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                          isHelpful
                            ? 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e] font-semibold'
                            : 'bg-white text-[#526046] border-[#dce1d6] hover:bg-[#EAEDE7]'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isHelpful ? 'fill-[#233414] text-[#233414]' : ''}`} />
                        <span>Membantu {isHelpful ? '(1)' : ''}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
