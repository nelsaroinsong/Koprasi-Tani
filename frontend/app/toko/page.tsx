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
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ProductFormModal, ProductData } from '@/components/toko/product-form-modal';
import { ProductDeleteDialog } from '@/components/toko/product-delete-dialog';

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
                ? 'Kelola Komoditas & Hasil Tani Saya'
                : 'Katalog Komoditas & Hasil Tani Koperasi'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Kelola hasil panen kelapa, jagung, dan produk turunan yang Anda setorkan ke Koperasi Sinar Pagi Sejahtera.'
                : 'Beli komoditas agribisnis segar langsung dari petani binaan Koperasi Sinar Pagi Sejahtera, Minahasa Utara.'}
            </p>
          </div>

          {/* Tombol Tambah Komoditas (khusus Petani di tab Produk Saya) */}
          {isPetani && activeTab === 'PRODUK_SAYA' && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold shadow-xs hover:shadow transition cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Komoditas</span>
            </button>
          )}
        </div>

        {/* Action Bar: Toggle Button Pills (Khusus Petani) & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
          {/* 1. Toggle Button Pill: "Produk Saya" vs "Belanja Koperasi" */}
          {isPetani ? (
            <div className="inline-flex items-center gap-2 p-1 bg-slate-100/80 rounded-full border border-slate-200/80 w-fit">
              {/* Button 1: Produk Saya */}
              <button
                onClick={() => setActiveTab('PRODUK_SAYA')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'PRODUK_SAYA'
                    ? 'bg-[#183d2e] text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Produk Saya</span>
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
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Belum Ada Komoditas yang Anda Daftarkan'
                : 'Tidak Ada Komoditas Ditemukan'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
              {isPetani && activeTab === 'PRODUK_SAYA'
                ? 'Mulai jual hasil panen kelapa, jagung, atau produk turunan Anda langsung ke ekosistem koperasi.'
                : 'Coba ubah kata kunci pencarian atau pilih filter kategori lainnya.'}
            </p>
            {isPetani && activeTab === 'PRODUK_SAYA' && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Komoditas Pertama</span>
              </button>
            )}
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Image Section with Badges */}
                  <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        prod.imageUrl ||
                        'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={prod.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Kategori Badge di Kiri Atas */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-2xs">
                      {prod.kategori}
                    </div>

                    {/* Status Aktif Dijual Badge di Kanan Atas */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{prod.isTersedia ? 'Aktif Dijual' : 'Nonaktif'}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    {/* Judul Komoditas */}
                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-1">
                      {prod.nama}
                    </h3>

                    {/* Sub-info Petani / Status */}
                    {activeTab === 'PRODUK_SAYA' ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1 mb-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Produk aktif dijual oleh Anda</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 mb-2">
                        <span>Oleh: </span>
                        <span className="font-semibold text-slate-800">
                          {prod.petani?.name || 'Petani Binaan'}
                        </span>
                      </div>
                    )}

                    {/* Deskripsi */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {prod.deskripsi ||
                        'Komoditas agribisnis bermutu tinggi dari hasil panen petani binaan Minahasa Utara.'}
                    </p>

                    {/* Harga Satuan & Stok */}
                    <div className="flex items-baseline justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-base sm:text-lg font-extrabold text-slate-900">
                          Rp {Number(prod.hargaPerSatuan).toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-slate-500 font-normal"> /{prod.satuan}</span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Stok:{' '}
                        <span className="font-semibold text-slate-800">
                          {Number(prod.stok).toLocaleString('id-ID')} {prod.satuan}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="px-5 pb-5 pt-0">
                  {isPetani && activeTab === 'PRODUK_SAYA' ? (
                    <div className="flex items-center gap-2">
                      {/* Tombol Edit Produk Hijau Tua */}
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#183d2e] hover:bg-[#122e23] active:bg-[#0e241c] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Produk</span>
                      </button>

                      {/* Tombol Hapus Produk Merah */}
                      <button
                        onClick={() => handleOpenDelete(prod)}
                        className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 border border-red-100 flex items-center justify-center transition cursor-pointer shrink-0"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Tombol Tambah ke Keranjang Belanja Koperasi */
                    <button
                      onClick={() => {
                        showToast({
                          title: 'Dimasukkan ke Keranjang',
                          message: `${prod.nama} (1 ${prod.satuan}) berhasil ditambahkan ke keranjang belanja Anda.`,
                          type: 'success',
                        });
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>+ Masuk Keranjang</span>
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
    </div>
  );
}
