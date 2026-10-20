'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import LocationMapPreview from '@/components/LocationMapPreview';
import {
  Tractor,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Package,
  Wrench,
  UserCheck,
  MessageCircle,
  Plus,
  Minus,
  Maximize2,
  X,
  Loader2,
  Share2,
  MapPin,
  FileText,
  ShoppingCart,
  AlertCircle,
  Star,
  ThumbsUp,
  MessageSquare,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
  addToRentalCart,
  getRentalCart,
  type RentalCartItem,
} from '@/lib/rental-cart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface EquipmentDetail {
  id: string;
  nama: string;
  kategori: string;
  deskripsi: string | null;
  spesifikasi: string | null;
  hargaSewa: number;
  satuanSewa: string;
  biayaOperator: number | null;
  stokUnit: number;
  stokTersedia?: number;
  unitDisewa?: number;
  kondisi: string;
  imageUrl: string | null;
  isTersedia: boolean;
  kontakPj: string | null;
}

export default function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const equipmentId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Booking State
  const [jumlahUnit, setJumlahUnit] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [durasi, setDurasi] = useState(1);
  const [includeOperator, setIncludeOperator] = useState(false);
  const [lokasiLahan, setLokasiLahan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Lightbox Foto Ukuran Penuh
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Modal Langsung Sewa Sekarang
  const [isDirectCheckoutOpen, setIsDirectCheckoutOpen] = useState(false);

  // Review & Rating State
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [hasRented, setHasRented] = useState<boolean>(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [helpfulLikes, setHelpfulLikes] = useState<{ [id: string]: boolean }>({});
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: equipment?.nama || 'Unit Alsintan Koperasi',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast({
        title: 'Tautan Disalin',
        message: 'Tautan sewa alat berhasil disalin ke clipboard.',
        type: 'info',
      });
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

    if (!hasRented) {
      showToast({
        title: 'Tidak Dapat Mengirim Ulasan',
        message: 'Ulasan hanya dapat diberikan setelah transaksi sewa unit alsintan berstatus Selesai.',
        type: 'error',
      });
      setIsReviewFormOpen(false);
      return;
    }
    try {
      setIsSubmittingReview(true);
      const res = await fetch(`/api/equipments/${equipmentId}/reviews`, {
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
          message: 'Terima kasih atas ulasan pengalaman sewa alsintan Anda!',
          type: 'success',
        });
        setNewComment('');
        setIsReviewFormOpen(false);
        fetchDetail();
      } else {
        showToast({
          title: 'Gagal Mengirim Ulasan',
          message: data.error || 'Terjadi kesalahan saat menyimpan ulasan.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error submit equipment review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus ulasan ini?')) return;
    try {
      setDeletingReviewId(reviewId);
      const res = await fetch(`/api/equipments/${equipmentId}/reviews?reviewId=${reviewId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast({
          title: 'Ulasan Dihapus',
          message: 'Ulasan Anda berhasil dihapus.',
          type: 'success',
        });
        fetchDetail();
      } else {
        showToast({
          title: 'Gagal Menghapus Ulasan',
          message: data.error || 'Terjadi kesalahan saat menghapus ulasan.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error delete equipment review:', err);
      showToast({
        title: 'Gagal Menghapus Ulasan',
        message: 'Terjadi kendala koneksi ke server.',
        type: 'error',
      });
    } finally {
      setDeletingReviewId(null);
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

  // Rental Cart Count
  const [rentalCartCount, setRentalCartCount] = useState(0);

  const updateCartCount = useCallback(() => {
    const items = getRentalCart();
    setRentalCartCount(items.length);
  }, []);

  useEffect(() => {
    updateCartCount();
    window.addEventListener('rental-cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('rental-cart-updated', updateCartCount);
    };
  }, [updateCartCount]);

  useEffect(() => {
    if (user?.address) {
      setLokasiLahan(user.address);
    }
  }, [user]);

  // Fetch Equipment Detail
  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/equipments/${equipmentId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Unit alat pertanian tidak ditemukan atau sudah dihapus.');
        } else {
          setError('Gagal memuat informasi unit alat.');
        }
        return;
      }
      const data = await res.json();
      setEquipment(data.equipment);
      if (data.reviews) setReviews(data.reviews);
      if (data.stats) setStats(data.stats);
      if (data.userState) {
        setHasRented(Boolean(data.userState.hasRented));
      } else {
        setHasRented(false);
      }
      setJumlahUnit(1);
      setDurasi(1);
    } catch (err: any) {
      console.error('Error fetching equipment detail:', err);
      setError('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail, user?.id]);

  // Perhitungan Subtotal untuk Alat Ini
  const calculatedTotal = React.useMemo(() => {
    if (!equipment) return 0;
    const dur = Math.max(1, durasi);
    const qty = Math.max(1, jumlahUnit);
    const dasar = equipment.hargaSewa * dur * qty;
    const op =
      includeOperator && equipment.biayaOperator
        ? equipment.biayaOperator * dur * qty
        : 0;
    return dasar + op;
  }, [equipment, durasi, jumlahUnit, includeOperator]);

  // Aksi: Masukkan ke Keranjang Sewa Multi-Alat
  const handleAddToCart = () => {
    if (!equipment) return;
    const isOutOfStock =
      !equipment.isTersedia ||
      (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0);
    if (isOutOfStock) {
      showToast({
        title: 'Stok Unit Habis',
        message: 'Semua unit alat ini saat ini sedang disewa.',
        type: 'warning',
      });
      return;
    }

    addToRentalCart({
      equipmentId: equipment.id,
      nama: equipment.nama,
      kategori: equipment.kategori,
      hargaSewa: equipment.hargaSewa,
      satuanSewa: equipment.satuanSewa,
      biayaOperator: equipment.biayaOperator,
      includeOperator,
      stokUnit: equipment.stokUnit,
      jumlahUnit,
      durasi,
      imageUrl: equipment.imageUrl,
      kontakPj: equipment.kontakPj,
    });

    showToast({
      title: 'Ditambahkan ke Sewa',
      message: `${jumlahUnit} unit ${equipment.nama} telah ditambahkan ke keranjang sewa.`,
      type: 'success',
    });
  };

  // Aksi: Direct Sewa Sekarang via WhatsApp & API
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    if (!user) {
      showToast({
        title: 'Perlu Masuk Akun',
        message: 'Silakan masuk akun terlebih dahulu untuk mengajukan sewa.',
        type: 'info',
      });
      router.push(`/login?callbackUrl=/sewa-alat/${equipment.id}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: equipment.id,
          startDate,
          durasi,
          jumlahUnit,
          includeOperator,
          lokasiLahan,
          catatan,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: 'Pengajuan Siap',
          message: 'Detail sewa berhasil disiapkan. Mengalihkan ke WhatsApp pengurus...',
          type: 'success',
        });
        setIsDirectCheckoutOpen(false);
        if (data.waUrl) {
          window.open(data.waUrl, '_blank');
        }
      } else {
        showToast({
          title: 'Gagal Mengajukan Sewa',
          message: data.error || 'Terjadi kesalahan sistem saat memproses booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gangguan Jaringan',
        message: 'Tidak dapat mengirim pengajuan sewa.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#233414]" />
          <p className="text-xs sm:text-[13px] font-medium text-[#344d15]">
            Memuat detail alat pertanian...
          </p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#ffedea] border border-red-200 text-[#c4242a] flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1a2610] mb-1">
            Alat Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-[13px] text-[#526046] mb-6">{error}</p>
          <Link
            href="/sewa-alat"
            className="px-5 py-2.5 bg-[#233414] hover:bg-[#344d15] text-white rounded-xl font-semibold text-xs transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4F63D]" />
            <span>Kembali ke Katalog Sewa Alat</span>
          </Link>
        </div>
      </div>
    );
  }

  const cleanPhone = (equipment.kontakPj || '081944078924')
    .replace(/\D/g, '')
    .replace(/^0/, '62');

  const isOutOfStock =
    !equipment.isTersedia ||
    (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0);
  const maxUnits = Math.max(
    0,
    equipment.stokTersedia !== undefined
      ? equipment.stokTersedia
      : equipment.stokUnit || 1
  );

  const durationPresets = [1, 2, 3, 5, 7];

  return (
    <div className="min-h-screen bg-white sm:bg-[#f4f5f1] pb-28 sm:pb-16 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="hidden sm:block">
        <AppHeader activePage="sewa-alat" />
      </div>

      {/* Mobile Top Bar (Fixed di top, solid white, anti-tembus) */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white px-4 h-14 flex items-center justify-between border-b border-[#EAEDE7] shadow-2xs">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-[#526046] truncate max-w-[180px]">
          {equipment.kategori}
        </span>

        <Link
          href="/cart?tab=sewa-alat"
          className="w-10 h-10 -mr-1 rounded-full flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] transition relative"
          aria-label="Keranjang Sewa"
        >
          <ShoppingCart className="w-5 h-5" />
          {rentalCartCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#233414] text-[#D4F63D] font-black text-[9px] flex items-center justify-center tabular-nums">
              {rentalCartCount}
            </span>
          )}
        </Link>
      </div>
      {/* Spacer placeholder mode mobile agar konten tidak tertutup fixed navbar */}
      <div className="sm:hidden h-14 shrink-0 pointer-events-none" aria-hidden="true" />

      {/* Desktop Compact Subbar */}
      <div className="hidden sm:block bg-white border-b border-[#dce1d6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-[#5b6950]">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <Link
              href="/sewa-alat"
              className="text-[#1a2610] hover:text-[#344d15] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Katalog Sewa</span>
            </Link>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#526046] font-medium">{equipment.kategori}</span>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#1a2610] font-bold truncate max-w-xs">
              {equipment.nama}
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-36 sm:pb-12 sm:py-6 lg:py-8 space-y-6">
        <div className="bg-white sm:rounded-3xl sm:border sm:border-[#dce1d6] sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 items-start">
            {/* Left Column: Clean Image Card + Pagination Dots (Gambar 5 Style) */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div
                onClick={() => setIsImageModalOpen(true)}
                className="relative aspect-square w-full rounded-3xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] group cursor-zoom-in"
                title="Klik untuk memperbesar foto alat"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    equipment.imageUrl ||
                    'https://picsum.photos/seed/sewa-alat-koperasi/800/800'
                  }
                  alt={equipment.nama}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain p-3 group-hover:scale-[1.03] transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://picsum.photos/seed/sewa-alat-koperasi/800/800';
                  }}
                />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageModalOpen(true);
                  }}
                  className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-[#1a2610] border border-[#dce1d6] flex items-center justify-center shadow-xs hover:bg-white transition cursor-pointer"
                  title="Lihat Foto Ukuran Asli"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Minimal Pagination Indicator Dots under Image (Matches Gambar 5) */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cfd6c9]" />
                <span className="w-5 h-1.5 rounded-full bg-[#233414]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#cfd6c9]" />
              </div>
            </div>

            {/* Right Column: Clean Equipment Details matching Gambar 5 */}
            <div className="md:col-span-7 flex flex-col space-y-4">
              <div>
                <div className="text-xs font-medium text-[#5b6950]">
                  {equipment.kategori} • Kondisi {equipment.kondisi || 'Sangat Baik'}
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1a2610] tracking-tight leading-snug mt-1">
                  {equipment.nama}
                </h1>

                {/* Compact Rating & Unit Metric (Matches Product Detail) */}
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="font-bold text-[#1a2610]">{stats?.avgRating || '5.0'}</span>
                  <span className="text-[#68785b]">({stats?.totalReviews || 0} ulasan)</span>
                  <span className="text-[#cfd6c9]">•</span>
                  <span className="text-[#526046] font-medium">{equipment.stokUnit} unit armada</span>
                </div>

                {/* Bold Price */}
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-[#1a2610] tracking-tight tabular-nums">
                    Rp {Number(equipment.hargaSewa).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs sm:text-sm text-[#5b6950] font-semibold">
                    / {equipment.satuanSewa || 'hari'}
                  </span>
                </div>
              </div>

              {/* Duration Pill Selector + Unit Stepper (Gambar 5 Pill Selector Style) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#526046]">
                    Pilih Durasi Sewa ({equipment.satuanSewa || 'hari'})
                  </span>
                  <span className="text-[#5b6950] tabular-nums">
                    Estimasi: <strong className="text-[#233414]">Rp {calculatedTotal.toLocaleString('id-ID')}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {durationPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDurasi(preset)}
                      disabled={isOutOfStock}
                      className={`h-9 px-3.5 rounded-xl text-xs transition-all cursor-pointer tabular-nums ${
                        durasi === preset
                          ? 'bg-white text-[#1a2610] border-2 border-[#1a2610] font-extrabold shadow-2xs'
                          : 'bg-white text-[#526046] border border-[#dce1d6] hover:border-[#344d15] font-semibold'
                      }`}
                    >
                      {preset} {equipment.satuanSewa || 'hari'}
                    </button>
                  ))}

                  {/* Unit Count Stepper */}
                  <div className="inline-flex items-center h-9 rounded-xl border border-[#dce1d6] bg-[#f4f5f1] px-1 ml-auto sm:ml-0">
                    <button
                      type="button"
                      onClick={() => setJumlahUnit((prev) => Math.max(1, prev - 1))}
                      disabled={isOutOfStock || jumlahUnit <= 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1a2610] hover:bg-white disabled:opacity-30 cursor-pointer transition"
                      title="Kurangi Unit"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-extrabold text-[#1a2610] tabular-nums">
                      {jumlahUnit} unit
                    </span>
                    <button
                      type="button"
                      onClick={() => setJumlahUnit((prev) => Math.min(maxUnits || 1, prev + 1))}
                      disabled={isOutOfStock || jumlahUnit >= maxUnits}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1a2610] hover:bg-white disabled:opacity-30 cursor-pointer transition"
                      title="Tambah Unit"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Operator Toggle */}
              {equipment.biayaOperator ? (
                <label className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#dce1d6] bg-[#f4f5f1]/70 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={includeOperator}
                      disabled={isOutOfStock}
                      onChange={(e) => setIncludeOperator(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#233414] border-[#cfd6c9] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1a2610]">
                        Gunakan Kru Operator Koperasi
                      </div>
                      <div className="text-[11px] text-[#526046] tabular-nums">
                        + Rp {Number(equipment.biayaOperator).toLocaleString('id-ID')} / {equipment.satuanSewa || 'hari'}
                      </div>
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-[#344d15] shrink-0" />
                </label>
              ) : null}

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
                      ? 'Sedang disewa anggota lain (0 unit tersedia)'
                      : `Siap disewakan (${maxUnits} unit tersedia di gudang koperasi)`}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-[#526046]">
                  <ShieldCheck className="w-4 h-4 text-[#5b6950] shrink-0" />
                  <span>Pemeliharaan rutin & dicek mekanik koperasi sebelum serah terima</span>
                </div>
              </div>

              {/* Description & Technical Specs */}
              <div className="pt-2 border-t border-[#EAEDE7] space-y-3">
                {equipment.deskripsi && (
                  <p className="text-xs sm:text-[13px] text-[#526046] leading-relaxed whitespace-pre-line">
                    {equipment.deskripsi}
                  </p>
                )}

                {equipment.spesifikasi && (
                  <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-2xl text-xs text-[#1a2610] whitespace-pre-line leading-relaxed">
                    <span className="font-bold block text-[11px] uppercase tracking-wider text-[#526046] mb-1">
                      Spesifikasi Teknis
                    </span>
                    {equipment.spesifikasi}
                  </div>
                )}
              </div>

              {/* Desktop Action Bar (Matching Gambar 5 Bottom Bar) */}
              <div className="hidden sm:flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDirectCheckoutOpen(true)}
                  disabled={isOutOfStock}
                  className="h-12 px-5 rounded-2xl bg-[#EAEDE7] hover:bg-[#dce1d6] text-[#1a2610] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4 text-[#233414]" />
                  <span>Sewa Langsung</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 h-12 px-6 rounded-2xl bg-[#344d15] hover:bg-[#233414] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4 text-[#D4F63D]" />
                  <span>
                    {isOutOfStock
                      ? 'Stok Kosong'
                      : `+ Keranjang Sewa • Rp ${calculatedTotal.toLocaleString('id-ID')}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ULASAN PENYEWA */}
        <section className="bg-white rounded-2xl border border-[#dce1d6] p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dce1d6] pb-4">
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-[#1a2610] tracking-tight uppercase flex items-center gap-2">
                <span>Ulasan Penyewa</span>
              </h2>
              <p className="text-xs text-[#526046] mt-0.5">
                Pengalaman nyata anggota kelompok tani menyewa unit alsintan dari Koperasi Sinar Pagi Sejahtera
              </p>
            </div>

            {hasRented && (
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
          {isReviewFormOpen && hasRented && (
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
                  placeholder="Ceritakan performa alat, ketahanan mesin di sawah/kebun, efisiensi konsumsi BBM solar, atau kebersihan unit saat serah terima..."
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
                    {stats.satisfiedPercentage}% penyewa merasa puas
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
                <span>Diambil dari anggota kelompok tani terverifikasi Koperasi Sinar Pagi Sejahtera</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cfd6c9] bg-[#f4f5f1] p-6 sm:p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mx-auto mb-3">
                <Star className="w-5 h-5 text-[#233414]" />
              </div>
              <h3 className="text-sm font-bold text-[#1a2610]">Belum Ada Ulasan Penyewa</h3>
              <p className="text-xs text-[#526046] max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                Unit alsintan ini belum memiliki ulasan dari penyewa. Sewa sekarang dan berikan ulasan setelah pemakaian alat selesai!
              </p>
              {hasRented && (
                <button
                  onClick={() => setIsReviewFormOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#D4F63D]" />
                  <span>Beri Ulasan Pertama</span>
                </button>
              )}
            </div>
          )}

          {/* LIST OF REVIEWS (Maksimal 3 ulasan ditampilkan di halaman detail) */}
          {reviews && reviews.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1a2610] uppercase tracking-wider">
                  Ulasan Terbaru ({Math.min(reviews.length, 3)} dari {reviews.length})
                </h3>
                {reviews.length > 3 && (
                  <Link
                    href={`/sewa-alat/${equipment.id}/ulasan`}
                    className="text-xs font-bold text-[#233414] hover:text-[#344d15] flex items-center gap-1 transition-colors"
                  >
                    <span>Lihat Semua ({reviews.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="divide-y divide-[#EAEDE7]">
                {reviews.slice(0, 3).map((rev: any) => {
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

                      {/* User Info (Avatar + Name + Delete button if own review) */}
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7 rounded-full border border-[#cfd6c9]">
                          <AvatarImage src={rev.userAvatar || rev.user?.avatarUrl || ''} alt={rev.userName || rev.user?.name} />
                          <AvatarFallback className="bg-[#EAEDE7] text-[#233414] text-[10px] font-bold">
                            {rev.userName ? rev.userName.slice(0, 2).toUpperCase() : 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-[#1a2610]">
                          {rev.userName || rev.user?.name || 'Penyewa Koperasi'}
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
                            <span className="text-[11px]">Hapus</span>
                          </button>
                        )}
                      </div>

                      {/* Rental Unit Info */}
                      <div className="text-[11px] text-[#5b6950] font-medium">
                        Unit: {equipment.nama} • {equipment.kategori}
                      </div>

                      {/* Review Text */}
                      <p className="text-xs sm:text-[13px] text-[#1a2610] leading-relaxed">
                        {rev.komentar || 'Penyewa tidak memberikan komentar tertulis.'}
                      </p>

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

              {/* Tombol Lihat Semua Ulasan jika ulasan lebih dari 3 */}
              {reviews.length > 3 && (
                <div className="pt-2">
                  <Link
                    href={`/sewa-alat/${equipment.id}/ulasan`}
                    className="w-full py-3 px-4 rounded-xl border border-[#dce1d6] bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#1a2610] text-xs font-bold flex items-center justify-center gap-2 transition-colors group"
                  >
                    <span>Lihat Semua {reviews.length} Ulasan</span>
                    <ChevronRight className="w-4 h-4 text-[#526046] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Fixed Bottom Action Bar on Mobile: OUTSIDE <main>, anchored directly to the viewport */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#dce1d6] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button
          type="button"
          onClick={() => setIsDirectCheckoutOpen(true)}
          disabled={isOutOfStock}
          className="w-12 h-12 rounded-2xl bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#dce1d6] text-[#1a2610] flex items-center justify-center shrink-0 transition cursor-pointer disabled:opacity-40"
          title="Ajukan Sewa Langsung"
        >
          <Calendar className="w-5 h-5 text-[#233414]" />
        </button>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="flex-1 h-12 px-5 rounded-full bg-[#233414] hover:bg-[#344d15] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-40"
        >
          <span>
            {isOutOfStock
              ? 'Sedang Disewa'
              : `+ Keranjang Sewa • Rp ${calculatedTotal.toLocaleString('id-ID')}`}
          </span>
        </button>
      </div>

      {/* MODAL 1: Lightbox Foto Ukuran Asli */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white border border-[#dce1d6] rounded-3xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#233414] hover:bg-[#344d15] text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                equipment.imageUrl ||
                'https://picsum.photos/seed/sewa-alat-koperasi/1200/1200'
              }
              alt={equipment.nama}
              loading="lazy"
              decoding="async"
              className="max-h-[82vh] w-auto object-contain mx-auto rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* MODAL 2: Dialog Direct Sewa Sekarang */}
      <Dialog
        open={isDirectCheckoutOpen}
        onOpenChange={setIsDirectCheckoutOpen}
      >
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl bg-white border border-[#dce1d6]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1a2610] flex items-center gap-2">
              <Tractor className="w-5 h-5 text-[#233414]" />
              <span>Konfirmasi Sewa: {equipment.nama}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDirectSubmit} className="space-y-3.5 text-xs mt-2">
            <div>
              <label className="block font-bold text-[#1a2610] mb-1">
                Mulai Tanggal Penggunaan <span className="text-[#c4242a]">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] font-semibold"
              />
            </div>

            {/* Lokasi Lahan Kebun dengan Preview Maps & Deteksi GPS */}
            <LocationMapPreview
              value={lokasiLahan}
              onChange={setLokasiLahan}
              required={false}
            />

            <div>
              <label className="block font-bold text-[#1a2610] mb-1">
                Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Informasi kondisi tanah, jam operasional, atau implemen tambahan..."
                className="w-full px-3 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#68785b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414]"
              />
            </div>

            <div className="p-3 bg-[#e2f2c8]/60 border border-[#c9e39e] rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-[#1a2610]">
                <span>Rincian:</span>
                <span>
                  {jumlahUnit} unit • {durasi} {equipment.satuanSewa}
                </span>
              </div>
              <div className="flex justify-between font-black text-sm text-[#233414] pt-1 border-t border-[#c9e39e] tabular-nums">
                <span>Total Estimasi:</span>
                <span>Rp {calculatedTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDirectCheckoutOpen(false)}
                className="py-2 px-3 border border-[#cfd6c9] bg-white hover:bg-[#EAEDE7] text-[#526046] rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 bg-[#233414] hover:bg-[#344d15] text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4F63D]" />
                    <span>Menyiapkan...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
                    <span>Ajukan ke WhatsApp PJ</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
