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

let cachedUserOrders: any[] | null = null;

export default function PesananPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>(() => cachedUserOrders || []);
  const [isLoading, setIsLoading] = useState(() => !cachedUserOrders);
  const [activeFilter, setActiveFilter] = useState<OrderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

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

  useEffect(() => {
    if (user) {
      fetchOrders(Boolean(cachedUserOrders));
    }
  }, [user, fetchOrders]);

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
Lokasi Ambil: ${order.alamatKirim || warehouseAddress}

Komoditas:
${itemsSummary}

Mohon info kesiapan fisik komoditas di gudang koperasi. Terima kasih.`;

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
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-6 space-y-2.5 sm:space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-400 font-medium">
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

        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
          <div>
            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              Daftar Pesanan & Monitoring Transaksi
            </h1>
            <p className="text-[10px] sm:text-sm text-slate-500 mt-0.5 max-w-2xl leading-snug line-clamp-1 sm:line-clamp-none">
              Pantau alur persiapan komoditas fisik Anda di gudang koperasi dan jadwal serah terima tunai secara transparan.
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => fetchOrders()}
              disabled={isLoading}
              className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-800 border border-slate-200 font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              type="button"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Segarkan Status</span>
            </button>
            <Link
              href="/toko"
              className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 transition shadow-xs"
            >
              <span>Belanja Lagi</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Filter KPI Cards (Tokopedia Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-4">
          {/* 1. Menunggu Pembayaran */}
          <button
            type="button"
            onClick={() => setActiveFilter('MENUNGGU_PEMBAYARAN')}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer shadow-2xs ${
              activeFilter === 'MENUNGGU_PEMBAYARAN'
                ? 'bg-amber-500/10 border-amber-400 ring-1 sm:ring-2 ring-amber-400/20'
                : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="text-[9px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider truncate">Menunggu Bayar Kasir</div>
            <div className="text-base sm:text-2xl font-black text-amber-800 mt-0.5 sm:mt-1 leading-tight">{stats.pendingCount}</div>
            <div className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:block sm:block">Bayar tunai di koperasi</div>
          </button>

          {/* 2. Sedang Diproses */}
          <button
            type="button"
            onClick={() => setActiveFilter('DIPROSES')}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer shadow-2xs ${
              activeFilter === 'DIPROSES'
                ? 'bg-blue-500/10 border-blue-400 ring-1 sm:ring-2 ring-blue-400/20'
                : 'bg-white border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="text-[9px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider truncate">Disiapkan di Gudang</div>
            <div className="text-base sm:text-2xl font-black text-blue-800 mt-0.5 sm:mt-1 leading-tight">{stats.diprosesCount}</div>
            <div className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:block sm:block">Pengecekan fisik komoditas</div>
          </button>

          {/* 3. Siap Diambil */}
          <button
            type="button"
            onClick={() => setActiveFilter('SIAP_DIAMBIL')}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer shadow-2xs relative ${
              activeFilter === 'SIAP_DIAMBIL'
                ? 'bg-emerald-500/10 border-emerald-400 ring-1 sm:ring-2 ring-emerald-400/20'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            {stats.siapDiambilCount > 0 && (
              <span className="absolute top-2 right-2 sm:top-3 sm:right-3 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <div className="text-[9px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider truncate">Siap Diambil</div>
            <div className="text-base sm:text-2xl font-black text-emerald-800 mt-0.5 sm:mt-1 leading-tight">{stats.siapDiambilCount}</div>
            <div className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:block sm:block">Komoditas siap serah terima</div>
          </button>

          {/* 4. Selesai */}
          <button
            type="button"
            onClick={() => setActiveFilter('SELESAI')}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer shadow-2xs ${
              activeFilter === 'SELESAI'
                ? 'bg-slate-100 border-slate-400 ring-1 sm:ring-2 ring-slate-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-[9px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">Pesanan Selesai</div>
            <div className="text-base sm:text-2xl font-black text-slate-800 mt-0.5 sm:mt-1 leading-tight">{stats.selesaiCount}</div>
            <div className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:block sm:block">Barang diterima & lunas</div>
          </button>
        </div>

        {/* Search & Filter Pills Bar (Tokopedia Style) */}
        <div className="bg-white p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-2 sm:space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor invoice (cth: KOP-2609), komoditas, atau petani..."
              className="w-full text-[11px] sm:text-xs pl-8 pr-8 py-1.5 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] sm:text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 no-scrollbar text-[10px] sm:text-xs font-semibold">
            {STATUS_FILTERS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-full whitespace-nowrap transition cursor-pointer shadow-2xs ${
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
          <div className="space-y-3 sm:space-y-4">
            {filteredOrders.map((order) => {
              const statusCfg = getStatusConfig(order.status);
              const stepIdx = statusCfg.step;
              const isExpanded = expandedOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs overflow-hidden hover:border-emerald-300 transition duration-200"
                >
                  {/* 1. Header Kartu Tokopedia: Toko, Tanggal, Status, Invoice */}
                  <div className="p-2.5 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                      <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-slate-800 text-[11px] sm:text-xs">
                        <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
                        <span>Koperasi Sinar Pagi Sejahtera</span>
                      </div>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <div className="text-slate-500 text-[10px] sm:text-[11px] flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
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
                      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold border ${statusCfg.badgeClass}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* 2. Visual Stepper Alur 4 Tahap Serah Terima Koperasi */}
                  {order.status !== 'DIBATALKAN' ? (
                    <div className="px-3 sm:px-5 pt-2.5 sm:pt-4 pb-1 sm:pb-2 bg-gradient-to-b from-slate-50/40 to-transparent">
                      <div className="max-w-3xl mx-auto py-1 sm:py-2">
                        <div className="grid grid-cols-4 gap-0.5 sm:gap-1 text-center relative">
                          {/* Background Bar */}
                          <div className="absolute top-3 sm:top-3.5 left-[12%] right-[12%] h-1 bg-slate-200 -z-0 rounded-full" />
                          {/* Active Bar */}
                          <div
                            className="absolute top-3 sm:top-3.5 left-[12%] h-1 bg-emerald-600 -z-0 rounded-full transition-all duration-500"
                            style={{
                              width:
                                stepIdx === 1
                                    ? '0%'
                                  : stepIdx === 2
                                  ? '38%'
                                  : stepIdx === 3
                                  ? '75%'
                                  : '76%',
                            }}
                          />

                          {/* Step 1 */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition ${
                                stepIdx >= 1
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {stepIdx > 1 ? '✓' : '1'}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 mt-0.5 sm:mt-1 leading-tight">
                              Pesanan Masuk
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">Kasir Koperasi</span>
                          </div>

                          {/* Step 2 */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition ${
                                stepIdx >= 2
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {stepIdx > 2 ? '✓' : '2'}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 mt-0.5 sm:mt-1 leading-tight">
                              Disiapkan Gudang
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">Pengecekan Fisik</span>
                          </div>

                          {/* Step 3 */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition ${
                                stepIdx >= 3
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {stepIdx > 3 ? '✓' : '3'}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 mt-0.5 sm:mt-1 leading-tight">
                              Siap Diambil
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">Ambil di Kantor</span>
                          </div>

                          {/* Step 4 */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition ${
                                stepIdx >= 4
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {stepIdx >= 4 ? '✓' : '4'}
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 mt-0.5 sm:mt-1 leading-tight">
                              Selesai
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">Lunas & Sah</span>
                          </div>
                        </div>

                        {/* Hint Box */}
                        <div className="mt-2 sm:mt-3 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-[10px] sm:text-[11px] text-emerald-900 flex items-center gap-1.5 sm:gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0" />
                          <span>{statusCfg.hint}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="m-2.5 sm:m-4 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-red-50 border border-red-200 text-red-700 text-[11px] sm:text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-red-600" />
                      <span>{statusCfg.hint}</span>
                    </div>
                  )}

                  {/* 3. Body: Produk & Ringkasan Total Tagihan */}
                  <div className="p-3 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6 border-t border-slate-100">
                    {/* Item List (Tokopedia Style) */}
                    <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-2.5 sm:gap-3.5">
                          {item.product?.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.nama}
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 text-lg sm:text-xl font-bold shadow-2xs">
                              🌾
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate">
                              {item.namaProduk || item.product?.nama || 'Komoditas Pertanian'}
                            </h4>
                            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                              {item.quantity} {item.satuan || item.product?.satuan || 'unit'} × Rp{' '}
                              {Number(item.hargaPerSatuan).toLocaleString('id-ID')}
                            </div>
                            {item.petani?.name && (
                              <div className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                                <span>🌾 Mitra:</span>
                                <strong className="truncate">{item.petani.name}</strong>
                              </div>
                            )}

                            {/* Tombol Beri Ulasan khusus pesanan SELESAI */}
                            {order.status === 'SELESAI' && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenReviewModal(item)}
                                  className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                  <span>Beri Ulasan</span>
                                </button>
                                <Link
                                  href={`/toko/${item.productId || item.product?.id}`}
                                  className="text-[10px] sm:text-[11px] text-emerald-700 hover:underline font-semibold"
                                >
                                  Lihat →
                                </Link>
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Subtotal</div>
                            <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                              Rp {Number(item.subtotal).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right Column: Total Belanja (Tokopedia Layout) */}
                    <div className="pt-2 sm:pt-0 border-t sm:border-t-0 md:border-l md:border-slate-200 md:pl-6 shrink-0 flex flex-col justify-center min-w-[180px]">
                      <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Total Pembayaran:</div>
                      <div className="text-base sm:text-xl font-black text-emerald-800 tracking-tight mt-0.5">
                        Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5">
                        Metode:{' '}
                        <span className="text-slate-800">
                          {order.paymentMethod === 'CASH_KOPERASI'
                            ? 'Bayar Tunai di Kasir Koperasi'
                            : 'Transfer Bank'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Accordion Lokasi Serah Terima & Alamat Domisili */}
                  <div className="px-3 sm:px-5 pb-2.5 sm:pb-3">
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>{isExpanded ? 'Sembunyikan Info Lokasi & Catatan' : 'Lihat Titik Ambil & Catatan'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs animate-in fade-in-50 duration-200">
                        {/* Lokasi Ambil */}
                        <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-0.5 sm:space-y-1">
                          <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">
                            Lokasi Serah Terima Barang:
                          </div>
                          <div className="text-slate-800 font-semibold text-[11px] sm:text-xs flex items-start gap-1.5">
                            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <span>{order.alamatKirim || warehouseAddress}</span>
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-slate-400">
                            Tunjukkan invoice ini ke kasir/petugas gudang saat serah terima barang.
                          </p>
                        </div>

                        {/* Alamat Domisili */}
                        <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-0.5 sm:space-y-1">
                          <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">
                            Alamat Rumah Pembeli (Domisili):
                          </div>
                          <div className="text-slate-800 font-semibold text-[11px] sm:text-xs flex items-start gap-1.5">
                            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700 shrink-0 mt-0.5" />
                            <span>{order.pembeli?.address || user?.address || 'Belum diisi di profil pengguna'}</span>
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-slate-400">
                            Alamat tinggal resmi untuk keperluan verifikasi pengurus koperasi.
                          </p>
                        </div>

                        {/* Catatan Pembeli */}
                        {order.catatan && (
                          <div className="col-span-1 sm:col-span-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] sm:text-xs">
                            <span className="font-bold">Catatan Pembeli:</span> {order.catatan}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Footer Actions (Tokopedia Style) */}
                  <div className="p-2.5 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
                    <div className="text-slate-500 text-[10px] sm:text-[11px]">
                      Ada pertanyaan seputar pesanan ini? Hubungi langsung staf/admin koperasi.
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-end">
                      {order.status === 'SELESAI' && order.items && order.items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(order.items[0])}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
                        >
                          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white text-white" />
                          <span>Beri Ulasan</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(order)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
                      >
                        <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-100" />
                        <span>Chat Admin</span>
                      </button>
                      <Link
                        href="/toko"
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] sm:text-xs transition"
                      >
                        Beli Lagi
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
