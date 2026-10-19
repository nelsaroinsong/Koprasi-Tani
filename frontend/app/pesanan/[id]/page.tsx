'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ChevronLeft,
  Store,
  Calendar,
  Package,
  Tractor,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Star,
  MapPin,
  ExternalLink,
  FileText,
  Clock,
  Loader2,
  ArrowRight,
  Phone,
  Building2,
  Share2,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const targetId = decodeURIComponent(unwrappedParams.id);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isSewaType = searchParams.get('type') === 'sewa';

  const { user } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [isRental, setIsRental] = useState(isSewaType);

  // Review Modal State (Pesanan Selesai)
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Info Koperasi
  const [warehouseAddress, setWarehouseAddress] = useState(
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara'
  );
  const [adminPhone, setAdminPhone] = useState('081944078924');

  // Cancel Order Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  // Countdown timer state for 72h auto cancel
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alamat) setWarehouseAddress(data.alamat);
        if (data?.telepon) setAdminPhone(data.telepon);
      })
      .catch(() => {});
  }, []);

  // Fetch data pesanan atau sewa alat
  useEffect(() => {
    async function loadDetail() {
      try {
        setIsLoading(true);

        // 1. Coba ambil langsung dari endpoint detail pesanan spesifik
        const resSingleOrder = await fetch(`/api/orders/${targetId}`).catch(() => null);
        if (resSingleOrder && resSingleOrder.ok) {
          const singleData = await resSingleOrder.json();
          const order = singleData.order || singleData;
          if (order && (order.id || order.orderNumber)) {
            setOrderData(order);
            setIsRental(false);
            setIsLoading(false);
            return;
          }
        }

        // 2. Fallback: Cari di orders list toko online pembeli
        const resOrders = await fetch('/api/orders').catch(() => null);
        if (resOrders && resOrders.ok) {
          const data = await resOrders.json();
          const ordersList = Array.isArray(data)
            ? data
            : Array.isArray(data?.orders)
            ? data.orders
            : [];
          const found = ordersList.find((o: any) => o.id === targetId || o.orderNumber === targetId);

          if (found) {
            setOrderData(found);
            setIsRental(false);
            setIsLoading(false);
            return;
          }
        }

        // 3. Jika tidak ketemu di orders toko, cari di sewa alat
        const resRentals = await fetch('/api/equipments/rent').catch(() => null);
        if (resRentals && resRentals.ok) {
          const rentalData = await resRentals.json();
          const rentalsList = Array.isArray(rentalData)
            ? rentalData
            : Array.isArray(rentalData?.rentals)
            ? rentalData.rentals
            : Array.isArray(rentalData?.data)
            ? rentalData.data
            : [];
          const found = rentalsList.find(
            (r: any) =>
              r.id === targetId ||
              r.rentalCode === targetId ||
              r.rentalNumber === targetId
          );

          if (found) {
            setOrderData(found);
            setIsRental(true);
            setIsLoading(false);
            return;
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching detail:', err);
        setIsLoading(false);
      }
    }

    loadDetail();
  }, [targetId]);

  // Alur 4 Tahap Toko Online (Alur: Pesanan Masuk -> Disiapkan Gudang -> Bayar di Kasir -> Ambil di Kasir)
  // Tahap 1: Pesanan Masuk (MENUNGGU_PEMBAYARAN - Tombol batalkan berlaku bagi pembeli)
  // Tahap 2: Disiapkan Gudang (DIPROSES - Tidak bisa dibatalkan)
  // Tahap 3: Bayar di Kasir (SIAP_DIAMBIL - 24 Jam Batal Otomatis berlaku tanpa tombol batalkan)
  // Tahap 4: Ambil di Kasir & Selesai (SELESAI)
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return {
          step: 1,
          label: 'Pesanan Masuk',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          hint: 'Pesanan Anda telah diterima sistem koperasi dan menunggu konfirmasi pemrosesan staf gudang.',
        };
      case 'DIPROSES':
        return {
          step: 2,
          label: 'Sedang Disiapkan Gudang',
          badgeClass: 'bg-[#EAEDE7] text-[#233414] border-[#cfd6c9] font-bold',
          hint: 'Komoditas pesanan Anda sedang disortir dan ditimbang fisik oleh petugas gudang koperasi.',
        };
      case 'SIAP_DIAMBIL':
        return {
          step: 3,
          label: 'Bayar di Kasir',
          badgeClass: 'bg-[#233414] text-[#D4F63D] border-[#233414] font-bold',
          hint: 'Komoditas telah siap di kasir! Silakan bayar tunai (cash) atau transfer ke kasir koperasi dalam batas waktu 24 jam.',
        };
      case 'SELESAI':
        return {
          step: 4,
          label: 'Ambil di Kasir & Selesai',
          badgeClass: 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e] font-bold',
          hint: 'Pembayaran telah sah diterima dan komoditas telah diserahkan di kasir koperasi. Transaksi selesai!',
        };
      case 'DIBATALKAN':
        return {
          step: 0,
          label: 'Pesanan Dibatalkan',
          badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold',
          hint: 'Pesanan telah dibatalkan dan alokasi komoditas telah dikembalikan ke gudang.',
        };
      default:
        return {
          step: 1,
          label: status,
          badgeClass: 'bg-[#f4f5f1] text-[#1a2610] border-[#dce1d6]',
          hint: 'Pesanan Anda sedang diproses.',
        };
    }
  };

  // Status Sewa Alat
  const getRentalStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PERSETUJUAN_ADMIN':
        return {
          label: 'Menunggu Persetujuan',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          hint: 'Pengajuan sewa alat Anda sedang ditinjau oleh staf koperasi & pemilik alat.',
        };
      case 'DISETUJUI':
        return {
          label: 'Pengajuan Disetujui',
          badgeClass: 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e] font-bold',
          hint: 'Pengajuan telah disetujui! Alat sedang disiapkan untuk pengambilan/pengantaran.',
        };
      case 'SIAP_DIAMBIL':
        return {
          label: 'Siap Diambil',
          badgeClass: 'bg-[#233414] text-[#D4F63D] border-[#233414] font-bold',
          hint: 'Unit alat sudah siap diambil di pool/gudang koperasi pertanian.',
        };
      case 'SEDANG_DISEWA':
        return {
          label: 'Sedang Disewa',
          badgeClass: 'bg-[#344d15] text-white border-[#233414] font-bold',
          hint: 'Alat sedang beroperasi di lahan kebun pertanian Anda.',
        };
      case 'SELESAI':
        return {
          label: 'Sewa Selesai',
          badgeClass: 'bg-[#EAEDE7] text-[#1a2610] border-[#cfd6c9] font-bold',
          hint: 'Masa sewa telah selesai dan alat telah dikembalikan dalam kondisi baik.',
        };
      case 'DITOLAK':
        return {
          label: 'Pengajuan Ditolak',
          badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold',
          hint: 'Pengajuan sewa tidak dapat diproses. Silakan hubungi admin koperasi.',
        };
      case 'DIBATALKAN':
        return {
          label: 'Dibatalkan',
          badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold',
          hint: 'Pengajuan sewa alat ini telah dibatalkan oleh pemohon.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-[#f4f5f1] text-[#1a2610] border-[#dce1d6]',
          hint: 'Status sewa alat sedang diproses.',
        };
    }
  };

  // Hitung sisa waktu pembayaran (24 jam sejak pesanan dibuat / sampai tahap 3 bayar di kasir)
  useEffect(() => {
    if (
      !orderData ||
      (orderData.status !== 'MENUNGGU_PEMBAYARAN' &&
        orderData.status !== 'DIPROSES' &&
        orderData.status !== 'SIAP_DIAMBIL') ||
      isRental
    ) {
      setTimeRemaining('');
      return;
    }

    const calculateTime = () => {
      const createdTime = new Date(orderData.createdAt).getTime();
      const expireTime = createdTime + 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = expireTime - now;

      if (diff <= 0) {
        setTimeRemaining('Waktu pembayaran telah habis (24 jam)');
        setIsExpired(true);
        // Refresh otomatis agar status diupdate ke DIBATALKAN
        fetch(`/api/orders/${targetId}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.order) setOrderData(d.order);
          })
          .catch(() => {});
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours} jam ${minutes} menit ${seconds} detik`);
      setIsExpired(false);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [orderData, isRental, targetId]);

  const handleCancelOrder = async () => {
    if (!orderData) return;
    try {
      setIsCanceling(true);
      const url = isRental ? '/api/equipments/rent' : `/api/orders/${targetId}`;
      const payload = isRental
        ? {
            action: 'CANCEL',
            rentalId: orderData.id || targetId,
            alasanBatal: cancelReason.trim() || 'Dibatalkan oleh pemohon sewa alat',
          }
        : {
            action: 'CANCEL',
            alasanBatal: cancelReason.trim() || 'Dibatalkan oleh pembeli sebelum pembayaran',
          };

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membatalkan pesanan');
      }

      showToast({
        title: isRental ? 'Pengajuan Dibatalkan' : 'Pesanan Dibatalkan',
        message: isRental
          ? 'Pengajuan sewa alat pertanian berhasil dibatalkan.'
          : 'Pesanan berhasil dibatalkan. Stok barang telah dikembalikan ke katalog koperasi.',
        type: 'info',
      });

      setOrderData(data.order || data.rental);
      setIsCancelModalOpen(false);
      setCancelReason('');
    } catch (err: any) {
      showToast({
        title: 'Gagal Membatalkan',
        message: err.message || 'Terjadi gangguan saat membatalkan pesanan.',
        type: 'error',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!orderData) return;
    const cleanPhone = adminPhone.replace(/\D/g, '').replace(/^0/, '62');
    const invoiceNum = orderData.orderNumber || orderData.rentalCode || orderData.id;
    const text = `Halo Admin Koperasi Sinar Pagi Sejahtera, saya ingin bertanya mengenai pesanan #${invoiceNum}. Mohon infonya. Terima kasih!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSubmitReview = async () => {
    if (!reviewItem) return;
    try {
      setIsSubmittingReview(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: reviewItem.productId || reviewItem.product?.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      if (!res.ok) throw new Error('Gagal mengirim ulasan');

      showToast({ message: 'Ulasan dan penilaian berhasil dikirim!', type: 'success' });
      setReviewItem(null);
      setReviewComment('');
    } catch (err: any) {
      showToast({ message: err.message || 'Gagal mengirim ulasan', type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f1] pb-24 text-[#1a2610] font-sans">
      <AppHeader />

      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4">
        {/* Tombol Kembali ke Halaman Pesanan */}
        <div className="flex items-center justify-between">
          <Link
            href="/pesanan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#dce1d6] text-xs font-bold text-[#1a2610] hover:bg-[#EAEDE7] hover:border-[#cfd6c9] transition shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4 text-[#233414]" />
            <span>Kembali ke Pesanan</span>
          </Link>

          <span className="text-[11px] font-semibold text-[#5b6950]">
            {isRental ? 'Detail Pengajuan Sewa Alat' : 'Detail Pesanan Toko Online'}
          </span>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-xl sm:rounded-2xl border border-[#dce1d6] shadow-2xs">
            <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
            <span className="text-xs font-semibold text-[#526046]">Memuat rincian data pesanan...</span>
          </div>
        ) : !orderData ? (
          <div className="py-20 text-center bg-white rounded-xl sm:rounded-2xl border border-[#dce1d6] shadow-2xs p-6 space-y-3">
            <AlertCircle className="w-12 h-12 text-[#5b6950] mx-auto" />
            <h3 className="text-base font-bold text-[#1a2610]">Pesanan Tidak Ditemukan</h3>
            <p className="text-xs text-[#526046] max-w-md mx-auto leading-relaxed">
              ID pesanan tidak terdaftar atau telah dihapus dari sistem. Silakan periksa kembali riwayat pesanan Anda.
            </p>
            <Link
              href="/pesanan"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-bold shadow-xs transition"
            >
              Lihat Semua Pesanan
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Kartu Utama Rincian */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-[#dce1d6] shadow-2xs overflow-hidden">
              {/* Header Kartu */}
              <div className="p-3.5 sm:p-4 border-b border-[#dce1d6] bg-[#f4f5f1]/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#1a2610] text-xs sm:text-sm">
                    {isRental ? (
                      <Tractor className="w-4 h-4 text-[#233414]" />
                    ) : (
                      <Store className="w-4 h-4 text-[#233414]" />
                    )}
                    <span>Koperasi Sinar Pagi Sejahtera</span>
                  </div>
                  <span className="text-[#cfd6c9]">•</span>
                  <div className="text-[#526046] text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#5b6950]" />
                    <span>
                      {new Date(orderData.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="text-[#cfd6c9]">•</span>
                  <span className="font-mono text-[11px] text-[#233414] font-bold">
                    #{orderData.orderNumber || orderData.rentalCode || orderData.id}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#dce1d6]">
                  {isRental ? (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                        getRentalStatusConfig(orderData.status).badgeClass
                      }`}
                    >
                      {getRentalStatusConfig(orderData.status).label}
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                        getStatusConfig(orderData.status).badgeClass
                      }`}
                    >
                      {getStatusConfig(orderData.status).label}
                    </span>
                  )}

                  {/* Tombol Batalkan Cepat di Header (Hanya berlaku saat masih sebagai Pesanan Masuk) */}
                  {!isRental && orderData.status === 'MENUNGGU_PEMBAYARAN' && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batalkan</span>
                    </button>
                  )}
                  {isRental && orderData.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batalkan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Stepper 4 Tahap (Khusus Toko Online: Bayar Dulu baru Ambil di Kasir) */}
              {!isRental && orderData.status !== 'DIBATALKAN' && (
                <div className="p-4 sm:p-5 border-b border-[#dce1d6] bg-[#f4f5f1]/40">
                  <div className="max-w-2xl mx-auto py-1">
                    <div className="grid grid-cols-4 gap-1 text-center relative">
                      {/* Background & Active Track Bar (Strictly between center of Step 1 and center of Step 4) */}
                      <div className="absolute top-3.5 left-[12.5%] right-[12.5%] h-1 bg-[#dce1d6] z-0 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#233414] rounded-full transition-all duration-500"
                          style={{
                            width:
                              getStatusConfig(orderData.status).step <= 1
                                ? '0%'
                                : getStatusConfig(orderData.status).step === 2
                                ? '33.3333%'
                                : getStatusConfig(orderData.status).step === 3
                                ? '66.6667%'
                                : '100%',
                          }}
                        />
                      </div>

                      {/* Step 1 */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 1
                              ? 'bg-[#233414] text-[#D4F63D] ring-2 ring-[#e2f2c8]'
                              : 'bg-[#EAEDE7] text-[#5b6950] border border-[#cfd6c9]'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step > 1 ? '✓' : '1'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-[#1a2610] mt-1.5">Pesanan Masuk</span>
                        <span className="text-[9px] text-[#5b6950]">Kasir Koperasi</span>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 2
                              ? 'bg-[#233414] text-[#D4F63D] ring-2 ring-[#e2f2c8]'
                              : 'bg-[#EAEDE7] text-[#5b6950] border border-[#cfd6c9]'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step > 2 ? '✓' : '2'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-[#1a2610] mt-1.5">Disiapkan Gudang</span>
                        <span className="text-[9px] text-[#5b6950]">Pengecekan Fisik</span>
                      </div>

                      {/* Step 3 (Bayar di Kasir) */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 3
                              ? 'bg-[#233414] text-[#D4F63D] ring-2 ring-[#e2f2c8]'
                              : 'bg-[#EAEDE7] text-[#5b6950] border border-[#cfd6c9]'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step > 3 ? '✓' : '3'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-[#1a2610] mt-1.5">Bayar di Kasir</span>
                        <span className="text-[9px] text-[#5b6950]">Bayar Dulu</span>
                      </div>

                      {/* Step 4 (Ambil di Kasir) */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 4
                              ? 'bg-[#233414] text-[#D4F63D] ring-2 ring-[#e2f2c8]'
                              : 'bg-[#EAEDE7] text-[#5b6950] border border-[#cfd6c9]'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step >= 4 ? '✓' : '4'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-[#1a2610] mt-1.5">Ambil di Kasir</span>
                        <span className="text-[9px] text-[#5b6950]">Serah Terima & Selesai</span>
                      </div>
                    </div>

                    {/* Hint Box */}
                    <div className="mt-3.5 p-3 rounded-xl bg-[#e2f2c8]/50 border border-[#c9e39e] text-xs text-[#1a2610] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#233414] shrink-0" />
                      <span className="font-medium">{getStatusConfig(orderData.status).hint}</span>
                    </div>

                    {/* Akumulasi Batas Waktu Pembayaran 24 Jam (Tahap Bayar di Kasir: Otomatis batal tanpa tombol batalkan) */}
                    {orderData.status === 'SIAP_DIAMBIL' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-50/95 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                          <div>
                            <span className="font-bold block sm:inline">Batas Waktu Pembayaran Kasir (24 Jam): </span>
                            <span className="font-mono font-black text-amber-900 tabular-nums">
                              {timeRemaining || '24:00:00 (Menghitung batas bayar...)'}
                            </span>
                            <p className="text-[10px] text-amber-700 mt-0.5">
                              Pesanan otomatis dibatalkan sistem dan stok komoditas dikembalikan ke gudang jika belum dibayar di kasir dalam batas waktu 24 jam.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Batas Waktu Pesanan Masuk (Tahap 1: Pembeli bisa batalkan manual) */}
                    {orderData.status === 'MENUNGGU_PEMBAYARAN' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-50/95 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                          <div>
                            <span className="font-bold block sm:inline">Batas Waktu Pesanan (24 Jam): </span>
                            <span className="font-mono font-black text-amber-900 tabular-nums">
                              {timeRemaining || '24:00:00 (Menghitung batas bayar...)'}
                            </span>
                            <p className="text-[10px] text-amber-700 mt-0.5">
                              Pesanan masih dalam antrean pesanan masuk. Anda dapat membatalkan pesanan sebelum komoditas mulai disiapkan oleh petugas gudang.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batalkan Pesanan</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Hint & Cancel Pengajuan Sewa Alat */}
              {isRental && (
                <div className="border-b border-[#dce1d6]">
                  <div className="p-3.5 sm:p-4 bg-[#e2f2c8]/50 text-xs text-[#1a2610] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#233414] shrink-0" />
                    <span className="font-medium">{getRentalStatusConfig(orderData.status).hint}</span>
                  </div>

                  {orderData.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                    <div className="p-3 bg-amber-50/90 border-t border-amber-200/80 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                        <div>
                          <span className="font-bold">Pengajuan Sedang Diverifikasi Admin Koperasi</span>
                          <p className="text-[10px] text-amber-700 mt-0.5">
                            Anda dapat membatalkan pengajuan sewa ini sebelum disetujui staf/pengurus koperasi.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCancelModalOpen(true)}
                        className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 text-xs font-bold transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Batalkan Pengajuan Sewa</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Daftar Barang / Alat */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#526046]">
                  {isRental
                    ? `Daftar Alat Disewa (${orderData.items?.length || 1} Unit)`
                    : `Rincian Komoditas (${orderData.items?.length || 1} Barang)`}
                </div>

                <div className="space-y-3">
                  {!isRental &&
                    orderData.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl bg-[#f4f5f1]/80 border border-[#dce1d6]"
                      >
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.nama}
                            className="w-14 h-14 rounded-lg object-cover border border-[#dce1d6] shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-[#e2f2c8]/60 text-[#233414] flex items-center justify-center shrink-0 border border-[#c9e39e] text-xl font-bold shadow-2xs">
                            🌾
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-[#1a2610] leading-snug truncate">
                            {item.namaProduk || item.product?.nama || 'Komoditas Pertanian'}
                          </h4>
                          <div className="text-xs text-[#526046] mt-0.5 tabular-nums">
                            {item.quantity} {item.satuan || item.product?.satuan || 'unit'} × Rp{' '}
                            {Number(item.hargaPerSatuan).toLocaleString('id-ID')}
                          </div>
                          {item.petani?.name && (
                            <div className="text-xs text-[#233414] font-semibold mt-0.5 flex items-center gap-1">
                              <span>🌾 Mitra Petani:</span>
                              <strong>{item.petani.name}</strong>
                            </div>
                          )}

                          {orderData.status === 'SELESAI' && (
                            <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setReviewItem(item)}
                                className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                <span>Beri Ulasan</span>
                              </button>
                              <Link
                                href={`/toko/${item.productId || item.product?.id}`}
                                className="text-xs text-[#233414] hover:text-[#344d15] hover:underline font-bold"
                              >
                                Lihat Halaman Produk →
                              </Link>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-[#5b6950] font-medium">Subtotal</div>
                          <div className="text-sm font-black text-[#1a2610] mt-0.5 tabular-nums">
                            Rp {Number(item.subtotal).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Sewa Alat Items */}
                  {isRental &&
                    orderData.items?.map((item: any, idx: number) => {
                      const itemName = item.nama || item.equipmentName || 'Alat Pertanian';
                      const itemQty = Number(item.jumlahUnit || item.quantity) || 1;
                      const itemPrice = Number(item.hargaSewa ?? item.pricePerDay) || 0;
                      const itemDuration =
                        Number(item.durasi || item.rentalDays || orderData.durationDays || orderData.durasi) || 1;
                      const itemUnit = item.satuanSewa || 'hari';
                      const itemSubtotal =
                        item.subtotal !== undefined && !isNaN(Number(item.subtotal))
                          ? Number(item.subtotal)
                          : itemPrice * itemQty * itemDuration;

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl bg-[#f4f5f1]/80 border border-[#dce1d6]"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={itemName}
                              className="w-14 h-14 rounded-lg object-cover border border-[#dce1d6] shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-[#e2f2c8]/60 text-[#233414] flex items-center justify-center shrink-0 border border-[#c9e39e] text-xl font-bold shadow-2xs">
                              🚜
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-[#1a2610] leading-snug">{itemName}</h4>
                            <div className="text-xs text-[#526046] mt-0.5 tabular-nums">
                              {itemQty} unit × Rp {itemPrice.toLocaleString('id-ID')} / {itemUnit}
                            </div>
                            <div className="text-xs text-[#233414] font-semibold mt-0.5">
                              Durasi: {itemDuration} {itemUnit} (Mulai {orderData.startDate})
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-[#5b6950] font-medium">Subtotal</div>
                            <div className="text-sm font-black text-[#1a2610] mt-0.5 tabular-nums">
                              Rp {itemSubtotal.toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Informasi Pengambilan / Lokasi Kebun */}
              <div className="p-4 sm:p-5 bg-[#f4f5f1]/60 border-t border-[#dce1d6] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Info Lokasi */}
                <div className="p-3.5 bg-white rounded-xl border border-[#dce1d6] space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#526046] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#233414]" />
                    <span>{isRental ? 'Lokasi Lahan Kebun Pertanian' : 'Lokasi Serah Terima & Kasir'}</span>
                  </div>
                  <div className="text-[#1a2610] font-medium leading-relaxed">
                    {isRental
                      ? orderData.lokasiLahan || orderData.farmLocationAddress || 'Wilayah Minahasa Utara'
                      : warehouseAddress}
                  </div>
                  {isRental && orderData.farmLocationGps && (
                    <div className="pt-1">
                      <a
                        href={`https://www.google.com/maps?q=${orderData.farmLocationGps.lat},${orderData.farmLocationGps.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#233414] hover:text-[#344d15] font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Buka Koordinat GPS di Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Catatan Pembeli */}
                <div className="p-3.5 bg-white rounded-xl border border-[#dce1d6] space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#526046] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#233414]" />
                    <span>Catatan Pesanan</span>
                  </div>
                  <div className="text-[#1a2610] italic">
                    {orderData.catatan || orderData.notes ? (
                      <span>{orderData.catatan || orderData.notes}</span>
                    ) : (
                      <span className="text-[#5b6950]">Tidak ada catatan khusus untuk pesanan ini.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rincian Pembayaran */}
              <div className="p-4 sm:p-5 border-t border-[#dce1d6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div>
                  <div className="text-xs text-[#526046]">Metode Pembayaran:</div>
                  <div className="text-xs font-bold text-[#1a2610] mt-0.5">
                    {orderData.paymentMethod === 'CASH_KOPERASI' || isRental
                      ? 'Bayar Tunai di Kasir Koperasi'
                      : 'Transfer Bank'}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-[#526046]">Total Pembayaran:</div>
                  <div className="text-xl font-black text-[#233414] tracking-tight mt-0.5 tabular-nums">
                    Rp{' '}
                    {Number(
                      orderData.totalAmount ?? orderData.totalEstimasi ?? 0
                    ).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-[#EAEDE7]/70 border-t border-[#dce1d6] flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="text-[#526046] text-[11px]">
                  Ada pertanyaan seputar pesanan ini? Hubungi langsung staf/admin koperasi.
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  {((!isRental && orderData.status === 'MENUNGGU_PEMBAYARAN') ||
                    (isRental && orderData.status === 'MENUNGGU_PERSETUJUAN_ADMIN')) && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <X className="w-4 h-4" />
                      <span>{isRental ? 'Batalkan Pengajuan' : 'Batalkan Pesanan'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
                    <span>Chat Admin WhatsApp</span>
                  </button>

                  <Link
                    href={isRental ? '/sewa-alat' : '/toko'}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#cfd6c9] hover:bg-[#f4f5f1] bg-white text-[#1a2610] font-bold text-xs transition text-center"
                  >
                    {isRental ? 'Sewa Alat Lain' : 'Beli Lagi'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Floating Bottom Action Bar Khusus Mobile & Tablet Kecil */}
        {orderData &&
          ((!isRental && orderData.status === 'MENUNGGU_PEMBAYARAN') ||
            (isRental && orderData.status === 'MENUNGGU_PERSETUJUAN_ADMIN')) && (
            <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[#dce1d6] z-40 flex items-center gap-2 shadow-lg">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="flex-1 py-2.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4" />
                <span>{isRental ? 'Batalkan Sewa' : 'Batalkan Pesanan'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
                <span>Chat Admin WA</span>
              </button>
            </div>
          )}
      </main>

      {/* Modal Dialog Beri Ulasan */}
      {reviewItem && (
        <div
          onClick={() => setReviewItem(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#dce1d6] space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#dce1d6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1a2610]">Beri Penilaian & Ulasan</h3>
                <p className="text-xs text-[#526046]">Bagikan kepuasan Anda setelah pesanan selesai diterima</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#1a2610] block mb-1.5">Penilaian (Bintang 1 - 5):</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-2xl transition hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-[#cfd6c9] fill-[#EAEDE7]'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-800 ml-2">{reviewRating} dari 5 Bintang</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1a2610] block mb-1.5">Ulasan Anda:</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tulis ulasan mengenai kualitas komoditas, kesegaran, atau keramahan pelayanan koperasi..."
                  className="w-full p-3 rounded-xl border border-[#cfd6c9] text-xs text-[#1a2610] placeholder:text-[#5b6950] bg-[#f4f5f1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#233414]/20 focus:border-[#233414] transition resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#dce1d6]">
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="px-4 py-2 rounded-lg border border-[#cfd6c9] text-xs font-bold text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleSubmitReview}
                className="px-4 py-2 rounded-lg bg-[#233414] hover:bg-[#344d15] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Kirim Ulasan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Batalkan Pesanan */}
      {isCancelModalOpen && (
        <div
          onClick={() => !isCanceling && setIsCancelModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-[#dce1d6] space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a2610]">Batalkan Pesanan Ini?</h3>
                <p className="text-xs text-[#526046] mt-0.5 leading-relaxed">
                  Pesanan akan dibatalkan secara permanen dan seluruh stok komoditas akan dikembalikan ke gudang koperasi.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1a2610] block mb-1.5">
                Alasan Pembatalan (Opsional):
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Ingin mengubah jumlah pesanan, salah memilih komoditas, atau belum sempat ke kasir..."
                className="w-full p-2.5 rounded-lg border border-[#cfd6c9] text-xs text-[#1a2610] placeholder:text-[#5b6950] bg-[#f4f5f1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#dce1d6]">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#cfd6c9] text-xs font-bold text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={handleCancelOrder}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isCanceling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Ya, Batalkan Pesanan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
