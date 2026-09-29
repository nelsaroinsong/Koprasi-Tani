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
            if (parsed.role === 'PETANI' && parsed.isVerified) {
              return;
            }
          }
        } catch {}

        fetch('/api/user/profile')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.user?.role === 'PETANI' && data.user.isVerified) {
              try {
                localStorage.setItem('koperasi_auth_user', JSON.stringify(data.user));
                window.dispatchEvent(new CustomEvent('user-updated'));
              } catch {}
              return;
            }
            router.replace('/verifikasi-petani');
          })
          .catch(() => {
            router.replace('/verifikasi-petani');
          });
      } else if (user.role !== 'PETANI' && user.role !== 'ADMIN') {
        router.replace('/profile');
      }
    }
  }, [user, authLoading, router]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 lg:pb-12">
      {/* Header Utama Navigasi */}
      <AppHeader activePage="dashboard" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6">
        {/* Top Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Dashboard Mitra Petani</span>
              <span className="text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {user.name}
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Pantau stok panen Anda di gudang koperasi, komoditas terjual, dan pencairan tunai di kasir.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                fetchDashboardStats();
                fetchMyProducts();
              }}
              className="p-2 sm:px-3 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
              title="Segarkan data dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats || isLoadingProducts ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards (Persis Gambar 1, Sangat Rapi & Responsif) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {/* Card 1: Stok di Gudang */}
          <div className="p-3 sm:p-4 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Stok di Gudang
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-slate-900 leading-tight">
                {isLoadingStats ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  stats.totalStokGudang.toLocaleString('id-ID')
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 ml-1">unit/kg</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">
                Hasil panen fisik di gudang
              </div>
            </div>
          </div>

          {/* Card 2: Komoditas Terjual */}
          <div className="p-3 sm:p-4 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Komoditas Terjual
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-slate-900 leading-tight">
                {isLoadingStats ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  stats.totalKuantitasTerjual.toLocaleString('id-ID')
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 ml-1">terjual</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">
                Telah laku dibeli pelanggan
              </div>
            </div>
          </div>

          {/* Card 3: Cash Siap Diambil (Highlighted Border Hijau Segar) */}
          <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-500/80 rounded-xl sm:rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 truncate">
                Cash Siap Diambil
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-emerald-900 leading-tight">
                {isLoadingStats ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  `Rp ${stats.cashSiapDiambil.toLocaleString('id-ID')}`
                )}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">Ambil di kasir koperasi</span>
              </div>
            </div>
          </div>

          {/* Card 4: Riwayat Cash Diterima */}
          <div className="p-3 sm:p-4 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Riwayat Cash Diterima
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-2xl font-black text-slate-900 leading-tight">
                {isLoadingStats ? (
                  <span className="text-slate-300 animate-pulse">...</span>
                ) : (
                  `Rp ${stats.cashSudahDiterima.toLocaleString('id-ID')}`
                )}
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">
                Total keuntungan cair
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs: Komoditas di Gudang vs Riwayat Penjualan */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveSection('PANEN')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSection === 'PANEN'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>Hasil Panen di Gudang ({myProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('PENJUALAN')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSection === 'PENJUALAN'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Riwayat Penjualan ({recentSales.length})</span>
            </button>
          </div>

          {activeSection === 'PANEN' && (
            <div className="relative max-w-xs hidden sm:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari panen saya..."
                value={searchProductQuery}
                onChange={(e) => setSearchProductQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs w-48"
              />
            </div>
          )}
        </div>

        {/* Tab Content 1: Komoditas / Panen Saya */}
        {activeSection === 'PANEN' && (
          <div>
            {isLoadingProducts ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-emerald-700 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Memuat daftar hasil panen Anda...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-100">
                  <Warehouse className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {searchProductQuery ? 'Komoditas Tidak Ditemukan' : 'Belum Ada Hasil Panen di Gudang Koperasi'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {searchProductQuery
                    ? 'Tidak ada komoditas panen yang cocok dengan kata kunci pencarian Anda.'
                    : 'Bawa fisik hasil panen Anda ke kantor/gudang koperasi. Petugas admin koperasi yang akan menimbang dan menginput data komoditas ke etalase online.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3.5">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Product Image - Strict 1:1 Aspect Ratio */}
                      <div
                        className="relative aspect-square w-full shrink-0 bg-slate-100 overflow-hidden"
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
                        <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-xs text-emerald-800 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 z-10">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.isTersedia ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span>{prod.isTersedia ? 'Aktif' : 'Off'}</span>
                        </div>

                        {/* Kategori Badge di Kiri Bawah */}
                        <div className="absolute bottom-1.5 left-1.5 bg-emerald-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs max-w-[80%] truncate z-10">
                          {prod.kategori}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-2 sm:p-2.5">
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                          {prod.nama}
                        </h4>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                            Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-400">/{prod.satuan}</span>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-semibold bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                          <span>Sisa Stok:</span>
                          <span className="font-bold text-slate-800">
                            {Number(prod.stok).toLocaleString('id-ID')} {prod.satuan}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Fisik Gudang */}
                    <div className="p-2 pt-0">
                      <div className="py-1 px-2 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-800 font-semibold flex items-center gap-1">
                          <Warehouse className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Fisik Gudang</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${prod.isTersedia ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
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
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">Riwayat Penjualan Komoditas Panen</h3>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  Daftar komoditas Anda yang telah dibeli pelanggan dan status pencairan kasir.
                </p>
              </div>
            </div>

            {isLoadingStats ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-emerald-700 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Memuat riwayat penjualan...</span>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-700">Belum Ada Transaksi Penjualan</h4>
                <p className="text-[10px] sm:text-xs text-slate-400 max-w-sm mt-0.5">
                  Saat komoditas Anda laku dibeli pelanggan koperasi, data penjualan dan nominal cash yang bisa dicairkan akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-4">No. Pesanan</th>
                      <th className="py-2.5 px-3 sm:px-4">Komoditas</th>
                      <th className="py-2.5 px-3 sm:px-4">Kuantitas</th>
                      <th className="py-2.5 px-3 sm:px-4">Bagi Hasil</th>
                      <th className="py-2.5 px-3 sm:px-4">Status Kasir</th>
                      <th className="py-2.5 px-3 sm:px-4">Tanggal Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 sm:px-4 font-mono font-bold text-slate-800">
                          #{sale.orderNumber}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-semibold text-slate-800">
                          {sale.namaProduk}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-600">
                          {sale.quantity} {sale.satuan}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-extrabold text-emerald-800">
                          Rp {sale.subtotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4">
                          {sale.payoutStatus === 'MENUNGGU_PENCAIRAN' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Coins className="w-3 h-3 text-amber-600" />
                              <span>Siap Diambil di Kasir</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Sudah Cair / Diterima</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-[11px] text-slate-400">
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
