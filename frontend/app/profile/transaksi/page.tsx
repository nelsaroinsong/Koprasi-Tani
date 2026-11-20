'use client';

import { ORDER_STATUS_LABEL, RENTAL_STATUS_LABEL, rentalSummary, saleStatus } from '@/lib/transaction-labels';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ChevronLeft,
  Search,
  X,
  Tractor,
  TrendingUp,
  ReceiptText,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

type TransactionCategory = 'ALL' | 'INCOME' | 'BELANJA' | 'SEWA';

interface TransactionItem {
  id: string;
  type: 'TOKO_BELANJA' | 'SEWA_ALAT' | 'PENCAIRAN_PANEN';
  title: string;
  subtitle: string;
  amount: number;
  isIncome: boolean;
  date: Date;
  dateLabel: string;
  timeLabel: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  refNumber: string;
  rawDetails?: any;
}

const CATEGORIES: { key: TransactionCategory; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'INCOME', label: 'Pemasukan' },
  { key: 'BELANJA', label: 'Belanja Toko' },
  { key: 'SEWA', label: 'Sewa Alat' },
];

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TransactionCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Raw data from endpoints
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [farmerSales, setFarmerSales] = useState<any[]>([]);

  // Selected transaction for detail modal
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  // Fetch all user transactions
  const fetchAllTransactions = useCallback(async () => {
    try {
      setIsLoading(true);

      const fetchOrdersPromise = fetch('/api/orders')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      const fetchRentalsPromise = fetch('/api/equipments/rent')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      const fetchPetaniPromise =
        user?.role === 'PETANI'
          ? fetch('/api/petani/dashboard')
              .then((res) => (res.ok ? res.json() : null))
              .catch(() => null)
          : Promise.resolve(null);

      const [ordersData, rentalsData, petaniData] = await Promise.all([
        fetchOrdersPromise,
        fetchRentalsPromise,
        fetchPetaniPromise,
      ]);

      if (ordersData?.orders && Array.isArray(ordersData.orders)) {
        setOrders(ordersData.orders);
      }
      if (rentalsData?.rentals && Array.isArray(rentalsData.rentals)) {
        setRentals(rentalsData.rentals);
      }
      if (petaniData?.recentSales && Array.isArray(petaniData.recentSales)) {
        setFarmerSales(petaniData.recentSales);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user) {
      fetchAllTransactions();
    }
  }, [user, fetchAllTransactions]);

  // Transform and normalize all records into unified TransactionItem list
  const allTransactions = useMemo<TransactionItem[]>(() => {
    const list: TransactionItem[] = [];

    // 1. Toko Online Orders (Pengeluaran / Rupiah Keluar)
    orders.forEach((o) => {
      const d = new Date(o.createdAt || Date.now());
      const firstItemName = o.items?.[0]?.namaProduk || o.items?.[0]?.product?.nama || 'Komoditas Tani';
      const itemCount = o.items?.length || 1;
      const subtitle =
        itemCount > 1
          ? `${firstItemName} +${itemCount - 1} produk • #${o.orderNumber}`
          : `${firstItemName} • #${o.orderNumber}`;

      const statusLabel = ORDER_STATUS_LABEL[o.status] || o.status;

      list.push({
        id: `order-${o.id}`,
        type: 'TOKO_BELANJA',
        title: 'Koperasi Sinar Pagi Sejahtera',
        subtitle,
        amount: Number(o.totalAmount || 0),
        isIncome: false,
        date: d,
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        timeLabel: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: o.status,
        statusLabel,
        paymentMethod: o.paymentMethod === 'CASH_KOPERASI' ? 'Tunai di Kasir Koperasi' : 'Transfer Bank',
        refNumber: `#${o.orderNumber}`,
        rawDetails: o,
      });
    });

    // 2. Equipment Rentals (Pengeluaran Sewa / Rupiah Keluar)
    rentals.forEach((r) => {
      const d = new Date(r.createdAt || Date.now());
      const rs = rentalSummary(r);
      const statusLabel = RENTAL_STATUS_LABEL[r.status] || r.status;

      list.push({
        id: `rental-${r.id}`,
        type: 'SEWA_ALAT',
        title: rs.name,
        subtitle: `Sewa ${rs.durationLabel} • ${rs.ref}`,
        amount: rs.total,
        isIncome: false,
        date: d,
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        timeLabel: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: r.status,
        statusLabel,
        paymentMethod: 'Tunai di Kasir Koperasi',
        refNumber: rs.ref,
        rawDetails: r,
      });
    });

    // 3. Farmer Sales / Payouts (Pemasukan / Rupiah Masuk)
    farmerSales.forEach((s) => {
      const d = new Date(s.orderDate || s.createdAt || Date.now());
      const sale = saleStatus(s);

      list.push({
        id: `sale-${s.id}`,
        type: 'PENCAIRAN_PANEN',
        title: `Hasil Panen: ${s.namaProduk}`,
        subtitle: `Terjual ${s.quantity} ${s.satuan || 'kg'} • #${s.orderNumber}`,
        amount: Number(s.subtotal || 0),
        isIncome: true,
        date: d,
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        timeLabel: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: s.payoutStatus,
        statusLabel: sale.label,
        paymentMethod: 'Pencairan Kasir Koperasi',
        refNumber: `#${s.orderNumber}`,
        rawDetails: s,
      });
    });

    // Sort descending by date (newest first)
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [orders, rentals, farmerSales]);

  // Totals for metrics summary cards
  const metrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    allTransactions.forEach((tx) => {
      if (tx.isIncome) {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });
    return {
      totalIncome,
      totalExpense,
      totalCount: allTransactions.length,
    };
  }, [allTransactions]);

  // Filter based on active Tab and search query
  const filteredTransactions = useMemo(() => {
    let result = allTransactions;

    // Filter by Tab: 'ALL' | 'INCOME' | 'BELANJA' | 'SEWA'
    if (activeTab === 'INCOME') {
      result = result.filter((tx) => tx.isIncome);
    } else if (activeTab === 'BELANJA') {
      result = result.filter((tx) => tx.type === 'TOKO_BELANJA' && !tx.isIncome);
    } else if (activeTab === 'SEWA') {
      result = result.filter((tx) => tx.type === 'SEWA_ALAT');
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.title.toLowerCase().includes(q) ||
          tx.subtitle.toLowerCase().includes(q) ||
          tx.refNumber.toLowerCase().includes(q) ||
          tx.statusLabel.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allTransactions, activeTab, searchQuery]);

  // Group transactions by date heading: Hari Ini, Kemarin, or Date in Indonesian
  const groupedTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: TransactionItem[] } = {};

    filteredTransactions.forEach((tx) => {
      const txDay = new Date(tx.date);
      txDay.setHours(0, 0, 0, 0);

      let groupKey = '';
      if (txDay.getTime() === today.getTime()) {
        groupKey = 'Hari Ini';
      } else if (txDay.getTime() === yesterday.getTime()) {
        groupKey = 'Kemarin';
      } else {
        groupKey = tx.date.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(tx);
    });

    return groups;
  }, [filteredTransactions]);

  const groupKeys = Object.keys(groupedTransactions);

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans pb-32 sm:pb-16">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Desktop & Tablet Breadcrumb Header */}
        <div className="hidden sm:flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-[#526046] font-medium">
            <Link href="/profile" className="hover:text-[#344d15] transition flex items-center gap-1 font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Profil Pengguna</span>
            </Link>
            <span className="text-[#cfd6c9]">/</span>
            <span className="font-bold text-[#1a2610]">Riwayat Transaksi</span>
          </div>

          <div className="text-xs font-semibold text-[#526046] tabular-nums">
            Total Transaksi: <strong className="text-[#1a2610]">{metrics.totalCount} Catatan</strong>
          </div>
        </div>

        {/* Card Utama: Responsif HP, Tablet, dan Desktop */}
        <div className="bg-white rounded-2xl border border-[#dce1d6] overflow-hidden flex flex-col w-full">
          {/* 1. Header (Mobile & Desktop) */}
          <div className="p-3.5 sm:p-5 pb-3 border-b border-[#EAEDE7] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#cfd6c9] text-[#1a2610] flex items-center justify-center transition cursor-pointer shrink-0"
              title="Kembali ke Profil"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h1 className="text-sm sm:text-lg font-black text-[#1a2610] tracking-tight text-center flex-1">
              Riwayat Transaksi
            </h1>

            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                isSearchOpen
                  ? 'bg-[#233414] text-[#D4F63D]'
                  : 'bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#cfd6c9] text-[#1a2610]'
              }`}
              title="Cari Transaksi"
            >
              {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {/* Inline Search Bar */}
          {isSearchOpen && (
            <div className="px-3.5 sm:px-5 py-2.5 bg-[#f4f5f1] border-b border-[#dce1d6] flex items-center gap-2 animate-in fade-in duration-150">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#5b6950] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari transaksi, order ID, nama komoditas..."
                  className="w-full pl-8 pr-8 py-2 text-xs sm:text-sm bg-white border border-[#cfd6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] font-medium text-[#1a2610] placeholder:text-[#5b6950]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5b6950] hover:text-[#1a2610]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. Filter Kategori */}
          <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-[#EAEDE7] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#233414] hover:bg-[#344d15] text-white'
                      : 'bg-[#EAEDE7] text-[#526046] hover:bg-[#dce1d6] hover:text-[#1a2610]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3. Daftar Transaksi Terkelompok Berdasarkan Tanggal */}
          <div className="p-3.5 sm:p-6 flex-1 min-h-[380px]">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#233414] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#526046]">Memuat riwayat transaksi...</p>
              </div>
            ) : groupKeys.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EAEDE7] border border-[#cfd6c9] text-[#526046] flex items-center justify-center mx-auto">
                  <ReceiptText className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-[#1a2610]">Belum Ada Transaksi</h3>
                <p className="text-xs text-[#5b6950] max-w-xs mx-auto">
                  {searchQuery
                    ? `Tidak ada transaksi yang cocok dengan kata kunci "${searchQuery}".`
                    : 'Riwayat transaksi pembelian toko dan sewa alat Anda akan tercatat di sini.'}
                </p>
                <div className="pt-2">
                  <Link
                    href="/toko"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-bold transition"
                  >
                    <span>Mulai Belanja</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#D4F63D]" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                {groupKeys.map((groupKey) => (
                  <div key={groupKey} className="space-y-2.5 sm:space-y-3">
                    {/* Header Tanggal */}
                    <div className="text-xs font-bold text-[#5b6950] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5b6950]" />
                      <span>{groupKey}</span>
                    </div>

                    {/* Baris Transaksi */}
                    <div className="space-y-1.5 sm:space-y-2">
                      {groupedTransactions[groupKey].map((tx) => {
                        const isIncome = tx.isIncome;

                        return (
                          <div
                            key={tx.id}
                            onClick={() => router.push(`/profile/transaksi/${encodeURIComponent(tx.id)}`)}
                            className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-transparent hover:border-[#dce1d6] hover:bg-[#f4f5f1]/80 flex items-center justify-between gap-3 transition cursor-pointer group"
                          >
                            {/* Kiri: Avatar Lingkaran */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                  tx.type === 'PENCAIRAN_PANEN'
                                    ? 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e]'
                                    : tx.type === 'SEWA_ALAT'
                                    ? 'bg-[#EAEDE7] text-[#233414] border-[#cfd6c9]'
                                    : 'bg-[#233414] text-[#D4F63D] border-[#344d15]'
                                }`}
                              >
                                {tx.type === 'PENCAIRAN_PANEN' ? (
                                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#233414]" />
                                ) : tx.type === 'SEWA_ALAT' ? (
                                  <Tractor className="w-4 h-4 sm:w-5 sm:h-5 text-[#233414]" />
                                ) : (
                                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4F63D]" />
                                )}
                              </div>

                              {/* Tengah: Judul & Subtitle */}
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] transition truncate sm:whitespace-normal">
                                  {tx.title}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-[#5b6950] truncate sm:whitespace-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span>{tx.subtitle}</span>
                                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-[#EAEDE7] border border-[#cfd6c9] text-[#233414] text-[9.5px] font-semibold">
                                    {tx.statusLabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Kanan: Rupiah Keluar / Masuk */}
                            <div className="text-right shrink-0">
                              <div
                                className={`text-xs sm:text-base font-black tracking-tight tabular-nums ${
                                  isIncome ? 'text-[#344d15]' : 'text-[#c4242a]'
                                }`}
                              >
                                {isIncome ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-[#5b6950] font-medium mt-0.5 tabular-nums">
                                {tx.dateLabel}, {tx.timeLabel}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Dialog Rincian Transaksi */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2610]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl border border-[#dce1d6] shadow-xl overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDE7]">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-[#233414]" />
                <h3 className="text-sm font-black text-[#1a2610]">Rincian Transaksi</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-7 h-7 rounded-full bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#cfd6c9] text-[#1a2610] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Total Nominal */}
            <div className="text-center py-3.5 bg-[#f4f5f1] rounded-2xl border border-[#dce1d6] space-y-1">
              <div className="text-[11px] font-semibold text-[#5b6950]">Total Nominal Transaksi</div>
              <div
                className={`text-2xl font-black tabular-nums ${
                  selectedTx.isIncome ? 'text-[#344d15]' : 'text-[#c4242a]'
                }`}
              >
                {selectedTx.isIncome ? '+' : '-'}Rp {selectedTx.amount.toLocaleString('id-ID')}
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#233414] border border-[#cfd6c9]">
                {selectedTx.statusLabel}
              </div>
            </div>

            {/* Rincian Data */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#EAEDE7]">
                <span className="text-[#5b6950]">Nomor Referensi</span>
                <span className="font-bold text-[#1a2610] tabular-nums">{selectedTx.refNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#EAEDE7]">
                <span className="text-[#5b6950]">Layanan</span>
                <span className="font-bold text-[#1a2610]">{selectedTx.title}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#EAEDE7]">
                <span className="text-[#5b6950]">Waktu Transaksi</span>
                <span className="font-semibold text-[#526046] tabular-nums">
                  {selectedTx.dateLabel} pukul {selectedTx.timeLabel} WITA
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#EAEDE7]">
                <span className="text-[#5b6950]">Metode Bayar</span>
                <span className="font-semibold text-[#526046]">{selectedTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-start py-1">
                <span className="text-[#5b6950]">Keterangan</span>
                <span className="font-medium text-[#526046] text-right max-w-[200px]">
                  {selectedTx.subtitle}
                </span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="pt-2 space-y-2">
              <Link
                href="/pesanan"
                className="w-full py-2.5 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>Buka di Halaman Pesanan</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#D4F63D]" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-full py-2 px-4 rounded-xl border border-[#cfd6c9] hover:bg-[#f4f5f1] text-[#1a2610] font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
