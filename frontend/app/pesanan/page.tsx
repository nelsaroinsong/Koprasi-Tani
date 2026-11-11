'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  MessageCircle,
  ArrowRight,
  ChevronRight,
  Home,
  MapPin,
  Calendar,
  Package,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Loader2,
  ExternalLink,
  Star,
  X,
  Banknote,
  Tractor,
  Truck,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getPrimaryImage } from '@/lib/utils';

type OrderStatus = 'ALL' | 'MENUNGGU_PEMBAYARAN' | 'DIPROSES' | 'SIAP_DIAMBIL' | 'SELESAI' | 'DIBATALKAN';

const STATUS_FILTERS: { key: OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'Semua Pesanan' },
  { key: 'MENUNGGU_PEMBAYARAN', label: 'Pesanan Masuk' },
  { key: 'DIPROSES', label: 'Disiapkan Gudang' },
  { key: 'SIAP_DIAMBIL', label: 'Bayar di Kasir' },
  { key: 'SELESAI', label: 'Selesai' },
  { key: 'DIBATALKAN', label: 'Dibatalkan' },
];

const RENTAL_STATUS_FILTERS = [
  { key: 'ALL', label: 'Semua Pengajuan' },
  { key: 'MENUNGGU_PERSETUJUAN_ADMIN', label: 'Menunggu Persetujuan' },
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'SIAP_DIAMBIL', label: 'Siap Diambil' },
  { key: 'SEDANG_DISEWA', label: 'Sedang Disewa' },
  { key: 'SELESAI', label: 'Selesai' },
  { key: 'DIBATALKAN', label: 'Dibatalkan' },
  { key: 'DITOLAK', label: 'Ditolak' },
];

let cachedUserOrders: any[] | null = null;
let cachedUserRentals: any[] | null = null;

export default function PesananPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>(() => cachedUserOrders || []);
  const [isLoading, setIsLoading] = useState(() => !cachedUserOrders);
  const [activeFilter, setActiveFilter] = useState<OrderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState<{ [id: string]: boolean }>({});
  const [expandedRentalIds, setExpandedRentalIds] = useState<{ [id: string]: boolean }>({});

  const toggleOrderExpand = (id: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRentalExpand = (id: string) => {
    setExpandedRentalIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [rentalActiveFilter, setRentalActiveFilter] = useState<string>('ALL');
  const [rentalSearchQuery, setRentalSearchQuery] = useState('');

  // Review Modal State for Selesai Orders
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Cancellation Modal State
  const [cancelTarget, setCancelTarget] = useState<{
    type: 'order' | 'rental';
    id: string;
    orderNumber?: string;
    title?: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  const [warehouseAddress, setWarehouseAddress] = useState(
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara'
  );
  const [adminPhone, setAdminPhone] = useState('081944078924');

  // Ambil info alamat gudang & kontak admin
  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alamat) setWarehouseAddress(data.alamat);
        if (data?.telepon) setAdminPhone(data.telepon);
      })
      .catch(() => {});
  }, []);

  // Fetch daftar pesanan pengguna
  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok && data.orders) {
        setOrders(data.orders);
        cachedUserOrders = data.orders;
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const [activeTypeTab, setActiveTypeTab] = useState<'toko' | 'sewa-alat'>('toko');
  const [rentalOrders, setRentalOrders] = useState<any[]>(() => cachedUserRentals || []);
  const [isRentalLoading, setIsRentalLoading] = useState(() => !cachedUserRentals);

  // Fetch daftar pengajuan sewa alat pengguna (SWR Pattern)
  const fetchRentalOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsRentalLoading(true);
      }
      const res = await fetch('/api/equipments/rent');
      const data = await res.json();
      if (res.ok && Array.isArray(data.rentals)) {
        setRentalOrders(data.rentals);
        cachedUserRentals = data.rentals;
      }
    } catch (err) {
      console.error('Error fetching rental orders:', err);
    } finally {
      setIsRentalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders(Boolean(cachedUserOrders));
      fetchRentalOrders(Boolean(cachedUserRentals));
    }
  }, [user, fetchOrders, fetchRentalOrders]);

  // Statistik Ringkasan Pesanan (Tokopedia Quick Metrics)
  const stats = useMemo(() => {
    let pendingCount = 0;
    let diprosesCount = 0;
    let siapDiambilCount = 0;
    let selesaiCount = 0;
    let dibatalkanCount = 0;

    for (const order of orders) {
      if (order.status === 'MENUNGGU_PEMBAYARAN') pendingCount++;
      if (order.status === 'DIPROSES') diprosesCount++;
      if (order.status === 'SIAP_DIAMBIL') siapDiambilCount++;
      if (order.status === 'SELESAI') selesaiCount++;
      if (order.status === 'DIBATALKAN') dibatalkanCount++;
    }

    return {
      total: orders.length,
      pendingCount,
      diprosesCount,
      siapDiambilCount,
      selesaiCount,
      dibatalkanCount,
    };
  }, [orders]);

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (activeFilter !== 'ALL' && order.status !== activeFilter) {
        return false;
      }

      // 2. Search Query (No Order, Nama Komoditas, Petani)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchOrderNumber = order.orderNumber?.toLowerCase().includes(q);
        const matchNotes = order.catatan?.toLowerCase().includes(q);
        const matchItems = order.items?.some(
          (item: any) =>
            item.namaProduk?.toLowerCase().includes(q) ||
            item.product?.nama?.toLowerCase().includes(q) ||
            item.petani?.name?.toLowerCase().includes(q)
        );
        return matchOrderNumber || matchNotes || matchItems;
      }

      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  // Statistik Ringkasan Pengajuan Sewa Alat
  const rentalStats = useMemo(() => {
    let pendingCount = 0;
    let disetujuiCount = 0;
    let siapCount = 0;
    let aktifCount = 0;
    let selesaiCount = 0;
    let dibatalkanCount = 0;
    let ditolakCount = 0;

    for (const r of rentalOrders) {
      if (r.status === 'MENUNGGU_PERSETUJUAN_ADMIN') pendingCount++;
      if (r.status === 'DISETUJUI') disetujuiCount++;
      if (r.status === 'SIAP_DIAMBIL') siapCount++;
      if (r.status === 'SEDANG_DISEWA') aktifCount++;
      if (r.status === 'SELESAI') selesaiCount++;
      if (r.status === 'DIBATALKAN') dibatalkanCount++;
      if (r.status === 'DITOLAK') ditolakCount++;
    }

    return {
      total: rentalOrders.length,
      pendingCount,
      disetujuiCount,
      siapCount,
      aktifCount,
      selesaiCount,
      dibatalkanCount,
      ditolakCount,
    };
  }, [rentalOrders]);

  // Filter & Search Logic Sewa Alat
  const filteredRentals = useMemo(() => {
    return rentalOrders.filter((rental) => {
      if (rentalActiveFilter !== 'ALL' && rental.status !== rentalActiveFilter) {
        return false;
      }
      if (rentalSearchQuery.trim()) {
        const q = rentalSearchQuery.toLowerCase().trim();
        const matchNumber = rental.rentalNumber?.toLowerCase().includes(q);
        const matchNotes = rental.notes?.toLowerCase().includes(q);
        const matchLocation = rental.farmLocationAddress?.toLowerCase().includes(q) || rental.location?.toLowerCase().includes(q);
        const matchItems = rental.items?.some((item: any) =>
          item.equipmentName?.toLowerCase().includes(q)
        );
        return matchNumber || matchNotes || matchLocation || matchItems;
      }
      return true;
    });
  }, [rentalOrders, rentalActiveFilter, rentalSearchQuery]);

  const handleOpenReviewModal = (item: any) => {
    setReviewItem(item);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;

    try {
      setIsSubmittingReview(true);
      const prodId = reviewItem.productId || reviewItem.product?.id;
      const res = await fetch(`/api/products/${prodId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          komentar: reviewComment,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast({
          title: 'Ulasan Berhasil Dikirim',
          message: `Terima kasih! Ulasan Anda untuk "${reviewItem.namaProduk || reviewItem.product?.nama}" telah tersimpan.`,
          type: 'success',
        });
        setReviewItem(null);
      } else {
        showToast({
          title: 'Gagal Mengirim Ulasan',
          message: data.error || 'Terjadi kesalahan saat menyimpan ulasan.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error submit review:', err);
      showToast({
        title: 'Gagal',
        message: 'Tidak dapat menghubungi server.',
        type: 'error',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Konfigurasi Status Badge & Stepper (Alur: Pesanan Masuk -> Disiapkan Gudang -> Bayar di Kasir -> Selesai)
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return {
          label: 'Pesanan Masuk',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-200/80',
          dotClass: 'bg-amber-500',
          step: 1,
          hint: 'Pesanan telah diterima sistem koperasi dan masuk antrean pengecekan staf gudang.',
        };
      case 'DIPROSES':
        return {
          label: 'Disiapkan Gudang',
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
          dotClass: 'bg-emerald-500',
          step: 2,
          hint: 'Staf gudang koperasi sedang mengecek fisik dan mengemas komoditas pesanan Anda.',
        };
      case 'SIAP_DIAMBIL':
        return {
          label: 'Bayar di Kasir',
          badgeClass: 'bg-[#233414]/10 text-[#233414] border-[#233414]/20',
          dotClass: 'bg-[#233414]',
          step: 3,
          hint: 'Komoditas telah siap di kasir. Silakan bayar di kasir koperasi (24 jam) sebelum serah terima.',
        };
      case 'SELESAI':
        return {
          label: 'Selesai & Lunas',
          badgeClass: 'bg-green-50 text-green-800 border-green-200',
          dotClass: 'bg-green-600',
          step: 4,
          hint: 'Komoditas telah diserahkan dan pembayaran telah sah dicatat oleh kasir koperasi.',
        };
      case 'DIBATALKAN':
        return {
          label: 'Dibatalkan',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          dotClass: 'bg-rose-500',
          step: 0,
          hint: 'Pesanan telah dibatalkan dan alokasi stok komoditas telah dikembalikan ke gudang koperasi.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-neutral-50 text-neutral-800 border-neutral-200',
          dotClass: 'bg-neutral-500',
          step: 1,
          hint: '',
        };
    }
  };

  // Handler WhatsApp Chat
  const handleOpenWhatsApp = (order: any) => {
    const rawPhone = adminPhone || '081944078924';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const itemsSummary = order.items
      ?.map((i: any) => `- ${i.namaProduk || i.product?.nama} (${i.quantity} ${i.satuan || i.product?.satuan || 'unit'})`)
      .join('\n');

    const message = `Halo Admin Koperasi Sinar Pagi Sejahtera, saya ingin konfirmasi pesanan resmi saya:

Nomor Pesanan: #${order.orderNumber}
Nama Pembeli: ${order.pembeli?.name || user?.name}
Total Tagihan: Rp ${Number(order.totalAmount).toLocaleString('id-ID')}
Metode Bayar: ${order.paymentMethod === 'CASH_KOPERASI' ? 'Bayar Tunai (Cash) di Koperasi' : 'Transfer'}
Lokasi Ambil: ${warehouseAddress}

Komoditas:
${itemsSummary}

Mohon info kesiapan fisik komoditas di gudang koperasi. Terima kasih.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Helper status & WhatsApp untuk pengajuan sewa alat
  const getRentalStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PERSETUJUAN_ADMIN':
        return {
          label: 'Menunggu Verifikasi Admin',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          dotClass: 'bg-amber-500',
          hint: 'Pengajuan sewa alat Anda sedang diverifikasi pengurus koperasi. Unit resmi terkunci setelah diverifikasi dan dilunasi tunai di kasir kantor koperasi.',
        };
      case 'DISETUJUI':
        return {
          label: 'Menunggu Bayar di Kasir',
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-300 font-bold',
          dotClass: 'bg-blue-600',
          hint: 'Pengajuan telah disetujui pengurus! Harap segera datang ke kantor koperasi untuk pelunasan tunai di kasir sebelum batas waktu pembayaran agar reservasi tidak hangus.',
        };
      case 'SIAP_DIAMBIL':
        return {
          label: 'Lunas Tunai • Siap Diambil',
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
          dotClass: 'bg-emerald-600',
          hint: 'Pembayaran tunai telah diterima kasir koperasi. Unit mesin resmi terkunci untuk Anda dan siap diambil di pool alsintan.',
        };
      case 'SEDANG_DISEWA':
        return {
          label: 'Sedang Digunakan di Lahan',
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-300 font-bold',
          dotClass: 'bg-purple-600',
          hint: 'Unit alat sedang aktif dalam masa pemakaian operasional di lahan perkebunan Anda.',
        };
      case 'SELESAI':
        return {
          label: 'Sewa Selesai & Kembali',
          badgeClass: 'bg-[#EAEDE7] text-[#1a2610] border-[#cfd6c9] font-bold',
          dotClass: 'bg-[#233414]',
          hint: 'Masa sewa selesai dan fisik alat telah dikembalikan dalam kondisi baik ke koperasi.',
        };
      case 'KADALUARSA':
        return {
          label: 'Batas Waktu Bayar Habis',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
          dotClass: 'bg-rose-500',
          hint: 'Batas waktu pembayaran tunai di kasir telah terlewati tanpa pelunasan. Slot reservasi unit telah dialihkan otomatis.',
        };
      case 'DIBATALKAN':
        return {
          label: 'Dibatalkan',
          badgeClass: 'bg-stone-50 text-stone-700 border-stone-200 font-bold',
          dotClass: 'bg-stone-400',
          hint: 'Pengajuan sewa alat ini telah dibatalkan oleh pemohon.',
        };
      case 'DITOLAK':
        return {
          label: 'Pengajuan Ditolak',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
          dotClass: 'bg-rose-500',
          hint: 'Pengajuan belum dapat disetujui karena jadwal pemakaian tumpang tindih atau kondisi alat sedang perbaikan.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-neutral-50 text-neutral-800 border-neutral-200',
          dotClass: 'bg-neutral-500',
          hint: '',
        };
    }
  };

  const handleOpenRentalWhatsApp = (rental: any) => {
    const rawPhone = adminPhone || '081944078924';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const rentalCode = rental.rentalCode || rental.rentalNumber || rental.id;
    const durationDays = rental.durationDays || rental.durasi || rental.items?.[0]?.durasi || 1;
    const totalAmount = rental.totalEstimasi ?? rental.totalAmount ?? 0;
    const location = rental.lokasiLahan || rental.farmLocationAddress || rental.location || '-';
    const notes = rental.catatan || rental.notes;

    const itemsSummary = rental.items
      ?.map((i: any) => {
        const name = i.nama || i.equipmentName || 'Alat Pertanian';
        const qty = i.jumlahUnit || i.quantity || 1;
        const dur = i.durasi || i.rentalDays || durationDays;
        return `- ${name} (${qty} unit x ${dur} hari)`;
      })
      .join('\n');

    const message = `Halo Admin Koperasi Sinar Pagi Sejahtera, saya ingin konfirmasi pengajuan sewa alat pertanian saya:

Nomor Pengajuan: #${rentalCode}
Nama Pemohon: ${rental.userName} (${rental.userPhone || '-'})
Tanggal Mulai: ${rental.startDate}
Durasi Sewa: ${durationDays} hari
Lokasi Lahan Kebun: ${location}
${
  rental.farmLocationGps
    ? `Titik GPS Lahan: ${rental.farmLocationGps.lat}, ${rental.farmLocationGps.lng}\nMaps: https://www.google.com/maps?q=${rental.farmLocationGps.lat},${rental.farmLocationGps.lng}\n`
    : ''
}Total Biaya Sewa: Rp ${Number(totalAmount).toLocaleString('id-ID')}
Status: ${rental.status}

Daftar Alat:
${itemsSummary || '-'}

${notes ? `Catatan: ${notes}\n` : ''}
Mohon info persetujuan admin koperasi untuk pengajuan ini. Terima kasih!`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Handler Konfirmasi Pembatalan Pesanan / Sewa Alat
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCanceling(true);
    try {
      if (cancelTarget.type === 'order') {
        const res = await fetch(`/api/orders/${encodeURIComponent(cancelTarget.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CANCEL',
            alasanBatal: cancelReason.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal membatalkan pesanan');
        }
        showToast({
          title: 'Pesanan Berhasil Dibatalkan',
          message: 'Pesanan telah dibatalkan dan alokasi komoditas telah dikembalikan ke stok.',
          type: 'success',
        });
        await fetchOrders(true);
      } else {
        const res = await fetch('/api/equipments/rent', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rentalId: cancelTarget.id,
            action: 'CANCEL',
            alasanBatal: cancelReason.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal membatalkan pengajuan sewa');
        }
        showToast({
          title: 'Pengajuan Sewa Dibatalkan',
          message: 'Pengajuan sewa alat pertanian berhasil dibatalkan.',
          type: 'success',
        });
        await fetchRentalOrders();
      }
      setCancelTarget(null);
      setCancelReason('');
    } catch (err: any) {
      showToast({
        title: 'Pembatalan Gagal',
        message: err?.message || 'Terjadi kesalahan sistem saat membatalkan.',
        type: 'error',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] text-[#1a2610] flex flex-col font-sans">
        <AppHeader activePage="pesanan" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#e2f2c8] text-[#233414] border border-[#c9e39e] flex items-center justify-center mb-4 shadow-2xs">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1a2610]">Masuk untuk Melihat Daftar Pesanan</h2>
          <p className="text-xs text-[#526046] max-w-sm mt-1.5 leading-relaxed">
            Silakan masuk dengan akun Google atau nomor telepon Anda untuk memantau status pesanan dan nota resmi koperasi.
          </p>
          <Link
            href="/login"
            className="mt-5 px-6 py-2.5 rounded-full bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs shadow-xs transition"
          >
            Masuk ke Akun
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-[#1a2610] flex flex-col font-sans pb-16 sm:pb-10">
      <AppHeader activePage="pesanan" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-4 sm:py-6 lg:py-8 space-y-6">
        {/* Top Bar: Tab Switcher & Search Box */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Tab Switcher: Toko Online vs Sewa Alat */}
          <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-[#EAEDE7] border border-[#cfd6c9] rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTypeTab('toko')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTypeTab === 'toko'
                  ? 'bg-[#233414] text-white shadow-2xs'
                  : 'bg-transparent text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <ShoppingBag className={`w-3.5 h-3.5 ${activeTypeTab === 'toko' ? 'text-[#D4F63D]' : 'text-[#526046]'}`} />
              <span>Pesanan Toko</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
                activeTypeTab === 'toko'
                  ? 'bg-[#D4F63D] text-[#1a2610]'
                  : 'bg-white text-[#233414] border border-[#dce1d6]'
              }`}>
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTypeTab('sewa-alat')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTypeTab === 'sewa-alat'
                  ? 'bg-[#233414] text-white shadow-2xs'
                  : 'bg-transparent text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <Tractor className={`w-3.5 h-3.5 ${activeTypeTab === 'sewa-alat' ? 'text-[#D4F63D]' : 'text-[#526046]'}`} />
              <span>Sewa Alat</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
                activeTypeTab === 'sewa-alat'
                  ? 'bg-[#D4F63D] text-[#1a2610]'
                  : 'bg-white text-[#233414] border border-[#dce1d6]'
              }`}>
                {rentalOrders.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80 lg:w-96 shrink-0">
            <Search className="w-4 h-4 text-[#5b6950] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={activeTypeTab === 'toko' ? searchQuery : rentalSearchQuery}
              onChange={(e) => {
                if (activeTypeTab === 'toko') {
                  setSearchQuery(e.target.value);
                } else {
                  setRentalSearchQuery(e.target.value);
                }
              }}
              placeholder={
                activeTypeTab === 'toko'
                  ? 'Cari no. pesanan, komoditas...'
                  : 'Cari no. pengajuan, alat...'
              }
              className="w-full text-xs pl-10 pr-8 py-2.5 bg-white border border-[#cfd6c9] rounded-full focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] shadow-2xs text-[#1a2610] placeholder:text-[#5b6950] transition"
            />
            {(activeTypeTab === 'toko' ? searchQuery : rentalSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  if (activeTypeTab === 'toko') setSearchQuery('');
                  else setRentalSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5b6950] hover:text-[#1a2610] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Layout matching Gambar 1 */}
        {activeTypeTab === 'toko' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
            {/* Left Column: Filter Pills (Horizontal scrolling badges on mobile, sidebar on desktop) */}
            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
              <div className="flex lg:flex-col gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {[
                  { key: 'ALL' as OrderStatus, label: 'Semua Pesanan', count: stats.total },
                  { key: 'MENUNGGU_PEMBAYARAN' as OrderStatus, label: 'Pesanan Masuk', count: stats.pendingCount },
                  { key: 'DIPROSES' as OrderStatus, label: 'Disiapkan Gudang', count: stats.diprosesCount },
                  { key: 'SIAP_DIAMBIL' as OrderStatus, label: 'Bayar di Kasir', count: stats.siapDiambilCount },
                  { key: 'SELESAI' as OrderStatus, label: 'Selesai', count: stats.selesaiCount },
                  { key: 'DIBATALKAN' as OrderStatus, label: 'Dibatalkan', count: stats.dibatalkanCount },
                ].map((tab) => {
                  const isActive = activeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveFilter(tab.key)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 lg:w-full lg:flex lg:items-center lg:justify-between lg:px-5 lg:py-3.5 rounded-full text-xs lg:text-sm font-semibold transition cursor-pointer shrink-0 whitespace-nowrap lg:whitespace-normal ${
                        isActive
                          ? 'bg-[#1a2610] text-white shadow-xs'
                          : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`min-w-[18px] h-[18px] lg:w-6 lg:h-6 rounded-full text-[10px] lg:text-xs font-bold flex items-center justify-center shrink-0 ml-1.5 lg:ml-3 tabular-nums ${
                          isActive
                            ? 'bg-white text-[#1a2610]'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Order Cards matching Gambar 1 */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-4 sm:space-y-5">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#526046]">
                  <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
                  <span className="text-xs font-semibold">Memuat riwayat transaksi dari sistem koperasi...</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white p-8 sm:p-14 rounded-3xl border border-neutral-200/90 text-center shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-[#f4f5f1] border border-neutral-200 text-[#233414] flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 stroke-1" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">Tidak ada pesanan yang sesuai</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    {searchQuery || activeFilter !== 'ALL'
                      ? 'Coba ganti filter status atau kata kunci pencarian Anda untuk melihat transaksi lainnya.'
                      : 'Anda belum memiliki transaksi pesanan komoditas di Koperasi Sinar Pagi Sejahtera.'}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-2.5">
                    {(searchQuery || activeFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveFilter('ALL');
                        }}
                        className="px-4 py-2 rounded-full bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#cfd6c9] text-[#1a2610] text-xs font-bold transition cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                    <Link
                      href="/toko"
                      className="px-6 py-2.5 rounded-full bg-[#1a2610] hover:bg-[#233414] text-white text-xs font-bold shadow-xs transition"
                    >
                      Mulai Belanja di Toko
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {filteredOrders.map((order) => {
                    const statusCfg = getStatusConfig(order.status);
                    const formattedDate = new Date(order.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs hover:shadow-xs transition duration-200 overflow-hidden"
                      >
                        <div className="p-4 sm:p-7 space-y-3.5 sm:space-y-4">
                          {/* Top Header Row: Order ID on left, Date & Status on right */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 block tracking-wide uppercase">
                                No. Pesanan
                              </span>
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1a2610]" />
                                <span className="text-sm sm:text-lg font-bold text-neutral-900 font-mono tracking-tight">
                                  #{order.orderNumber}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
                                Tanggal: {formattedDate}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${statusCfg.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusCfg.dotClass}`} />
                                <span>{statusCfg.label}</span>
                              </span>
                            </div>
                          </div>

                          {/* Origin -> Destination Tracker Row */}
                          <div className="flex items-center justify-between text-[11px] sm:text-xs text-neutral-700 bg-[#fafafa] p-2.5 sm:px-4 rounded-2xl border border-neutral-100 gap-2">
                            <div className="flex items-center gap-1.5 font-medium text-neutral-800 shrink min-w-0">
                              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#233414] shrink-0" />
                              <span className="truncate">Gudang Koperasi</span>
                            </div>

                            <div className="flex-1 flex items-center justify-center overflow-hidden text-neutral-300 font-mono text-[10px] select-none px-1">
                              <span className="truncate">••••••••••••••••••••••••</span>
                              <span className="ml-1 text-neutral-400">▸</span>
                            </div>

                            <div className="flex items-center gap-1.5 font-medium text-neutral-800 shrink min-w-0 text-right justify-end">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#233414] shrink-0" />
                              <span className="truncate max-w-[130px] sm:max-w-none">
                                {order.paymentMethod === 'CASH_KOPERASI' ? 'Kasir Koperasi (Ambil di Tempat)' : (order.shippingAddress || 'Alamat Penerima')}
                              </span>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="space-y-2 sm:space-y-2.5">
                            {order.items?.map((item: any, idx: number) => {
                              const itemImg = getPrimaryImage(item.product?.imageUrl, 'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80');
                              const unitPrice = Number(item.hargaPerSatuan || 0);

                              return (
                                <div
                                  key={item.id || idx}
                                  className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3.5 rounded-2xl bg-[#fafafa] border border-neutral-100"
                                >
                                  <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-neutral-200/80 shrink-0">
                                    <img
                                      src={itemImg}
                                      alt={item.namaProduk || item.product?.nama || 'Produk'}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-base font-bold text-neutral-900 leading-snug truncate">
                                      {item.namaProduk || item.product?.nama || 'Komoditas Pertanian'}
                                    </h4>
                                    <p className="text-xs sm:text-sm font-semibold text-neutral-800 mt-0.5 tabular-nums">
                                      Rp {unitPrice.toLocaleString('id-ID')} <span className="text-neutral-400 font-normal">x{item.quantity || 1}</span>
                                    </p>
                                    <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 truncate">
                                      {item.satuan || item.product?.satuan || 'kg'} • {item.product?.kategori || 'Komoditas'} {item.petani?.name ? `• Petani: ${item.petani.name}` : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Card Footer Row */}
                        <div className="px-4 py-3 sm:px-7 sm:py-4 bg-[#fbfcf9] border-t border-neutral-100 flex items-center justify-between gap-3">
                          <div className="text-xs sm:text-sm text-neutral-600">
                            <span>Total Tagihan: </span>
                            <span className="font-extrabold text-neutral-900 text-xs sm:text-base tabular-nums">
                              Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                            </span>
                            <span className="text-neutral-400 font-medium ml-1">
                              ({order.items?.length || 1} produk)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {order.status === 'MENUNGGU_PEMBAYARAN' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelTarget({
                                    type: 'order',
                                    id: order.id,
                                    orderNumber: order.orderNumber,
                                    title: order.items?.[0]?.namaProduk || 'Pesanan',
                                  });
                                }}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                              >
                                Batalkan
                              </button>
                            )}

                            {order.status === 'SELESAI' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReviewModal(order.items?.[0]);
                                }}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold text-[#233414] bg-[#e2f2c8] hover:bg-[#d4f63d] transition cursor-pointer border border-[#c9e39e]"
                              >
                                Beri Ulasan
                              </button>
                            )}

                            <Link
                              href={`/pesanan/${order.id}`}
                              className="px-4 py-2 sm:px-6 sm:py-2 rounded-full bg-[#1a2610] hover:bg-[#233414] text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>Lihat Detail</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: PENGAJUAN SEWA ALAT (2-Column Layout matching Gambar 1) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
            {/* Left Column: Filter Pills for Rental (Horizontal scrolling badges on mobile, sidebar on desktop) */}
            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
              <div className="flex lg:flex-col gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {[
                  { key: 'ALL', label: 'Semua Pengajuan', count: rentalStats.total },
                  { key: 'MENUNGGU_PERSETUJUAN_ADMIN', label: 'Menunggu Persetujuan', count: rentalStats.pendingCount },
                  { key: 'DISETUJUI', label: 'Disetujui', count: rentalStats.disetujuiCount },
                  { key: 'SIAP_DIAMBIL', label: 'Siap Diambil', count: rentalStats.siapCount },
                  { key: 'SEDANG_DISEWA', label: 'Sedang Disewa', count: rentalStats.aktifCount },
                  { key: 'SELESAI', label: 'Selesai', count: rentalStats.selesaiCount },
                  { key: 'DIBATALKAN', label: 'Dibatalkan', count: rentalStats.dibatalkanCount },
                  { key: 'DITOLAK', label: 'Ditolak', count: rentalStats.ditolakCount },
                ].map((tab) => {
                  const isActive = rentalActiveFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRentalActiveFilter(tab.key)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 lg:w-full lg:flex lg:items-center lg:justify-between lg:px-5 lg:py-3.5 rounded-full text-xs lg:text-sm font-semibold transition cursor-pointer shrink-0 whitespace-nowrap lg:whitespace-normal ${
                        isActive
                          ? 'bg-[#1a2610] text-white shadow-xs'
                          : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200/90 hover:border-neutral-300'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`min-w-[18px] h-[18px] lg:w-6 lg:h-6 rounded-full text-[10px] lg:text-xs font-bold flex items-center justify-center shrink-0 ml-1.5 lg:ml-3 tabular-nums ${
                          isActive
                            ? 'bg-white text-[#1a2610]'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Rental Cards */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-4 sm:space-y-5">
              {isRentalLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#526046]">
                  <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
                  <span className="text-xs font-semibold">Memuat riwayat pengajuan sewa alat pertanian...</span>
                </div>
              ) : filteredRentals.length === 0 ? (
                <div className="bg-white p-8 sm:p-14 rounded-3xl border border-neutral-200/90 text-center shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-[#f4f5f1] border border-neutral-200 text-[#233414] flex items-center justify-center mx-auto mb-3">
                    <Tractor className="w-8 h-8 stroke-1 text-[#233414]" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">Belum ada pengajuan sewa alat</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    {rentalSearchQuery || rentalActiveFilter !== 'ALL'
                      ? 'Tidak ditemukan pengajuan sewa alat dengan filter yang dipilih.'
                      : 'Anda belum mengajukan sewa alat mesin pertanian di Koperasi Sinar Pagi Sejahtera.'}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-2.5">
                    {(rentalSearchQuery || rentalActiveFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setRentalSearchQuery('');
                          setRentalActiveFilter('ALL');
                        }}
                        className="px-4 py-2 rounded-full bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#cfd6c9] text-[#1a2610] text-xs font-bold transition cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                    <Link
                      href="/sewa-alat"
                      className="px-6 py-2.5 rounded-full bg-[#1a2610] hover:bg-[#233414] text-white text-xs font-bold shadow-xs transition"
                    >
                      Buka Katalog Sewa Alat
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {filteredRentals.map((rental) => {
                    const statusCfg = getRentalStatusConfig(rental.status);
                    const formattedDate = new Date(rental.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={rental.id}
                        className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs hover:shadow-xs transition duration-200 overflow-hidden"
                      >
                        <div className="p-4 sm:p-7 space-y-3.5 sm:space-y-4">
                          {/* Top Header Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 block tracking-wide uppercase">
                                No. Pengajuan Sewa
                              </span>
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                <Tractor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1a2610]" />
                                <span className="text-sm sm:text-lg font-bold text-neutral-900 font-mono tracking-tight">
                                  #{rental.rentalCode || rental.rentalNumber || rental.id}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
                                Tanggal: {formattedDate}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${statusCfg.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusCfg.dotClass}`} />
                                <span>{statusCfg.label}</span>
                              </span>
                            </div>
                          </div>

                          {/* Origin -> Destination Tracker Row */}
                          <div className="flex items-center justify-between text-[11px] sm:text-xs text-neutral-700 bg-[#fafafa] p-2.5 sm:px-4 rounded-2xl border border-neutral-100 gap-2">
                            <div className="flex items-center gap-1.5 font-medium text-neutral-800 shrink min-w-0">
                              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#233414]" />
                              <span className="truncate">Gudang Alsintan</span>
                            </div>

                            <div className="flex-1 flex items-center justify-center overflow-hidden text-neutral-300 font-mono text-[10px] select-none px-1">
                              <span className="truncate">••••••••••••••••••••••••</span>
                              <span className="ml-1 text-neutral-400">▸</span>
                            </div>

                            <div className="flex items-center gap-1.5 font-medium text-neutral-800 shrink min-w-0 text-right justify-end">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#233414]" />
                              <span className="truncate max-w-[130px] sm:max-w-none">
                                {rental.lokasiLahan || rental.farmLocationAddress || rental.location || 'Lokasi Lahan Anggota'}
                              </span>
                            </div>
                          </div>

                          {/* Banner Khusus Status Pembayaran Kasir */}
                          {rental.status === 'DISETUJUI' && (
                            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                              <div className="flex items-start sm:items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Banknote className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="font-bold text-blue-950 block">
                                    Pengajuan Disetujui • Menunggu Pembayaran di Kasir Koperasi
                                  </span>
                                  <span className="text-blue-800 text-[11px] block leading-relaxed">
                                    {rental.paymentDeadline ? (
                                      <>
                                        Harap selesaikan pembayaran tunai sebelum:{' '}
                                        <strong className="text-blue-950">
                                          {new Date(rental.paymentDeadline).toLocaleString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}{' '}
                                          WITA
                                        </strong>{' '}
                                        agar slot unit resmi terkunci.
                                      </>
                                    ) : (
                                      'Harap selesaikan pembayaran tunai di kasir kantor koperasi Kolongan hari ini sebelum 16:30 WITA.'
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[11px] font-bold text-blue-900 bg-white/90 border border-blue-200 px-3 py-1.5 rounded-xl self-start sm:self-auto shrink-0 shadow-2xs">
                                📍 Kasir Kantor Koperasi (Kolongan)
                              </div>
                            </div>
                          )}

                          {rental.status === 'KADALUARSA' && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="text-[11px] leading-relaxed">
                                Pengajuan sewa ini <strong>kadaluarsa</strong> karena melewati batas waktu pembayaran tunai di kasir tanpa pelunasan. Unit mesin telah dibuka kembali untuk anggota lain.
                              </span>
                            </div>
                          )}

                          {/* Rental Items List */}
                          <div className="space-y-2 sm:space-y-2.5">
                            {rental.items?.map((item: any, idx: number) => {
                              const itemImg = getPrimaryImage(item.imageUrl, 'https://picsum.photos/seed/sewa-alat-koperasi/300/300');
                              const name = item.nama || item.equipmentName || 'Alat Pertanian';
                              const qty = item.jumlahUnit || item.quantity || 1;
                              const durasi = item.durasi || item.rentalDays || rental.durationDays || rental.durasi || 1;
                              const satuan = item.satuanSewa || 'hari';
                              const harga = Number(item.hargaSewa || 0);

                              return (
                                <div
                                  key={item.id || idx}
                                  className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3.5 rounded-2xl bg-[#fafafa] border border-neutral-100"
                                >
                                  <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-neutral-200/80 shrink-0">
                                    <img
                                      src={itemImg}
                                      alt={name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs sm:text-base font-bold text-neutral-900 leading-snug truncate">
                                      {name}
                                    </h4>
                                    <p className="text-xs sm:text-sm font-semibold text-neutral-800 mt-0.5 tabular-nums">
                                      Rp {harga.toLocaleString('id-ID')}/{satuan} <span className="text-neutral-400 font-normal">x{qty} unit</span>
                                    </p>
                                    <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 truncate">
                                      Durasi: {durasi} {satuan} • Mulai: {rental.startDate} {item.includeOperator ? '• Termasuk Operator' : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Card Footer Row */}
                        <div className="px-4 py-3 sm:px-7 sm:py-4 bg-[#fbfcf9] border-t border-neutral-100 flex items-center justify-between gap-3">
                          <div className="text-xs sm:text-sm text-neutral-600">
                            <span>Total Biaya Sewa: </span>
                            <span className="font-extrabold text-neutral-900 text-xs sm:text-base tabular-nums">
                              Rp {Number(rental.totalEstimasi ?? rental.totalAmount ?? 0).toLocaleString('id-ID')}
                            </span>
                            <span className="text-neutral-400 font-medium ml-1">
                              ({rental.items?.length || 1} unit)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {rental.status === 'MENUNGGU_PERSETUJUAN_ADMIN' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelTarget({
                                    type: 'rental',
                                    id: rental.id,
                                    orderNumber: rental.rentalCode || rental.rentalNumber,
                                    title: rental.items?.[0]?.nama || 'Pengajuan Sewa',
                                  });
                                }}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                              >
                                Batalkan
                              </button>
                            )}

                            <Link
                              href={`/pesanan/${rental.id}?type=sewa`}
                              className="px-4 py-2 sm:px-6 sm:py-2 rounded-full bg-[#1a2610] hover:bg-[#233414] text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>Lihat Detail</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Dialog Beri Ulasan Komoditas (Khusus Pesanan Selesai) */}
      {reviewItem && (
        <div
          onClick={() => setReviewItem(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#dce1d6] space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-[#dce1d6] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1a2610]">Beri Penilaian & Ulasan</h3>
                <p className="text-xs text-[#526046]">Bagikan kepuasan Anda setelah pesanan selesai diterima</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="w-8 h-8 rounded-full hover:bg-[#f4f5f1] flex items-center justify-center text-[#5b6950] hover:text-[#1a2610] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Produk */}
            <div className="flex items-center gap-3 p-3 bg-[#f4f5f1] rounded-2xl border border-[#dce1d6]">
              {reviewItem.product?.imageUrl ? (
                <img
                  src={getPrimaryImage(reviewItem.product.imageUrl)}
                  alt={reviewItem.namaProduk}
                  className="w-12 h-12 rounded-xl object-cover border border-[#dce1d6]"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#e2f2c8] text-[#233414] flex items-center justify-center font-bold text-lg border border-[#c9e39e]">
                  🌾
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#1a2610] truncate">
                  {reviewItem.namaProduk || reviewItem.product?.nama}
                </h4>
                <div className="text-[11px] text-[#526046]">
                  {reviewItem.quantity} {reviewItem.satuan || reviewItem.product?.satuan} • Mitra Petani: {reviewItem.petani?.name || 'Petani Koperasi'}
                </div>
              </div>
            </div>

            {/* Form Review */}
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1a2610] mb-1.5">
                  Rating Bintang ({reviewRating} dari 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-[#EAEDE7] text-[#cfd6c9]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a2610] mb-1.5">
                  Ulasan & Catatan Kualitas
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ceritakan kesegaran panen, bobot timbangan, atau kepuasan terhadap hasil komoditas petani..."
                  className="w-full p-3 rounded-2xl border border-[#cfd6c9] text-xs text-[#1a2610] placeholder:text-[#5b6950] focus:outline-none focus:ring-2 focus:ring-[#233414]/20 focus:border-[#233414]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#cfd6c9] text-[#1a2610] font-semibold text-xs hover:bg-[#f4f5f1] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2.5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingReview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <span>Kirim Ulasan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Batalkan Pesanan / Pengajuan */}
      {cancelTarget && (
        <div
          onClick={() => !isCanceling && setCancelTarget(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-[#dce1d6] space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#dce1d6] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1a2610]">
                    {cancelTarget.type === 'order' ? 'Batalkan Pesanan Toko' : 'Batalkan Pengajuan Sewa'}
                  </h3>
                  <p className="text-[11px] text-[#526046]">
                    #{cancelTarget.orderNumber || cancelTarget.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setCancelTarget(null)}
                className="w-8 h-8 rounded-lg hover:bg-[#f4f5f1] flex items-center justify-center text-[#5b6950] hover:text-[#1a2610] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/80 text-xs text-red-900 leading-relaxed">
              {cancelTarget.type === 'order'
                ? 'Apakah Anda yakin ingin membatalkan pesanan ini? Alokasi komoditas akan dikembalikan ke gudang koperasi dan pesanan tidak dapat diaktifkan kembali.'
                : 'Apakah Anda yakin ingin membatalkan pengajuan sewa alat ini? Jadwal pemesanan unit alat akan dibatalkan.'}
            </div>

            <div>
              <label className="text-xs font-bold text-[#1a2610] block mb-1.5">
                Alasan Pembatalan (Opsional):
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Misal: Ingin mengubah jumlah / salah pilih komoditas..."
                className="w-full text-xs p-3 rounded-lg border border-[#cfd6c9] text-[#1a2610] placeholder:text-[#5b6950] focus:outline-none focus:ring-1 focus:ring-red-500 bg-[#f4f5f1] focus:bg-white transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#dce1d6]">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 rounded-lg border border-[#cfd6c9] text-[#1a2610] hover:bg-[#f4f5f1] font-bold text-xs transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                {isCanceling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Ya, Batalkan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
