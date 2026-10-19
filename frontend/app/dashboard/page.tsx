'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  Warehouse,
  ShoppingBag,
  Coins,
  Check,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Clock,
  Search,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

interface PetaniStats {
  totalKomoditasDidaftarkan: number;
  totalStokGudang: number;
  totalKuantitasTerjual: number;
  cashSiapDiambil: number;
  cashSudahDiterima: number;
}

interface RecentSale {
  id: string;
  orderNumber: string;
  namaProduk: string;
  quantity: number;
  satuan: string;
  subtotal: number;
  payoutStatus: 'MENUNGGU_PENCAIRAN' | 'SUDAH_DICAIRKAN';
  payoutAt: string | null;
  orderDate: string;
}

export default function DashboardPetaniPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // State Stats & Sales
  const [stats, setStats] = useState<PetaniStats>({
    totalKomoditasDidaftarkan: 0,
    totalStokGudang: 0,
    totalKuantitasTerjual: 0,
    cashSiapDiambil: 0,
    cashSudahDiterima: 0,
  });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // State Products (Hanya dibaca dari gudang, diinput oleh Admin)
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchProductQuery, setSearchProductQuery] = useState('');

  // Active Section Tab (Komoditas Saya vs Riwayat Penjualan)
  const [activeSection, setActiveSection] = useState<'PANEN' | 'PENJUALAN'>('PANEN');

  // Auth Protection Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?callbackUrl=/dashboard');
      } else if (!user.isOnboarded) {
        router.replace('/onboarding');
      } else if (user.role === 'PETANI' && !user.isVerified) {
        try {
          const stored = localStorage.getItem('koperasi_auth_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (
              parsed?.email?.trim().toLowerCase() === user.email?.trim().toLowerCase() &&
              parsed.role === 'PETANI' &&
              parsed.isVerified
            ) {
              return;
            }
          }
        } catch {}

        fetch('/api/user/profile', { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data?.user) return;
            try {
              localStorage.setItem('koperasi_auth_user', JSON.stringify(data.user));
              window.dispatchEvent(new CustomEvent('user-updated'));
            } catch {}

            if (!data.user.isOnboarded) {
              router.replace('/onboarding');
              return;
            }
            if (data.user.role === 'PETANI' && !data.user.isVerified) {
              router.replace('/verifikasi-petani');
              return;
            }
            if (data.user.role !== 'PETANI' && data.user.role !== 'ADMIN') {
              router.replace('/profile');
            }
          })
          .catch(() => {});
      } else if (user.role !== 'PETANI' && user.role !== 'ADMIN') {
        router.replace('/profile');
      }
    }
  }, [user?.email, user?.role, user?.isVerified, user?.isOnboarded, Boolean(user), authLoading, router]);

  // Fetch Dashboard Stats & Recent Sales
  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await fetch('/api/petani/dashboard', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStats({
          totalKomoditasDidaftarkan: data.stats?.totalKomoditasDidaftarkan || 0,
          totalStokGudang: data.stats?.totalStokGudang || 0,
          totalKuantitasTerjual: data.stats?.totalKuantitasTerjual || 0,
          cashSiapDiambil: data.stats?.cashSiapDiambil || 0,
          cashSudahDiterima: data.stats?.cashSudahDiterima || 0,
        });
        if (Array.isArray(data.recentSales)) {
          setRecentSales(data.recentSales);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch My Products in Warehouse
  const fetchMyProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetch('/api/products?mine=true&limit=100', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.products)) {
        setMyProducts(data.products);
      } else {
        setMyProducts([]);
      }
    } catch (err) {
      console.error('Error fetching my products:', err);
      setMyProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id && user?.role === 'PETANI') {
      fetchDashboardStats();
      fetchMyProducts();
    }
  }, [user?.id, user?.role, fetchDashboardStats, fetchMyProducts]);

  const filteredProducts = myProducts.filter((p) => {
    if (!searchProductQuery.trim()) return true;
    const q = searchProductQuery.toLowerCase();
    return p.nama.toLowerCase().includes(q) || (p.kategori && p.kategori.toLowerCase().includes(q));
  });

  if (authLoading || !user || !user.isOnboarded || (user.role === 'PETANI' && !user.isVerified)) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#233414] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-[#1a2610] flex flex-col pb-20 lg:pb-12">
      {/* Header Utama Navigasi */}
      <AppHeader activePage="dashboard" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5">
        {/* 4 KPI Summary Cards (Clean, No Decorative Gradients or Tinted Icon Circles) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3.5 mb-4 sm:mb-6">
          {/* Card 1: Stok di Gudang */}
          <div className="p-3 sm:p-4 bg-white border border-[#dce1d6] rounded-xl sm:rounded-2xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#526046] mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-[#526046] truncate">
                Stok di Gudang
              </span>
              <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5b6950] shrink-0" />
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-[#1a2610] leading-tight tabular-nums">
                {isLoadingStats ? (
                  <span className="text-[#5b6950]/40 animate-pulse">...</span>
                ) : (
                  stats.totalStokGudang.toLocaleString('id-ID')
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-[#5b6950] ml-1">unit/kg</span>
              </div>
              <div className="text-[9px] sm:text-[11px] text-[#5b6950] mt-0.5 truncate">
                Hasil panen fisik di gudang
              </div>
            </div>
          </div>

          {/* Card 2: Komoditas Terjual */}
          <div className="p-3 sm:p-4 bg-white border border-[#dce1d6] rounded-xl sm:rounded-2xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#526046] mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-[#526046] truncate">
                Komoditas Terjual
              </span>
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5b6950] shrink-0" />
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-[#1a2610] leading-tight tabular-nums">
                {isLoadingStats ? (
                  <span className="text-[#5b6950]/40 animate-pulse">...</span>
                ) : (
                  stats.totalKuantitasTerjual.toLocaleString('id-ID')
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-[#5b6950] ml-1">terjual</span>
              </div>
              <div className="text-[9px] sm:text-[11px] text-[#5b6950] mt-0.5 truncate">
                Telah laku dibeli pelanggan
              </div>
            </div>
          </div>

          {/* Card 3: Cash Siap Diambil (Dark Forest Accent Card) */}
          <div className="p-3 sm:p-4 bg-[#233414] border border-[#1a2610] rounded-xl sm:rounded-2xl shadow-xs flex flex-col justify-between text-white">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#D4F63D] truncate">
                Cash Siap Diambil
              </span>
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4F63D] shrink-0" />
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-white leading-tight tabular-nums">
                {isLoadingStats ? (
                  <span className="text-white/40 animate-pulse">...</span>
                ) : (
                  `Rp ${stats.cashSiapDiambil.toLocaleString('id-ID')}`
                )}
              </div>
              <div className="text-[9px] sm:text-[11px] font-semibold text-[#e2f2c8] mt-0.5 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 text-[#D4F63D] shrink-0" />
                <span className="truncate">Ambil di kasir koperasi</span>
              </div>
            </div>
          </div>

          {/* Card 4: Riwayat Cash Diterima */}
          <div className="p-3 sm:p-4 bg-white border border-[#dce1d6] rounded-xl sm:rounded-2xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#526046] mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-[#526046] truncate">
                Riwayat Cash Diterima
              </span>
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5b6950] shrink-0" />
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-[#1a2610] leading-tight tabular-nums">
                {isLoadingStats ? (
                  <span className="text-[#5b6950]/40 animate-pulse">...</span>
                ) : (
                  `Rp ${stats.cashSudahDiterima.toLocaleString('id-ID')}`
                )}
              </div>
              <div className="text-[9px] sm:text-[11px] text-[#5b6950] mt-0.5 truncate">
                Total keuntungan cair
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs & Search: Hasil Panen vs Riwayat Penjualan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3.5 sm:mb-5 border-b border-[#dce1d6]">
          <div className="grid grid-cols-2 sm:inline-flex p-1 bg-[#EAEDE7] rounded-xl border border-[#cfd6c9] shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('PANEN')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                activeSection === 'PANEN'
                  ? 'bg-[#233414] text-white shadow-2xs'
                  : 'text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <Warehouse className={`w-3.5 h-3.5 ${activeSection === 'PANEN' ? 'text-[#D4F63D]' : 'text-[#526046]'}`} />
              <span><span className="hidden xs:inline sm:inline">Hasil </span>Panen</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black tabular-nums ${
                activeSection === 'PANEN'
                  ? 'bg-[#D4F63D] text-[#1a2610]'
                  : 'bg-white text-[#233414] border border-[#dce1d6]'
              }`}>
                {myProducts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('PENJUALAN')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                activeSection === 'PENJUALAN'
                  ? 'bg-[#233414] text-white shadow-2xs'
                  : 'text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <Receipt className={`w-3.5 h-3.5 ${activeSection === 'PENJUALAN' ? 'text-[#D4F63D]' : 'text-[#526046]'}`} />
              <span>Penjualan</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black tabular-nums ${
                activeSection === 'PENJUALAN'
                  ? 'bg-[#D4F63D] text-[#1a2610]'
                  : 'bg-white text-[#233414] border border-[#dce1d6]'
              }`}>
                {recentSales.length}
              </span>
            </button>
          </div>

          {activeSection === 'PANEN' && (
            <div className="relative w-full sm:w-64 md:w-72 shrink-0">
              <Search className="w-3.5 h-3.5 text-[#5b6950] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari panen saya..."
                value={searchProductQuery}
                onChange={(e) => setSearchProductQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-white border border-[#cfd6c9] rounded-lg sm:rounded-xl text-[#1a2610] placeholder:text-[#5b6950] focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] shadow-2xs transition"
              />
              {searchProductQuery && (
                <button
                  type="button"
                  onClick={() => setSearchProductQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5b6950] hover:text-[#1a2610] text-[10px] sm:text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Content 1: Komoditas / Panen Saya */}
        {activeSection === 'PANEN' && (
          <div>
            {isLoadingProducts ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-[#233414] animate-spin" />
                <span className="text-xs text-[#526046] font-semibold">Memuat daftar hasil panen Anda...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border border-[#dce1d6] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-[#f4f5f1] text-[#233414] flex items-center justify-center mb-3 border border-[#dce1d6]">
                  <Warehouse className="w-7 h-7 text-[#233414]" />
                </div>
                <h3 className="text-base font-bold text-[#1a2610]">
                  {searchProductQuery ? 'Komoditas Tidak Ditemukan' : 'Belum Ada Hasil Panen di Gudang Koperasi'}
                </h3>
                <p className="text-xs text-[#526046] max-w-sm mt-1 leading-relaxed">
                  {searchProductQuery
                    ? 'Tidak ada komoditas panen yang cocok dengan kata kunci pencarian Anda.'
                    : 'Bawa fisik hasil panen Anda ke kantor/gudang koperasi. Petugas admin koperasi yang akan menimbang dan menginput data komoditas ke etalase online.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white border border-[#dce1d6] hover:border-[#344d15] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Product Image - Strict 1:1 Aspect Ratio */}
                      <div
                        className="relative aspect-square w-full shrink-0 bg-[#f4f5f1] overflow-hidden"
                        style={{ aspectRatio: '1 / 1' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            prod.imageUrl ||
                            'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={prod.nama}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                          }}
                        />

                        {/* Status Tersedia di Kanan Atas */}
                        <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-xs text-[#1a2610] border border-[#dce1d6] text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 z-10">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.isTersedia ? 'bg-[#344d15] animate-pulse' : 'bg-[#5b6950]'
                            }`}
                          />
                          <span>{prod.isTersedia ? 'Aktif' : 'Off'}</span>
                        </div>


                      </div>

                      {/* Content */}
                      <div className="p-2.5 sm:p-3">
                        <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] line-clamp-1 group-hover:text-[#344d15] transition-colors">
                          {prod.nama}
                        </h4>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs sm:text-sm font-extrabold text-[#233414] tabular-nums">
                            Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-[#5b6950]">/{prod.satuan}</span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#526046] font-semibold bg-[#f4f5f1] px-2 py-1 rounded-md border border-[#dce1d6]">
                          <span>Sisa Stok:</span>
                          <span className="font-bold text-[#1a2610] tabular-nums">
                            {Number(prod.stok).toLocaleString('id-ID')} {prod.satuan}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Fisik Gudang */}
                    <div className="p-2.5 pt-0">
                      <div className="py-1 px-2 rounded-lg bg-[#f4f5f1] border border-[#dce1d6] flex items-center justify-between text-[10px]">
                        <span className="text-[#233414] font-semibold flex items-center gap-1">
                          <Warehouse className="w-3 h-3 text-[#344d15] shrink-0" />
                          <span>Fisik Gudang</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${prod.isTersedia ? 'bg-[#e2f2c8] text-[#233414] border border-[#c9e39e]' : 'bg-[#EAEDE7] text-[#5b6950]'}`}>
                          {prod.isTersedia ? 'Aktif Terdata' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Riwayat Penjualan & Pencairan Tunai */}
        {activeSection === 'PENJUALAN' && (
          <div className="bg-white border border-[#dce1d6] rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-3.5 sm:p-4 border-b border-[#dce1d6] flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1a2610]">Riwayat Penjualan Komoditas Panen</h3>
                <p className="text-[10px] sm:text-xs text-[#526046]">
                  Daftar komoditas Anda yang telah dibeli pelanggan dan status pencairan kasir.
                </p>
              </div>
            </div>

            {isLoadingStats ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-[#233414] animate-spin" />
                <span className="text-xs text-[#526046] font-semibold">Memuat riwayat penjualan...</span>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-[#f4f5f1] border border-[#dce1d6] text-[#233414] flex items-center justify-center mb-2.5">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1a2610]">Belum Ada Transaksi Penjualan</h4>
                <p className="text-[10px] sm:text-xs text-[#526046] max-w-sm mt-0.5 leading-relaxed">
                  Saat komoditas Anda laku dibeli pelanggan koperasi, data penjualan dan nominal cash yang bisa dicairkan akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f4f5f1] border-b border-[#dce1d6] text-[10px] font-bold uppercase tracking-wider text-[#526046]">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-4">No. Pesanan</th>
                      <th className="py-2.5 px-3 sm:px-4">Komoditas</th>
                      <th className="py-2.5 px-3 sm:px-4">Kuantitas</th>
                      <th className="py-2.5 px-3 sm:px-4">Bagi Hasil</th>
                      <th className="py-2.5 px-3 sm:px-4">Status Kasir</th>
                      <th className="py-2.5 px-3 sm:px-4">Tanggal Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dce1d6]/70">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-[#f4f5f1]/60 transition">
                        <td className="py-2.5 px-3 sm:px-4 font-mono font-bold text-[#1a2610]">
                          #{sale.orderNumber}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-semibold text-[#1a2610]">
                          {sale.namaProduk}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-[#526046] tabular-nums">
                          {sale.quantity} {sale.satuan}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-extrabold text-[#233414] tabular-nums">
                          Rp {sale.subtotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          {sale.payoutStatus === 'MENUNGGU_PENCAIRAN' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <Coins className="w-3 h-3 text-amber-700" />
                              <span>Siap Diambil di Kasir</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e2f2c8] text-[#233414] border border-[#c9e39e]">
                              <CheckCircle2 className="w-3 h-3 text-[#233414]" />
                              <span>Sudah Cair / Diterima</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-[11px] text-[#5b6950]">
                          {new Date(sale.orderDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
