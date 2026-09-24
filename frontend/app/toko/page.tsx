'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  Filter,
  Sprout,
  ArrowRight,
  Loader2,
  RefreshCw,
  Warehouse,
  Coins,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ProductFormModal, ProductData } from '@/components/toko/product-form-modal';
import { ProductDeleteDialog } from '@/components/toko/product-delete-dialog';
import { ProductDetailModal } from '@/components/toko/product-detail-modal';

const KATEGORI_TABS = ['SEMUA', 'Kelapa', 'Jagung', 'Turunan', 'Olahan'];

export default function TokoOnlinePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Tab State: 'PRODUK_SAYA' | 'BELANJA_KOPERASI'
  const isPetani = user?.role === 'PETANI';
  const [activeTab, setActiveTab] = useState<'PRODUK_SAYA' | 'BELANJA_KOPERASI'>(
    isPetani ? 'PRODUK_SAYA' : 'BELANJA_KOPERASI'
  );

  // Filter & Search States
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductData | null>(null);

  // Product Detail & Add to Cart Modal State
  const [detailProduct, setDetailProduct] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Farmer Cooperative Stats (Stok Gudang & Pencairan Cash)
  const [petaniStats, setPetaniStats] = useState<{
    totalStokGudang: number;
    totalKuantitasTerjual: number;
    cashSiapDiambil: number;
    cashSudahDiterima: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchPetaniStats = useCallback(async () => {
    if (!isPetani) return;
    try {
      setIsLoadingStats(true);
      const res = await fetch('/api/petani/dashboard');
      const data = await res.json();
      if (res.ok) {
        setPetaniStats({
          totalStokGudang: data.totalStokGudang || 0,
          totalKuantitasTerjual: data.totalKuantitasTerjual || 0,
          cashSiapDiambil: data.cashSiapDiambil || 0,
          cashSudahDiterima: data.cashSudahDiterima || 0,
        });
      }
    } catch (err) {
      console.error('Error fetch petani stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isPetani]);

  useEffect(() => {
    if (isPetani && activeTab === 'PRODUK_SAYA') {
      fetchPetaniStats();
    }
  }, [isPetani, activeTab, fetchPetaniStats]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Protection Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login?callbackUrl=/toko');
      } else if (!user.isOnboarded) {
        router.replace('/onboarding');
      } else if (user.role === 'PETANI' && !user.isVerified) {
        router.replace('/verifikasi-petani');
      }
    }
  }, [user, authLoading, router]);

  // Sinkronkan tab awal sesuai role user
  useEffect(() => {
    if (user?.role === 'PETANI') {
      setActiveTab('PRODUK_SAYA');
    } else {
      setActiveTab('BELANJA_KOPERASI');
    }
  }, [user?.role]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      const params = new URLSearchParams();

      if (isPetani && activeTab === 'PRODUK_SAYA') {
        params.set('mine', 'true');
      }

      if (selectedKategori !== 'SEMUA') {
        params.set('kategori', selectedKategori);
      }

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.products) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetch products:', err);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isPetani, activeTab, selectedKategori, debouncedSearch]);

  useEffect(() => {
    if (user && user.isOnboarded) {
      fetchProducts();
    }
  }, [user, fetchProducts]);

  // Handlers
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    setFormMode('EDIT');
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (product: any) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = () => {
    showToast({
      title: formMode === 'CREATE' ? 'Komoditas Ditambahkan' : 'Komoditas Diperbarui',
      message:
        formMode === 'CREATE'
          ? 'Hasil panen baru Anda telah berhasil didaftarkan ke toko koperasi!'
          : 'Perubahan data komoditas berhasil disimpan.',
      type: 'success',
    });
    fetchProducts();
  };

  const handleDeleteSuccess = () => {
    showToast({
      title: 'Komoditas Dihapus',
      message: 'Produk telah berhasil dihapus dari daftar komoditas Anda.',
      type: 'info',
    });
    fetchProducts();
  };

  const handleAddToCart = (product: any, quantity: number) => {
    try {
      const saved = localStorage.getItem('koperasi_cart');
      const existingCart: any[] = saved ? JSON.parse(saved) : [];
      const itemIdx = existingCart.findIndex((i) => i.id === product.id);

      if (itemIdx > -1) {
        existingCart[itemIdx].quantity = (existingCart[itemIdx].quantity || 1) + quantity;
      } else {
        existingCart.push({
          id: product.id,
          nama: product.nama,
          kategori: product.kategori,
          hargaPerSatuan: Number(product.hargaPerSatuan),
          satuan: product.satuan,
          imageUrl: product.imageUrl,
          quantity,
          petaniName: product.petani?.name || 'Petani Binaan',
        });
      }

      localStorage.setItem('koperasi_cart', JSON.stringify(existingCart));
      window.dispatchEvent(new CustomEvent('cart-updated'));

      showToast({
        title: 'Dimasukkan ke Keranjang',
        message: `${quantity} ${product.satuan} "${product.nama}" berhasil ditambahkan ke keranjang belanja Anda.`,
        type: 'success',
      });
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  };

  if (authLoading || !user || !user.isOnboarded || (user.role === 'PETANI' && !user.isVerified)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App Header */}
      <AppHeader activePage="toko" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Header Title & Intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                {isPetani ? 'Portal Agribisnis Mitra Petani' : 'Toko Online Komoditas Tani'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Hasil Panen Saya di Gudang Koperasi'
                : 'Katalog Komoditas & Hasil Tani Koperasi'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Pantau stok komoditas yang Anda setorkan ke gudang koperasi serta saldo uang tunai (cash) yang siap diambil di kasir koperasi.'
                : 'Beli komoditas agribisnis segar langsung dari petani binaan Koperasi Sinar Pagi Sejahtera, Minahasa Utara.'}
            </p>
          </div>

          {/* Info Penyetoran Fisik ke Gudang (Khusus Petani di tab Produk Saya) */}
          {isPetani && activeTab === 'PRODUK_SAYA' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start md:self-auto shadow-2xs">
              <Warehouse className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Penyetoran Fisik di Gudang Koperasi</span>
            </div>
          )}
        </div>

        {/* Ringkasan Agribisnis & Bagi Hasil Cash Petani (Khusus Petani di Tab Produk Saya) */}
        {isPetani && activeTab === 'PRODUK_SAYA' && (
          <div className="mb-6 space-y-4">
            {/* Informational Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-emerald-700/50">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                    <span>Sistem Penyetoran & Bagi Hasil Koperasi Satu Pintu</span>
                    <span className="text-[10px] bg-emerald-700 text-emerald-100 px-2 py-0.2 rounded-full border border-emerald-500/30">
                      Gudang Fisik Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 mt-0.5 leading-relaxed">
                    Komoditas fisik Anda disetorkan dan disimpan di gudang koperasi. Pembeli bertransaksi melalui koperasi, dan uang hasil penjualan komoditas dapat Anda ambil secara tunai (cash) langsung di kantor koperasi.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Stok Fisik di Gudang Koperasi */}
              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Stok di Gudang
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Warehouse className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    petaniStats?.totalStokGudang.toLocaleString('id-ID') || 0
                  )}
                  <span className="text-xs font-semibold text-slate-400 ml-1">unit / kg</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Hasil panen fisik di gudang koperasi
                </div>
              </div>

              {/* Card 2: Total Komoditas Terjual */}
              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Komoditas Terjual
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    petaniStats?.totalKuantitasTerjual.toLocaleString('id-ID') || 0
                  )}
                  <span className="text-xs font-semibold text-slate-400 ml-1">terjual</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Telah laku dibeli pelanggan
                </div>
              </div>

              {/* Card 3: Uang Tunai Siap Diambil di Koperasi (HIGHLIGHT GREEN) */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-500/80 rounded-2xl shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-emerald-800 mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                    Cash Siap Diambil
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-900">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    `Rp ${(petaniStats?.cashSiapDiambil || 0).toLocaleString('id-ID')}`
                  )}
                </div>
                <div className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Ambil di kasir kantor koperasi</span>
                </div>
              </div>

              {/* Card 4: Riwayat Cash Sudah Diterima */}
              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Riwayat Cash Diterima
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {isLoadingStats ? (
                    <span className="text-slate-300 animate-pulse">...</span>
                  ) : (
                    `Rp ${(petaniStats?.cashSudahDiterima || 0).toLocaleString('id-ID')}`
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Total keuntungan yang sudah cair
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar: Toggle Button Pills (Khusus Petani) & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
          {/* 1. Toggle Button Pill: "Produk Saya" vs "Belanja Koperasi" */}
          {isPetani ? (
            <div className="inline-flex items-center gap-2 p-1 bg-slate-100/80 rounded-full border border-slate-200/80 w-fit">
              {/* Button 1: Panen Saya di Gudang */}
              <button
                onClick={() => setActiveTab('PRODUK_SAYA')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'PRODUK_SAYA'
                    ? 'bg-[#183d2e] text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Warehouse className="w-4 h-4" />
                <span>Panen Saya di Gudang</span>
              </button>

              {/* Button 2: Belanja Koperasi */}
              <button
                onClick={() => setActiveTab('BELANJA_KOPERASI')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'BELANJA_KOPERASI'
                    ? 'bg-[#183d2e] text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Belanja Koperasi</span>
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
              <span>Belanja Hasil Panen Koperasi</span>
            </div>
          )}

          {/* 2. Search & Kategori Toolbar */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kelapa, jagung, kopra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            <button
              onClick={fetchProducts}
              className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition cursor-pointer shadow-2xs"
              title="Segarkan Produk"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingProducts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Kategori Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Kategori:</span>
          </div>
          {KATEGORI_TABS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedKategori(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                selectedKategori === cat
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat === 'SEMUA' ? 'Semua Komoditas' : cat}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoadingProducts ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Memuat katalog komoditas...</span>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[360px] shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
              <Warehouse className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Belum Ada Komoditas di Gudang Koperasi'
                : 'Tidak Ada Komoditas Ditemukan'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-2">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Bawa fisik hasil panen Anda (kelapa, jagung, kopra, dll.) ke gudang koperasi. Petugas admin koperasi yang akan menimbang dan mendata komoditas Anda ke etalase online.'
                : 'Coba ubah kata kunci pencarian atau pilih filter kategori lainnya.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4.5">
            {products.map((prod) => (
              <div
                key={prod.id}
                onClick={() => {
                  setDetailProduct(prod);
                  setIsDetailModalOpen(true);
                }}
                className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Top Image Section with Badges */}
                  <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        prod.imageUrl ||
                        'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=500&q=80'
                      }
                      alt={prod.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Kategori Badge di Kiri Atas */}
                    <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 bg-white/95 backdrop-blur-xs text-slate-800 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 rounded sm:rounded-md shadow-2xs">
                      {prod.kategori}
                    </div>

                    {/* Status Aktif Dijual Badge di Kanan Atas */}
                    <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-white/95 backdrop-blur-xs text-emerald-700 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 rounded sm:rounded-md shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="hidden sm:inline">{prod.isTersedia ? 'Aktif Dijual' : 'Nonaktif'}</span>
                      <span className="sm:hidden">{prod.isTersedia ? 'Aktif' : 'Off'}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-2 sm:p-3.5">
                    {/* Judul Komoditas */}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-snug line-clamp-1 group-hover:text-emerald-800 transition-colors">
                      {prod.nama}
                    </h3>

                    {/* Sub-info Petani / Status */}
                    {activeTab === 'PRODUK_SAYA' ? (
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 font-semibold mt-0.5 mb-1 sm:mb-1.5 truncate">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">Produk aktif Anda</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 mt-0.5 mb-1 sm:mb-1.5 truncate">
                        <span>Oleh: </span>
                        <span className="font-semibold text-slate-800 truncate">
                          {prod.petani?.name || 'Petani Binaan'}
                        </span>
                      </div>
                    )}

                    {/* Deskripsi (Disembunyikan di mobile agar compact) */}
                    <p className="hidden sm:block text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {prod.deskripsi ||
                        'Komoditas agribisnis bermutu tinggi dari hasil panen petani binaan Minahasa Utara.'}
                    </p>

                    {/* Harga Satuan & Stok */}
                    <div className="flex items-baseline justify-between pt-1.5 sm:pt-2.5 border-t border-slate-100">
                      <div>
                        <span className="text-xs sm:text-base font-extrabold text-slate-900">
                          Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-slate-500 font-normal"> /{prod.satuan}</span>
                      </div>

                      <div className="text-[9px] sm:text-[11px] text-slate-500">
                        <span className="hidden sm:inline">Stok: </span>
                        <span className="font-semibold text-slate-800">
                          {Number(prod.stok).toLocaleString('id-ID')} {prod.satuan}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="px-2 pb-2 sm:px-3.5 sm:pb-3.5 pt-0">
                  {isPetani && activeTab === 'PRODUK_SAYA' ? (
                    <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[10px] text-slate-700 font-medium">
                      <span className="flex items-center gap-1.5 text-emerald-800 font-semibold truncate">
                        <Warehouse className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Gudang Koperasi</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[9px] shrink-0 border ${
                          prod.isTersedia
                            ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}
                      >
                        {prod.isTersedia ? 'Aktif Dijual' : 'Habis / Nonaktif'}
                      </span>
                    </div>
                  ) : (
                    /* Tombol Tambah ke Keranjang Belanja Koperasi (Klik membuka detail & counter qty) */
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailProduct(prod);
                        setIsDetailModalOpen(true);
                      }}
                      className="w-full py-1.5 sm:py-2 px-1.5 sm:px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-[10px] sm:text-[11px] font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="sm:hidden">+ Beli / Qty</span>
                      <span className="hidden sm:inline">+ Masuk Keranjang</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Formulir Tambah / Edit Produk */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        mode={formMode}
        initialData={selectedProduct}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Dialog Konfirmasi Hapus Produk */}
      <ProductDeleteDialog
        isOpen={isDeleteDialogOpen}
        product={productToDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleDeleteSuccess}
      />

      {/* Modal Detail & Beli Produk (Full Info + Counter Quantity) */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        product={detailProduct}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
