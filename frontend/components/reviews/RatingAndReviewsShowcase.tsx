'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  PenLine,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ReviewItem {
  id: string;
  rating: number;
  komentar?: string;
  createdAt: string;
  userId?: string;
  user?: {
    id?: string;
    name?: string;
    avatarUrl?: string;
  };
  userName?: string;
  userAvatar?: string;
  fotoUrl?: string;
}

export interface RatingStats {
  totalReviews: number;
  avgRating: string | number;
  satisfiedPercentage?: number;
  breakdown?: Record<number, number>;
}

interface RatingAndReviewsShowcaseProps {
  stats?: RatingStats;
  reviews?: ReviewItem[];
  currentUserId?: string;
  canReview?: boolean;
  isReviewFormOpen?: boolean;
  onToggleReviewForm?: () => void;
  onDeleteReview?: (reviewId: string) => Promise<void> | void;
  deletingReviewId?: string | null;
  seeAllUrl: string;
  itemTypeLabel?: string; // 'komoditas' | 'alat'
}

function formatReviewDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Baru saja';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Baru saja';
  }
}

export default function RatingAndReviewsShowcase({
  stats,
  reviews = [],
  currentUserId,
  canReview = false,
  isReviewFormOpen = false,
  onToggleReviewForm,
  onDeleteReview,
  deletingReviewId,
  seeAllUrl,
  itemTypeLabel = 'komoditas',
}: RatingAndReviewsShowcaseProps) {
  // Max 3 reviews shown in the showcase card carousel
  const displayReviews = reviews.slice(0, 3);
  const [currentIndex, setCurrentIndex] = useState(0);

  const totalReviewsCount = stats?.totalReviews || reviews.length || 0;
  const rawAvg = Number(stats?.avgRating || (totalReviewsCount > 0 ? 5 : 0));
  const formattedScore = rawAvg.toFixed(1).replace('.', ',');

  const currentReview = displayReviews[currentIndex];
  const isOwnReview =
    Boolean(currentUserId) &&
    Boolean(currentReview) &&
    (currentReview?.userId === currentUserId || currentReview?.user?.id === currentUserId);

  const handleNext = () => {
    if (displayReviews.length <= 1) return;
    setCurrentIndex((prev) => (prev < displayReviews.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (displayReviews.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : displayReviews.length - 1));
  };

  return (
    <section className="bg-white rounded-[28px] border border-[#dce1d6] p-5 sm:p-7 lg:p-8 space-y-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      {/* Header: Title "Rating & Reviews" + "Tulis Ulasan" button if eligible */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a2610] tracking-tight">
            Rating &amp; Reviews
          </h2>
        </div>

        {canReview && onToggleReviewForm && (
          <button
            type="button"
            onClick={onToggleReviewForm}
            className="h-9 px-4 rounded-full bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <PenLine className="w-3.5 h-3.5 text-[#D4F63D]" />
            <span>{isReviewFormOpen ? 'Tutup Formulir' : 'Tulis Ulasan'}</span>
          </button>
        )}
      </div>

      {totalReviewsCount === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-[#cfd6c9] bg-[#f7f8f5] p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mx-auto mb-3">
            <Star className="w-5 h-5 text-[#233414]" />
          </div>
          <h3 className="text-sm font-bold text-[#1a2610]">Belum Ada Rating &amp; Ulasan</h3>
          <p className="text-xs text-[#526046] max-w-md mx-auto mt-1 mb-4 leading-relaxed">
            {itemTypeLabel === 'alat'
              ? 'Unit alsintan ini belum memiliki ulasan dari penyewa. Sewa sekarang dan berikan ulasan setelah penggunaan selesai!'
              : 'Komoditas ini belum memiliki ulasan dari pembeli. Beli sekarang dan berikan penilaian setelah pesanan Anda selesai!'}
          </p>
          {canReview && onToggleReviewForm && !isReviewFormOpen && (
            <button
              type="button"
              onClick={onToggleReviewForm}
              className="inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5 text-[#D4F63D]" />
              <span>Beri Ulasan Pertama</span>
            </button>
          )}
        </div>
      ) : (
        /* Main Rating & Reviews Content: 2 Columns Layout */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Big Score & Star Distribution Breakdown */}
            <div className="lg:col-span-6 flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-8 bg-[#fafbfa] sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-0 border-[#eef1eb]">
              {/* Score Display (Giant 4,5 / 5) */}
              <div className="flex flex-col items-center sm:items-start shrink-0 min-w-[130px]">
                <div className="flex items-baseline gap-1 text-[#1a2610]">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight leading-none tabular-nums">
                    {formattedScore}
                  </span>
                  <span className="text-xl sm:text-2xl font-light text-[#73826a] tracking-tight">
                    / 5
                  </span>
                </div>
                <span className="text-xs text-[#68785b] font-medium mt-2 tabular-nums">
                  ({totalReviewsCount} Ulasan)
                </span>
              </div>

              {/* Star Distribution Progress Bars (5 down to 1) */}
              <div className="flex-1 w-full space-y-2 max-w-sm">
                {[5, 4, 3, 2, 1].map((starNum) => {
                  const count = stats?.breakdown?.[starNum] || 0;
                  const percent =
                    totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;

                  return (
                    <div
                      key={starNum}
                      className="flex items-center gap-2.5 text-xs text-[#1a2610] font-medium"
                    >
                      <div className="flex items-center gap-1 w-7 shrink-0 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold text-[#1a2610] tabular-nums">
                          {starNum}
                        </span>
                      </div>

                      {/* Thin Progress Track with Rounded Solid Pill */}
                      <div className="flex-1 h-2 rounded-full bg-[#eaede7] overflow-hidden">
                        <div
                          className="h-full bg-[#1a2610] rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Review Card Carousel (matching media design) */}
            <div className="lg:col-span-6 relative">
              {currentReview ? (
                <div className="relative rounded-[24px] border border-[#e2e7dc] bg-[#fbfcf9] p-5 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] min-h-[190px] sm:min-h-[210px] flex flex-col justify-between">
                  {/* Top: Reviewer Name, Stars, Date & Delete */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#1a2610] tracking-tight line-clamp-1">
                          {currentReview.user?.name || currentReview.userName || 'Pengguna Koperasi'}
                        </h3>
                        {/* 5 Rating Stars */}
                        <div className="flex items-center gap-0.5 mt-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= currentReview.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-[#eaede7] text-[#cfd6c9]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#73826a] font-normal tabular-nums">
                          {formatReviewDate(currentReview.createdAt)}
                        </span>
                        {isOwnReview && onDeleteReview && (
                          <button
                            type="button"
                            onClick={() => onDeleteReview(currentReview.id)}
                            disabled={deletingReviewId === currentReview.id}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Ulasan Anda"
                          >
                            {deletingReviewId === currentReview.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle: Review Quote with AnimatePresence */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentReview.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                      >
                        <p className="text-xs sm:text-[13px] text-[#404c35] leading-relaxed line-clamp-3 sm:line-clamp-4 mt-3">
                          &ldquo;{currentReview.komentar || 'Pengguna memberikan penilaian bintang tanpa ulasan tertulis.'}&rdquo;
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Bottom: Avatar on Left, Segmented Pill Progress in Center, Next Arrow on Right */}
                  <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-[#edf0ea]">
                    {/* Reviewer Avatar */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Avatar className="w-9 h-9 rounded-full border border-[#dce1d6] shrink-0">
                        <AvatarImage
                          src={currentReview.user?.avatarUrl || currentReview.userAvatar || ''}
                          alt={currentReview.user?.name || currentReview.userName}
                        />
                        <AvatarFallback className="bg-[#eaede7] text-[#233414] text-xs font-bold">
                          {(currentReview.user?.name || currentReview.userName || 'U')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Segmented Pill Indicator (matches the bottom bar in image) */}
                    {displayReviews.length > 1 && (
                      <div className="flex items-center gap-1.5 h-1.5">
                        {displayReviews.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              idx === currentIndex
                                ? 'w-8 bg-[#1a2610]'
                                : 'w-2.5 bg-[#dce1d6] hover:bg-[#b8c4ae]'
                            }`}
                            title={`Ulasan ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Navigation Arrows */}
                    {displayReviews.length > 1 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#dce1d6] bg-white hover:bg-[#eaede7] text-[#1a2610] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                          title="Ulasan sebelumnya"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#dce1d6] bg-white hover:bg-[#eaede7] text-[#1a2610] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                          title="Ulasan selanjutnya"
                        >
                          <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Bottom Action: "Lihat Semua {totalReviewsCount} Ulasan" if more than 3 reviews */}
          {totalReviewsCount > 3 && (
            <div className="pt-2 flex justify-center">
              <Link
                href={seeAllUrl}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#233414] bg-white hover:bg-[#233414] text-[#233414] hover:text-white text-xs font-bold transition-all group cursor-pointer shadow-2xs"
              >
                <span>Lihat Semua {totalReviewsCount} Ulasan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
