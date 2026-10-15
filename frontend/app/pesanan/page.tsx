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
  RefreshCw,
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
  Receipt,
  Building2,
  Phone,
  Loader2,
  ExternalLink,
  Star,
  X,
  Tractor,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

type OrderStatus = 'ALL' | 'MENUNGGU_PEMBAYARAN' | 'DIPROSES' | 'SIAP_DIAMBIL' | 'SELESAI' | 'DIBATALKAN';

const STATUS_FILTERS: { key: OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'Semua Pesanan' },
  { key: 'MENUNGGU_PEMBAYARAN', label: 'Menunggu Bayar' },
  { key: 'DIPROSES', label: 'Sedang Diproses' },
  { key: 'SIAP_DIAMBIL', label: 'Siap Diambil' },
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
  { key: 'DITOLAK', label: 'Ditolak' },
];

let cachedUserOrders: any[] | null = null;

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
  const [rentalOrders, setRentalOrders] = useState<any[]>([]);
  const [isRentalLoading, setIsRentalLoading] = useState(false);

  // Fetch daftar pengajuan sewa alat pengguna
  const fetchRentalOrders = useCallback(async () => {
    try {
      setIsRentalLoading(true);
      const res = await fetch('/api/equipments/rent');
      const data = await res.json();
      if (res.ok && Array.isArray(data.rentals)) {
        setRentalOrders(data.rentals);
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
      fetchRentalOrders();
    }
  }, [user, fetchOrders, fetchRentalOrders]);

  // Statistik Ringkasan Pesanan (Tokopedia Quick Metrics)
  const stats = useMemo(() => {
    let pendingCount = 0;
    let diprosesCount = 0;
    let siapDiambilCount = 0;
    let selesaiCount = 0;

    for (const order of orders) {
      if (order.status === 'MENUNGGU_PEMBAYARAN') pendingCount++;
      if (order.status === 'DIPROSES') diprosesCount++;
      if (order.status === 'SIAP_DIAMBIL') siapDiambilCount++;
      if (order.status === 'SELESAI') selesaiCount++;
    }

    return {
      total: orders.length,
      pendingCount,
      diprosesCount,
      siapDiambilCount,
      selesaiCount,
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

    for (const r of rentalOrders) {
      if (r.status === 'MENUNGGU_PERSETUJUAN_ADMIN') pendingCount++;
      if (r.status === 'DISETUJUI') disetujuiCount++;
      if (r.status === 'SIAP_DIAMBIL') siapCount++;
      if (r.status === 'SEDANG_DISEWA') aktifCount++;
      if (r.status === 'SELESAI') selesaiCount++;
    }

    return {
      total: rentalOrders.length,
      pendingCount,
      disetujuiCount,
      siapCount,
      aktifCount,
      selesaiCount,
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

  // Konfigurasi Status Badge & Stepper
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return {
          label: 'Menunggu Pembayaran Kasir',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/30',
          step: 1,
          hint: 'Silakan kunjungi kantor koperasi untuk pembayaran tunai (cash) langsung saat serah terima barang.',
        };
      case 'DIPROSES':
        return {
          label: 'Sedang Disiapkan di Gudang',
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/30',
          step: 2,
          hint: 'Staf gudang koperasi sedang mengecek fisik dan mengemas komoditas pesanan Anda.',
        };
      case 'SIAP_DIAMBIL':
        return {
          label: 'Siap Diambil di Koperasi',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-500/30 font-bold',
          step: 3,
          hint: 'Komoditas telah siap! Silakan datang ke kantor & gudang koperasi untuk serah terima dan pembayaran kas.',
        };
      case 'SELESAI':
        return {
          label: 'Pesanan Selesai',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
          step: 4,
          hint: 'Komoditas telah diserahkan dan pembayaran tunai telah sah dicatat oleh kasir koperasi.',
        };
      case 'DIBATALKAN':
        return {
          label: 'Dibatalkan',
          badgeClass: 'bg-red-50 text-red-700 border-red-300',
          step: 0,
          hint: 'Pesanan telah dibatalkan dan alokasi stok komoditas telah dikembalikan ke gudang koperasi.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
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
          label: 'Menunggu Persetujuan Admin',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/30',
          hint: 'Pengajuan sewa alat Anda sedang ditinjau oleh staf / pengurus Koperasi Sinar Pagi Sejahtera.',
        };
      case 'DISETUJUI':
        return {
          label: 'Disetujui Admin Koperasi',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-500/30 font-bold',
          hint: 'Pengajuan sewa telah disetujui! Unit mesin sedang disiapkan dan dicek oleh tim operasional.',
        };
      case 'SIAP_DIAMBIL':
        return {
          label: 'Siap Diambil di Koperasi',
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-400 ring-1 ring-blue-500/30 font-bold',
          hint: 'Unit alat pertanian siap diambil di gudang/kantor koperasi. Tunjukkan nomor sewa ke pengurus.',
        };
      case 'SEDANG_DISEWA':
        return {
          label: 'Sedang Digunakan di Lahan',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-400 ring-1 ring-purple-500/30 font-bold',
          hint: 'Unit alat sedang aktif dalam masa sewa di lokasi lahan pertanian Anda.',
        };
      case 'SELESAI':
        return {
          label: 'Sewa Selesai & Unit Kembali',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
          hint: 'Masa sewa selesai dan fisik alat telah dikembalikan dalam kondisi baik ke koperasi.',
        };
      case 'DITOLAK':
        return {
          label: 'Pengajuan Ditolak',
          badgeClass: 'bg-red-50 text-red-700 border-red-300',
          hint: 'Pengajuan belum dapat disetujui karena jadwal tumpang tindih atau kuota unit penuh.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
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

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <AppHeader activePage="pesanan" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 shadow-sm">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Masuk untuk Melihat Daftar Pesanan</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            Silakan masuk dengan akun Google atau nomor telepon Anda untuk memantau status pesanan dan nota resmi koperasi.
          </p>
          <Link
            href="/login"
            className="mt-5 px-6 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition"
          >
            Masuk ke Akun
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <AppHeader activePage="pesanan" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-5 space-y-2.5 sm:space-y-4">
        {/* Breadcrumb - desktop only */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-400 font-medium">
          <Link href="/" className="hover:text-emerald-700 transition">
            Beranda
          </Link>
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <Link href="/toko" className="hover:text-emerald-700 transition">
            Toko Online
          </Link>
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="text-slate-700 font-bold">Daftar Pesanan Saya</span>
        </nav>

        {/* Page Title & Action Bar (Clean & Compact tanpa box border besar) */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Daftar Pesanan & Monitoring
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 hidden xs:block sm:block">
              Pantau alur persiapan komoditas dan jadwal serah terima koperasi.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                fetchOrders();
                fetchRentalOrders();
              }}
              disabled={isLoading || isRentalLoading}
              className="px-2 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-800 border border-slate-200 font-bold text-[10px] sm:text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
              title="Segarkan Status"
              type="button"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLoading || isRentalLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Segarkan Status</span>
            </button>
            <Link
              href={activeTypeTab === 'sewa-alat' ? '/sewa-alat' : '/toko'}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] sm:text-xs flex items-center gap-1 transition shadow-xs"
            >
              <span>{activeTypeTab === 'sewa-alat' ? 'Sewa Alat Lagi' : 'Belanja Lagi'}</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
          </div>
        </div>

        {/* Baris Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          {/* Tab Switcher: Toko Online vs Sewa Alat */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 p-1 bg-slate-200/50 sm:bg-transparent rounded-xl sm:rounded-none shrink-0">
            <button
              type="button"
              onClick={() => setActiveTypeTab('toko')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer shrink-0 ${
                activeTypeTab === 'toko'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-transparent sm:bg-white text-slate-600 sm:border sm:border-slate-200 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span><span className="hidden xs:inline sm:inline">Pesanan </span>Toko</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                activeTypeTab === 'toko' ? 'bg-white/20 text-white' : 'bg-slate-300/80 sm:bg-slate-100 text-slate-700'
              }`}>
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTypeTab('sewa-alat')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer shrink-0 ${
                activeTypeTab === 'sewa-alat'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-transparent sm:bg-white text-slate-600 sm:border sm:border-slate-200 hover:text-slate-900'
              }`}
            >
              <Tractor className="w-3.5 h-3.5" />
              <span>Sewa Alat</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                activeTypeTab === 'sewa-alat' ? 'bg-white/20 text-white' : 'bg-slate-300/80 sm:bg-slate-100 text-slate-700'
              }`}>
                {rentalOrders.length}
              </span>
            </button>
          </div>

          {/* Search Box di Kanan Sebelah Pengajuan Sewa Alat */}
          <div className="relative w-full sm:w-72 md:w-80 shrink-0">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  ? 'Cari no. invoice, komoditas...'
                  : 'Cari no. pengajuan, alat...'
              }
              className="w-full text-[11px] sm:text-xs pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs text-slate-800 transition"
            />
            {(activeTypeTab === 'toko' ? searchQuery : rentalSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  if (activeTypeTab === 'toko') setSearchQuery('');
                  else setRentalSearchQuery('');
                }}
                className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] sm:text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {activeTypeTab === 'toko' ? (
          <div className="space-y-2.5 sm:space-y-4">
            {/* Status Filter Tabs (Sesuai Gambar 3) */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 no-scrollbar text-[10px] sm:text-xs font-medium sm:font-semibold">
              {STATUS_FILTERS.map((tab) => {
                const isActive = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer shadow-2xs shrink-0 ${
                      isActive
                        ? 'bg-emerald-700 text-white font-bold shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Daftar Kartu Pesanan (Tokopedia Order Cards) */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="text-xs font-semibold">Memuat riwayat transaksi dari sistem koperasi...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-2xs">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-8 h-8 stroke-1" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Tidak ada pesanan yang sesuai</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  {searchQuery || activeFilter !== 'ALL'
                    ? 'Coba ganti filter status atau kata kunci pencarian Anda untuk melihat transaksi lainnya.'
                    : 'Anda belum memiliki transaksi pesanan komoditas di Koperasi Sinar Pagi Sejahtera.'}
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  {(searchQuery || activeFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveFilter('ALL');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                  <Link
                    href="/toko"
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition"
                  >
                    Mulai Belanja di Toko
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {filteredOrders.map((order) => {
                  const statusCfg = getStatusConfig(order.status);
                  const firstItem = order.items?.[0];
                  const extraItemsCount = (order.items?.length || 1) - 1;

                  return (
                    <div
                      key={order.id}
                      onClick={() => router.push(`/pesanan/${order.id}`)}
                      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden hover:border-emerald-400 hover:shadow-xs transition duration-200 cursor-pointer group"
                    >
                      {/* Header Kartu: Toko, Tanggal, Invoice, Status */}
                      <div className="p-2.5 sm:p-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] sm:text-xs">
                            <Store className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Koperasi Sinar Pagi Sejahtera</span>
                          </div>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <div className="text-slate-500 text-[10px] sm:text-[11px] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(order.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <span className="font-mono text-[10px] sm:text-[11px] text-slate-500 font-semibold">
                            #{order.orderNumber}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-extrabold border ${statusCfg.badgeClass}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Compact Summary Bar */}
                      <div className="p-2.5 sm:p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                          {/* Thumbnail */}
                          {firstItem?.product?.imageUrl ? (
                            <img
                              src={firstItem.product.imageUrl}
                              alt={firstItem.namaProduk || firstItem.product?.nama || 'Produk'}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs group-hover:scale-105 transition duration-200"
                            />
                          ) : (
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 text-base sm:text-lg font-bold shadow-2xs">
                              🌾
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition">
                                {firstItem?.namaProduk || firstItem?.product?.nama || 'Komoditas Pertanian'}
                              </h4>
                              {extraItemsCount > 0 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 shrink-0">
                                  +{extraItemsCount} lainnya
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>
                                {firstItem?.quantity || 1} {firstItem?.satuan || firstItem?.product?.satuan || 'unit'}
                              </span>
                              {firstItem?.petani?.name && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-emerald-700 font-semibold truncate">
                                    Mitra: {firstItem.petani.name}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Mobile inline total */}
                            <div className="sm:hidden text-xs font-black text-emerald-800 mt-1">
                              Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>

                        {/* Right: Total Belanja (Desktop/Tablet) + Tombol "Lihat" */}
                        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                          <div className="hidden sm:block text-right">
                            <span className="text-[10px] text-slate-400 font-medium block">Total Pembayaran</span>
                            <span className="text-sm font-black text-emerald-800 tracking-tight">
                              Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <Link
                            href={`/pesanan/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-xs shrink-0"
                          >
                            <span>Lihat</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: PENGAJUAN SEWA ALAT */
          <div className="space-y-2.5 sm:space-y-4">
            {/* Status Filter Tabs Sewa Alat (Sesuai Gambar 3) */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 no-scrollbar text-[10px] sm:text-xs font-medium sm:font-semibold">
              {RENTAL_STATUS_FILTERS.map((tab) => {
                const isActive = rentalActiveFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRentalActiveFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer shadow-2xs shrink-0 ${
                      isActive
                        ? 'bg-emerald-700 text-white font-bold shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* List Pengajuan Sewa Alat */}
            {isRentalLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="text-xs font-semibold">Memuat riwayat pengajuan sewa alat pertanian...</span>
              </div>
            ) : filteredRentals.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-2xs">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Tractor className="w-8 h-8 stroke-1 text-emerald-700" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Belum ada pengajuan sewa alat</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  {rentalSearchQuery || rentalActiveFilter !== 'ALL'
                    ? 'Tidak ditemukan pengajuan sewa alat dengan filter yang dipilih.'
                    : 'Anda belum mengajukan sewa alat mesin pertanian di Koperasi Sinar Pagi Sejahtera.'}
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  {(rentalSearchQuery || rentalActiveFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setRentalSearchQuery('');
                        setRentalActiveFilter('ALL');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                  <Link
                    href="/sewa-alat"
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition"
                  >
                    Buka Katalog Sewa Alat
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredRentals.map((rental) => {
                  const statusCfg = getRentalStatusConfig(rental.status);
                  const firstItem = rental.items?.[0] || {};
                  const extraItemsCount = (rental.items?.length || 1) - 1;
                  const firstItemName = firstItem.nama || firstItem.equipmentName || 'Alat Pertanian';
                  const firstItemQty = Number(firstItem.jumlahUnit || firstItem.quantity) || 1;
                  const firstItemDuration = Number(firstItem.durasi || firstItem.rentalDays || rental.durationDays || rental.durasi) || 1;
                  const firstItemUnit = firstItem.satuanSewa || 'hari';

                  return (
                    <div
                      key={rental.id}
                      onClick={() => router.push(`/pesanan/${rental.id}?type=sewa`)}
                      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden hover:border-emerald-400 hover:shadow-xs transition duration-200 cursor-pointer group"
                    >
                      {/* Header Kartu: Traktor, Tanggal, Kode Sewa, Status */}
                      <div className="p-2.5 sm:p-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] sm:text-xs">
                            <Tractor className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Koperasi Sinar Pagi Sejahtera</span>
                          </div>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <div className="text-slate-500 text-[10px] sm:text-[11px] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(rental.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <span className="font-mono text-[10px] sm:text-[11px] text-emerald-800 font-bold">
                            #{rental.rentalCode || rental.rentalNumber || rental.id}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-extrabold border ${statusCfg.badgeClass}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Compact Summary Bar */}
                      <div className="p-2.5 sm:p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                          {/* Thumbnail Alat */}
                          {firstItem.imageUrl ? (
                            <img
                              src={firstItem.imageUrl}
                              alt={firstItemName}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs group-hover:scale-105 transition duration-200"
                            />
                          ) : (
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 text-base sm:text-lg font-bold shadow-2xs">
                              🚜
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition">
                                {firstItemName}
                              </h4>
                              {extraItemsCount > 0 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 shrink-0">
                                  +{extraItemsCount} alat lainnya
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>
                                {firstItemQty} unit • {firstItemDuration} {firstItemUnit}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-700 font-semibold truncate">
                                Mulai: {rental.startDate}
                              </span>
                            </div>
                            {/* Mobile inline total */}
                            <div className="sm:hidden text-xs font-black text-emerald-800 mt-1">
                              Rp {Number(rental.totalEstimasi ?? rental.totalAmount ?? 0).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>

                        {/* Right: Total Biaya Sewa + Tombol "Lihat" */}
                        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                          <div className="hidden sm:block text-right">
                            <span className="text-[10px] text-slate-400 font-medium block">Total Biaya Sewa</span>
                            <span className="text-sm font-black text-emerald-800 tracking-tight">
                              Rp {Number(rental.totalEstimasi ?? rental.totalAmount ?? 0).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <Link
                            href={`/pesanan/${rental.id}?type=sewa`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-xs shrink-0"
                          >
                            <span>Lihat</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Beri Penilaian & Ulasan</h3>
                <p className="text-xs text-slate-500">Bagikan kepuasan Anda setelah pesanan selesai diterima</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Produk */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              {reviewItem.product?.imageUrl ? (
                <img
                  src={reviewItem.product.imageUrl}
                  alt={reviewItem.namaProduk}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  🌾
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {reviewItem.namaProduk || reviewItem.product?.nama}
                </h4>
                <div className="text-[11px] text-slate-500">
                  {reviewItem.quantity} {reviewItem.satuan || reviewItem.product?.satuan} • Mitra Petani: {reviewItem.petani?.name || 'Petani Koperasi'}
                </div>
              </div>
            </div>

            {/* Form Review */}
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
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
                            : 'fill-slate-200 text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Ulasan & Catatan Kualitas
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ceritakan kesegaran panen, bobot timbangan, atau kepuasan terhadap hasil komoditas petani..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
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
    </div>
  );
}
