'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
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
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getPrimaryImage } from '@/lib/utils';
import { BATAS_BATAL_HARI, DENDA_PER_HARI, DP_PERSEN, dpDikembalikanJikaBatal, hitungDp } from '@/lib/rental-policy';

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
  const [copiedPickupCode, setCopiedPickupCode] = useState(false);

  // Rolling 20-second pickup code state
  const [rollingPickupState, setRollingPickupState] = useState<{
    code: string;
    stepSeconds: number;
    expiresAtLocalMs: number;
  } | null>(null);
  const [pickupCodeRemainingMs, setPickupCodeRemainingMs] = useState(20_000);
  const isFetchingPickupCodeRef = useRef(false);

  const handleCopyPickupCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedPickupCode(true);
      showToast({
        title: 'Kode Disalin',
        message: 'Kode ambil pesanan 6 digit berhasil disalin.',
        type: 'success',
      });
      setTimeout(() => setCopiedPickupCode(false), 1800);
    } catch {
      showToast({
        title: 'Gagal Menyalin',
        message: 'Silakan salin atau tunjukkan kode secara langsung ke kasir.',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alamat) setWarehouseAddress(data.alamat);
        if (data?.telepon) setAdminPhone(data.telepon);
      })
      .catch(() => {});
  }, []);

  // Muat ulang diam-diam (tanpa layar loading) agar status terbaru langsung tampil,
  // mis. setelah petugas kasir memverifikasi kode ambil.
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);

  // Sync rolling pickup code state when orderData initially arrives
  useEffect(() => {
    if (!isRental && orderData?.status === 'SIAP_DIAMBIL' && orderData?.pickupCode) {
      const stepSeconds = Number(orderData.pickupCodeStepSeconds) || 20;
      const remainingMs = Math.max(1000, Number(orderData.pickupCodeRemainingMs) || stepSeconds * 1000);
      setRollingPickupState({
        code: String(orderData.pickupCode),
        stepSeconds,
        expiresAtLocalMs: Date.now() + remainingMs,
      });
      setPickupCodeRemainingMs(remainingMs);
    } else {
      setRollingPickupState(null);
    }
  }, [
    isRental,
    orderData?.id,
    orderData?.status,
    orderData?.pickupCode,
    orderData?.pickupCodeStepSeconds,
    orderData?.pickupCodeRemainingMs,
  ]);

  const fetchRollingPickupCode = useCallback(async (orderId: string) => {
    if (isFetchingPickupCodeRef.current) return;
    isFetchingPickupCodeRef.current = true;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pickup-code`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) return;

      if (!data.active) {
        setRollingPickupState(null);
        setRefreshKey((k) => k + 1);
        return;
      }

      const stepSeconds = Number(data.stepSeconds) || 20;
      const remainingMs = Math.max(1000, Number(data.remainingMs) || stepSeconds * 1000);
      setCopiedPickupCode(false);
      setRollingPickupState({
        code: String(data.code),
        stepSeconds,
        expiresAtLocalMs: Date.now() + remainingMs,
      });
      setPickupCodeRemainingMs(remainingMs);
    } catch {
      // Abaikan gangguan jaringan sementara; akan dicoba lagi otomatis pada siklus berikutnya
    } finally {
      isFetchingPickupCodeRef.current = false;
    }
  }, []);

  // Auto-rotate kode ambil setiap 20 detik saat status SIAP_DIAMBIL
  useEffect(() => {
    if (isRental || orderData?.status !== 'SIAP_DIAMBIL' || !orderData?.id || !rollingPickupState) {
      return;
    }

    const orderId = String(orderData.id);
    const tick = () => {
      const left = Math.max(0, rollingPickupState.expiresAtLocalMs - Date.now());
      setPickupCodeRemainingMs(left);
      if (left <= 0) {
        fetchRollingPickupCode(orderId);
      }
    };

    tick();
    const timer = setInterval(tick, 200);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchRollingPickupCode(orderId);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isRental, orderData?.id, orderData?.status, rollingPickupState, fetchRollingPickupCode]);

  // Fetch data pesanan atau sewa alat
  useEffect(() => {
    async function loadDetail() {
      try {
        if (!hasLoadedRef.current) setIsLoading(true);

        // 1. Coba ambil langsung dari endpoint detail pesanan spesifik (lewati untuk sewa alat)
        const resSingleOrder = isSewaType ? null : await fetch(`/api/orders/${targetId}`, { cache: 'no-store' }).catch(() => null);
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
        const resOrders = isSewaType ? null : await fetch('/api/orders', { cache: 'no-store' }).catch(() => null);
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
        const resRentals = await fetch('/api/equipments/rent', { cache: 'no-store' }).catch(() => null);
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

    loadDetail().finally(() => {
      hasLoadedRef.current = true;
    });
  }, [targetId, isSewaType, refreshKey]);

  // Selama pesanan belum final: cek status tiap 20 detik & saat tab dibuka kembali
  const isFinalStatus = ['SELESAI', 'DIBATALKAN', 'DITOLAK', 'KADALUARSA'].includes(orderData?.status);
  useEffect(() => {
    if (!orderData || isFinalStatus) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') setRefreshKey((k) => k + 1);
    };
    const t = setInterval(refresh, 20_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [orderData, isFinalStatus]);

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
          label: 'Siap Diambil • Bayar di Kasir',
          badgeClass: 'bg-[#233414] text-[#D4F63D] border-[#233414] font-bold',
          hint: 'Komoditas sudah siap! Datang ke kasir koperasi, tunjukkan kode ambil di bawah, lalu bayar tunai sebelum batas waktu.',
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

  // Status Sewa Alat (step: posisi di stepper 1..4, 0 = alur berhenti)
  const getRentalStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PERSETUJUAN_ADMIN':
        return {
          label: 'Menunggu Verifikasi',
          step: 1,
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
          hint: `Pengurus koperasi sedang mengecek jadwal dan ketersediaan unit. Setelah disetujui, bayar DP ${DP_PERSEN}% tunai di kasir untuk mengunci jadwal.`,
        };
      case 'DISETUJUI':
        return {
          label: 'Disetujui • Bayar DP',
          step: 2,
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-200',
          hint: `Pengajuan disetujui. Bayar DP ${DP_PERSEN}% tunai di kasir koperasi sebelum batas waktu agar jadwal tidak hangus.`,
        };
      case 'DIKONFIRMASI':
        return {
          label: 'Jadwal Terkunci',
          step: 3,
          badgeClass: 'bg-cyan-50 text-cyan-900 border-cyan-200',
          hint: 'DP sudah diterima dan jadwal Anda terkunci. Datang ke gudang koperasi pada tanggal mulai sewa untuk melunasi sisa dan mengambil alat.',
        };
      case 'SIAP_DIAMBIL':
        return {
          label: 'Lunas • Siap Diambil',
          step: 3,
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          hint: 'Pembayaran sudah lunas. Alat siap diambil di gudang koperasi pada tanggal mulai sewa.',
        };
      case 'SEDANG_DISEWA':
        return {
          label: 'Sedang Dipakai',
          step: 4,
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-200',
          hint: `Alat sedang Anda pakai. Kembalikan paling lambat tanggal selesai sewa; keterlambatan dikenakan denda Rp ${DENDA_PER_HARI.toLocaleString('id-ID')}/unit/hari.`,
        };
      case 'SELESAI':
        return {
          label: 'Selesai',
          step: 5,
          badgeClass: 'bg-[#EAEDE7] text-[#1a2610] border-[#cfd6c9]',
          hint: 'Masa sewa selesai dan alat sudah dikembalikan ke koperasi. Terima kasih!',
        };
      case 'KADALUARSA':
        return {
          label: 'Kadaluarsa',
          step: 0,
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          hint: 'Batas waktu pembayaran DP terlewati. Jadwal unit sudah dibuka kembali untuk anggota lain.',
        };
      case 'DITOLAK':
        return {
          label: 'Ditolak',
          step: 0,
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
          hint: 'Pengajuan belum dapat disetujui, misalnya karena jadwal bertabrakan atau unit sedang diservis.',
        };
      case 'DIBATALKAN':
        return {
          label: 'Dibatalkan',
          step: 0,
          badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
          hint: 'Pengajuan sewa alat ini telah dibatalkan.',
        };
      default:
        return {
          label: status,
          step: 1,
          badgeClass: 'bg-[#f4f5f1] text-[#1a2610] border-[#dce1d6]',
          hint: 'Status sewa alat sedang diproses.',
        };
    }
  };

  // Hitung sisa waktu pembayaran: Dihitung 24 jam ketika pesanan sudah di tahap SIAP_DIAMBIL (siap di kasir)
  useEffect(() => {
    if (
      !orderData ||
      orderData.status !== 'SIAP_DIAMBIL' ||
      isRental
    ) {
      setTimeRemaining('');
      return;
    }

    const calculateTime = () => {
      // Dihitung mundur ketika sudah berada di tahap siap diambil (updatedAt), bukan dari awal checkout (createdAt)
      // Pakai batas yang disimpan server; fallback untuk data lama tanpa pickupDeadline
      const expireTime = orderData.pickupDeadline
        ? new Date(orderData.pickupDeadline).getTime()
        : new Date(orderData.readyAt || orderData.updatedAt || orderData.createdAt).getTime() + 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = expireTime - now;

      if (diff <= 0) {
        setTimeRemaining('Waktu pembayaran kasir telah habis (24 jam)');
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
          ? data.message || 'Pengajuan sewa alat berhasil dibatalkan.'
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
      const productId = reviewItem.productId || reviewItem.product?.id;
      if (!productId) throw new Error('Komoditas untuk ulasan ini tidak ditemukan.');
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, komentar: reviewComment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim ulasan');

      showToast({ message: data.message || 'Ulasan dan penilaian berhasil dikirim!', type: 'success' });
      setReviewItem(null);
      setReviewComment('');
    } catch (err: any) {
      showToast({ message: err.message || 'Gagal mengirim ulasan', type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Ringkasan sewa alat
  const rentalCfg = orderData && isRental ? getRentalStatusConfig(orderData.status) : null;
  const rentalTotal = Number(orderData?.totalEstimasi ?? orderData?.totalAmount ?? 0);
  const rentalDp = Number(orderData?.dpAmount ?? hitungDp(rentalTotal));
  const rentalDpPaid = Boolean(orderData?.dpPaidAt);
  const rentalSisa = Math.max(0, rentalTotal - (rentalDpPaid ? rentalDp : 0));
  const rentalExtra = Number(orderData?.lateFee || 0) + Number(orderData?.damageFee || 0);
  const canCancelRental =
    isRental &&
    !!orderData &&
    (orderData.status === 'MENUNGGU_PERSETUJUAN_ADMIN' ||
      orderData.status === 'DIKONFIRMASI' ||
      (orderData.status === 'DISETUJUI' && !orderData.isPaid));
  const cancelForfeitsDp =
    canCancelRental && rentalDpPaid && !!orderData?.startDate && !dpDikembalikanJikaBatal(orderData.startDate);
  const fmtDate = (d?: string | null, withWeekday = false) =>
    d
      ? new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('id-ID', {
          ...(withWeekday ? { weekday: 'short' as const } : {}),
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '-';
  const RENTAL_STEPS = ['Diajukan', 'Bayar DP', 'Ambil Alat', 'Kembalikan'];

  return (
    <div className="min-h-screen bg-[#f4f5f1] pb-28 lg:pb-10 text-[#1a2610] font-sans">
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

          <span className="hidden sm:inline text-[11px] font-semibold text-[#5b6950]">
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
              <div className="px-4 py-3.5 sm:px-5 border-b border-[#dce1d6] bg-[#f4f5f1]/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5b6950]">
                      {isRental ? (
                        <Tractor className="w-3.5 h-3.5 text-[#233414]" aria-hidden="true" />
                      ) : (
                        <Store className="w-3.5 h-3.5 text-[#233414]" aria-hidden="true" />
                      )}
                      <span>{isRental ? 'Sewa Alat' : 'Toko Online'}</span>
                    </div>
                    <div className="font-mono text-sm sm:text-base font-black text-[#1a2610] mt-0.5 truncate">
                      #{orderData.orderNumber || orderData.rentalCode || orderData.id}
                    </div>
                    <div className="text-xs text-[#526046] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5b6950]" aria-hidden="true" />
                      <span>
                        Diajukan{' '}
                        {new Date(orderData.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                      isRental ? rentalCfg!.badgeClass : getStatusConfig(orderData.status).badgeClass
                    }`}
                  >
                    {isRental ? rentalCfg!.label : getStatusConfig(orderData.status).label}
                  </span>
                </div>
              </div>

              {/* Alasan pembatalan (otomatis karena lewat batas, oleh admin, atau oleh pembeli) */}
              {!isRental && orderData.status === 'DIBATALKAN' && (
                <div className="px-4 sm:px-5 py-3 border-b border-[#dce1d6] bg-red-50/60 text-xs text-red-800 flex items-start gap-2">
                  <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Alasan dibatalkan: </span>
                    {orderData.cancelReason || 'Pesanan dibatalkan.'}
                    {orderData.cancelledAt && (
                      <span className="text-red-600/80">
                        {' '}
                        ·{' '}
                        {new Date(orderData.cancelledAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )}

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

                    {/* Akumulasi Batas Waktu Pembayaran 24 Jam (Tahap Bayar di Kasir: Dihitung 24 jam sejak siap diambil) */}
                    {/* Kode Ambil: dinamis 20 detik, serasi dengan gaya kartu verifikasi berlapis */}
                    {orderData.status === 'SIAP_DIAMBIL' && (rollingPickupState?.code || orderData.pickupCode) && (() => {
                      const activeCode = rollingPickupState?.code || String(orderData.pickupCode);
                      const stepSeconds = rollingPickupState?.stepSeconds || 20;
                      const totalMs = stepSeconds * 1000;
                      const progress = Math.min(1, Math.max(0, pickupCodeRemainingMs / totalMs));
                      const radius = 10;
                      const circumference = 2 * Math.PI * radius;
                      const dashOffset = circumference * (1 - progress);
                      const isLow = pickupCodeRemainingMs <= 3500;
                      const secondsLeft = Math.max(1, Math.ceil(pickupCodeRemainingMs / 1000));

                      return (
                        <div className="mt-3 p-1.5 bg-[#f3f4f6] border border-slate-200/90 rounded-[24px]">
                          {/* Top Strip pada Layer Abu-Abu */}
                          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-slate-900">
                              Kode Ambil Pesanan
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">
                              Siap diambil di kasir
                            </span>
                          </div>

                          {/* Inner White Card */}
                          <div className="bg-white rounded-[20px] p-4 sm:p-5 border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.03)] text-center">
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                              Tunjukkan 6 digit kode di bawah ke petugas kasir saat mengambil & membayar. Kode berganti otomatis setiap {stepSeconds} detik.
                            </p>

                            <div
                              className="mt-3.5 max-w-[320px] mx-auto grid grid-cols-6 gap-2"
                              aria-live="polite"
                              aria-label={`Kode ambil ${activeCode.split('').join(' ')}`}
                            >
                              {activeCode.split('').map((digit: string, idx: number) => (
                                <div
                                  key={idx}
                                  className={`h-12 sm:h-13 rounded-2xl border bg-white flex items-center justify-center font-mono text-lg sm:text-xl font-semibold text-slate-800 tabular-nums select-all transition-colors duration-200 ${
                                    isLow ? 'border-amber-500/80' : 'border-emerald-600/85'
                                  }`}
                                >
                                  {digit}
                                </div>
                              ))}
                            </div>

                            {/* Circular Countdown Ring 20 Detik */}
                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 tabular-nums">
                              <svg
                                className="w-6 h-6 -rotate-90 shrink-0"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r={radius}
                                  fill="none"
                                  stroke="#e2e8f0"
                                  strokeWidth="2.5"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r={radius}
                                  fill="none"
                                  stroke={isLow ? '#f59e0b' : '#16a34a'}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={dashOffset}
                                  className="transition-[stroke-dashoffset,stroke] duration-200 ease-linear"
                                />
                              </svg>
                              <span>
                                Kode baru dalam <strong className="font-semibold text-slate-700">{secondsLeft} dtk</strong>
                              </span>
                            </div>

                            <div className="mt-4 max-w-[320px] mx-auto">
                              <button
                                type="button"
                                onClick={() => handleCopyPickupCode(activeCode)}
                                className={`w-full h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                  copiedPickupCode
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {copiedPickupCode ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    <span>Kode Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin Kode</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                              Jangan bagikan tangkapan layar kode ini kepada orang lain demi keamanan pesanan Anda.
                            </p>
                          </div>
                        </div>
                      );
                    })()}

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
                              Pesanan otomatis dibatalkan sistem dan stok komoditas dikembalikan ke gudang jika belum dibayar di kasir dalam batas waktu 24 jam sejak siap diambil.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informasi Pesanan Masuk (Tahap 1: Pembeli bisa batalkan manual sebelum diproses gudang) */}
                    {orderData.status === 'MENUNGGU_PEMBAYARAN' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold block sm:inline">Antrean Pesanan Masuk: </span>
                            <span className="text-slate-600">Menunggu antrean persiapan fisik oleh petugas gudang.</span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Anda dapat membatalkan pesanan sebelum mulai disiapkan oleh petugas gudang. Batas waktu pembayaran 24 jam baru akan dihitung mundur setelah komoditas siap diambil di kasir.
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

              {/* Status & Alur Sewa Alat */}
              {isRental && rentalCfg && (
                <div className="p-4 sm:p-5 border-b border-[#dce1d6] space-y-3.5">
                  {rentalCfg.step > 0 && (
                    <ol className="grid grid-cols-4 relative" aria-label="Tahapan sewa">
                      <span className="absolute top-3.5 left-[12.5%] right-[12.5%] h-0.5 bg-[#dce1d6]" aria-hidden="true" />
                      <span
                        className="absolute top-3.5 left-[12.5%] h-0.5 bg-[#233414] transition-all duration-500"
                        style={{ width: `${(Math.min(rentalCfg.step, 4) - 1) * 25}%` }}
                        aria-hidden="true"
                      />
                      {RENTAL_STEPS.map((label, i) => {
                        const n = i + 1;
                        const done = rentalCfg.step > n;
                        const current = rentalCfg.step === n;
                        return (
                          <li key={label} className="relative z-10 flex flex-col items-center text-center">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                done
                                  ? 'bg-[#233414] text-[#D4F63D]'
                                  : current
                                  ? 'bg-[#233414] text-[#D4F63D] ring-4 ring-[#e2f2c8]'
                                  : 'bg-white text-[#5b6950] border border-[#cfd6c9]'
                              }`}
                              aria-current={current ? 'step' : undefined}
                            >
                              {done ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> : n}
                            </span>
                            <span
                              className={`mt-1.5 text-[11px] sm:text-xs font-bold ${
                                current || done ? 'text-[#1a2610]' : 'text-[#5b6950]'
                              }`}
                            >
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  <p className="text-[13px] text-[#425234] leading-relaxed">{rentalCfg.hint}</p>

                  {orderData.status === 'DISETUJUI' && !orderData.isPaid && (
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">DP {DP_PERSEN}% di kasir</span>
                        <span className="text-base font-black tabular-nums">Rp {rentalDp.toLocaleString('id-ID')}</span>
                      </div>
                      {orderData.paymentDeadline && (
                        <div className="mt-1 text-xs text-blue-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          Paling lambat{' '}
                          <strong>
                            {new Date(orderData.paymentDeadline).toLocaleString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                              timeZone: 'Asia/Makassar',
                            })}{' '}
                            WITA
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  {(orderData.status === 'DIKONFIRMASI' || orderData.status === 'SIAP_DIAMBIL') && (
                    <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <div className="font-semibold">Ambil alat pada</div>
                        <div className="font-bold">{fmtDate(orderData.startDate, true)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold">{orderData.isPaid ? 'Status bayar' : 'Sisa dibayar saat ambil'}</div>
                        <div className="text-base font-black tabular-nums">
                          {orderData.isPaid ? 'Lunas' : `Rp ${rentalSisa.toLocaleString('id-ID')}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {orderData.status === 'DIBATALKAN' && rentalDpPaid && (
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 leading-relaxed">
                      {orderData.dpForfeited
                        ? `DP Rp ${rentalDp.toLocaleString('id-ID')} hangus karena dibatalkan kurang dari H-${BATAS_BATAL_HARI}.`
                        : orderData.dpRefundedAt
                        ? 'DP sudah dikembalikan oleh kasir koperasi.'
                        : `DP Rp ${rentalDp.toLocaleString('id-ID')} akan dikembalikan penuh. Silakan ambil di kasir koperasi.`}
                    </div>
                  )}

                  {canCancelRental && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#eef1ea]">
                      <p className="text-xs text-[#526046] leading-relaxed">
                        {cancelForfeitsDp
                          ? `Pembatalan sekarang (kurang dari H-${BATAS_BATAL_HARI}) membuat DP hangus.`
                          : rentalDpPaid
                          ? `Batal paling lambat H-${BATAS_BATAL_HARI} agar DP kembali penuh.`
                          : 'Anda masih bisa membatalkan pengajuan ini tanpa biaya.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCancelModalOpen(true)}
                        className="w-full sm:w-auto min-h-[40px] px-4 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-bold transition cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        Batalkan Pengajuan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Daftar Barang / Alat */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#1a2610] tracking-tight">
                    {isRental ? 'Daftar Alat Disewa' : 'Rincian Komoditas'}
                  </h3>
                  <span className="text-xs font-medium text-[#526046] tabular-nums">
                    {orderData.items?.length || 1} {isRental ? 'unit' : 'barang'}
                  </span>
                </div>

                <div className="space-y-3">
                  {!isRental &&
                    orderData.items?.map((item: any) => {
                      const itemSubtotal =
                        item.subtotal !== undefined && item.subtotal !== null && !isNaN(Number(item.subtotal))
                          ? Number(item.subtotal)
                          : item.quantity * Number(item.hargaPerSatuan || 0);

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 sm:p-4 rounded-xl bg-[#f8f9f6] border border-[#dce1d6] space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            {item.product?.imageUrl ? (
                              <img
                                src={getPrimaryImage(item.product.imageUrl)}
                                alt={item.product.nama}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-[#dce1d6] shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#e2f2c8]/60 text-[#233414] flex items-center justify-center shrink-0 border border-[#c9e39e]">
                                <Package className="w-6 h-6" aria-hidden="true" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-[#1a2610] leading-snug line-clamp-2">
                                  {item.namaProduk || item.product?.nama || 'Komoditas Pertanian'}
                                </h4>
                                <p className="text-xs text-[#526046] mt-0.5 leading-snug tabular-nums">
                                  {item.quantity} {item.satuan || item.product?.satuan || 'unit'} × Rp{' '}
                                  {Number(item.hargaPerSatuan).toLocaleString('id-ID')}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs text-[#5b6950] block font-medium leading-tight">
                                  Subtotal
                                </span>
                                <span className="text-sm sm:text-base font-bold text-[#1a2610] mt-0.5 block leading-snug tabular-nums">
                                  Rp {itemSubtotal.toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {(item.petani?.name || orderData.status === 'SELESAI') && (
                            <div className="pt-2.5 border-t border-[#e5e9df] flex items-center justify-between gap-2 flex-wrap">
                              {item.petani?.name ? (
                                <div className="inline-flex items-center gap-1.5 text-xs text-[#526046] min-w-0">
                                  <Store className="w-3.5 h-3.5 text-[#344d15] shrink-0" aria-hidden="true" />
                                  <span className="shrink-0">Mitra Petani:</span>
                                  <span className="font-semibold text-[#1a2610] truncate">
                                    {item.petani.name}
                                  </span>
                                </div>
                              ) : (
                                <span />
                              )}

                              {orderData.status === 'SELESAI' && (
                                <div className="flex items-center gap-2 flex-wrap">
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
                                    Lihat Produk →
                                  </Link>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

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
                          className="p-3.5 sm:p-4 rounded-xl bg-[#f8f9f6] border border-[#dce1d6] space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={getPrimaryImage(item.imageUrl)}
                                alt={itemName}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-[#dce1d6] shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#e2f2c8]/60 text-[#233414] flex items-center justify-center shrink-0 border border-[#c9e39e]">
                                <Tractor className="w-6 h-6" aria-hidden="true" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-[#1a2610] leading-snug line-clamp-2">
                                  {itemName}
                                </h4>
                                <p className="text-xs text-[#526046] mt-0.5 leading-snug tabular-nums">
                                  {itemQty} unit × Rp {itemPrice.toLocaleString('id-ID')} / {itemUnit}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs text-[#5b6950] block font-medium leading-tight">
                                  Subtotal
                                </span>
                                <span className="text-sm sm:text-base font-bold text-[#1a2610] mt-0.5 block leading-snug tabular-nums">
                                  Rp {itemSubtotal.toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-[#e5e9df] flex items-center gap-1.5 text-xs text-[#526046]">
                            <Calendar className="w-3.5 h-3.5 text-[#344d15] shrink-0" aria-hidden="true" />
                            <span className="font-semibold text-[#1a2610] truncate">
                              {fmtDate(item.startDate || orderData.startDate)}
                              {(item.endDate || orderData.endDate) &&
                              String(item.endDate || orderData.endDate).slice(0, 10) !==
                                String(item.startDate || orderData.startDate).slice(0, 10)
                                ? ` – ${fmtDate(item.endDate || orderData.endDate)}`
                                : ''}{' '}
                              · {itemDuration} {itemUnit}
                            </span>
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
                  <div className="text-xs font-bold text-[#1a2610] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#233414] shrink-0" />
                    <span>{isRental ? 'Lokasi Lahan Kebun Pertanian' : 'Lokasi Serah Terima & Kasir'}</span>
                  </div>
                  <div className="text-[#526046] font-medium leading-relaxed">
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
                        className="text-[#233414] hover:text-[#344d15] font-bold hover:underline inline-flex items-center gap-1 text-xs"
                      >
                        <span>Buka Koordinat GPS di Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Catatan Pembeli */}
                <div className="p-3.5 bg-white rounded-xl border border-[#dce1d6] space-y-1">
                  <div className="text-xs font-bold text-[#1a2610] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#233414] shrink-0" />
                    <span>Catatan Pesanan</span>
                  </div>
                  <div className="text-[#526046] leading-relaxed">
                    {orderData.catatan || orderData.notes ? (
                      <span className="text-[#1a2610]">{orderData.catatan || orderData.notes}</span>
                    ) : (
                      <span className="text-[#5b6950]">Tidak ada catatan khusus untuk pesanan ini.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rincian Pembayaran */}
              <div className="p-4 sm:p-5 border-t border-[#dce1d6] bg-white text-[13px]">
                <div className="flex items-center justify-between gap-2 text-xs text-[#526046]">
                  <span>Metode pembayaran</span>
                  <span className="font-semibold text-[#1a2610]">
                    {orderData.paymentMethod === 'CASH_KOPERASI' || isRental ? 'Tunai di kasir koperasi' : 'Transfer bank'}
                  </span>
                </div>
                {isRental ? (
                  <dl className="mt-3 space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#526046]">Biaya sewa</dt>
                      <dd className="font-semibold tabular-nums">Rp {rentalTotal.toLocaleString('id-ID')}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#526046]">DP {DP_PERSEN}% {rentalDpPaid ? '(sudah dibayar)' : ''}</dt>
                      <dd className={`font-semibold tabular-nums ${rentalDpPaid ? 'text-emerald-700' : ''}`}>
                        {rentalDpPaid ? '− ' : ''}Rp {rentalDp.toLocaleString('id-ID')}
                      </dd>
                    </div>
                    {rentalExtra > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#526046]">
                          Denda & kerusakan
                          {orderData.damageNotes ? ` (${orderData.damageNotes})` : ''}
                        </dt>
                        <dd className="font-semibold tabular-nums text-rose-700">Rp {rentalExtra.toLocaleString('id-ID')}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-2.5 mt-1 border-t border-dashed border-[#dce1d6]">
                      <dt className="font-bold text-[#1a2610]">
                        {orderData.isPaid ? 'Total dibayar' : rentalDpPaid ? 'Sisa pelunasan' : 'Total biaya'}
                      </dt>
                      <dd className="text-xl font-black text-[#233414] tracking-tight tabular-nums">
                        Rp{' '}
                        {(orderData.isPaid
                          ? rentalTotal + rentalExtra
                          : rentalDpPaid
                          ? rentalSisa + rentalExtra
                          : rentalTotal
                        ).toLocaleString('id-ID')}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="mt-3 pt-2.5 border-t border-dashed border-[#dce1d6] flex items-center justify-between gap-2">
                    <span className="font-bold text-[#1a2610]">Total pembayaran</span>
                    <span className="text-xl font-black text-[#233414] tracking-tight tabular-nums">
                      Rp {Number(orderData.totalAmount ?? orderData.totalEstimasi ?? 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-[#f4f5f1]/80 border-t border-[#dce1d6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <p className="text-[#526046]">Ada pertanyaan? Hubungi admin koperasi.</p>
                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="min-h-[44px] px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#D4F63D]" aria-hidden="true" />
                    Chat Admin
                  </button>
                  <Link
                    href={isRental ? '/sewa-alat' : '/toko'}
                    className="min-h-[44px] px-4 rounded-xl border border-[#cfd6c9] hover:bg-white bg-white/70 text-[#1a2610] font-bold text-xs transition flex items-center justify-center"
                  >
                    {isRental ? 'Sewa Alat Lain' : 'Beli Lagi'}
                  </Link>
                </div>
              </div>
            </div>
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
                <h3 className="text-base font-bold text-[#1a2610]">
                  {isRental ? 'Batalkan Pengajuan Sewa?' : 'Batalkan Pesanan Ini?'}
                </h3>
                <p className="text-xs text-[#526046] mt-0.5 leading-relaxed">
                  {isRental
                    ? 'Jadwal alat akan dilepas untuk anggota lain dan pengajuan tidak bisa dilanjutkan.'
                    : 'Pesanan akan dibatalkan secara permanen dan seluruh stok komoditas akan dikembalikan ke gudang koperasi.'}
                </p>
                {isRental && rentalDpPaid && (
                  <p
                    className={`mt-2 p-2.5 rounded-lg text-xs font-semibold leading-relaxed ${
                      cancelForfeitsDp ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {cancelForfeitsDp
                      ? `DP Rp ${rentalDp.toLocaleString('id-ID')} hangus karena pembatalan kurang dari H-${BATAS_BATAL_HARI}.`
                      : `DP Rp ${rentalDp.toLocaleString('id-ID')} akan dikembalikan penuh di kasir.`}
                  </p>
                )}
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
                <span>{isRental ? 'Ya, Batalkan Sewa' : 'Ya, Batalkan Pesanan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
