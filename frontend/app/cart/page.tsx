'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ShoppingBag,
  Tractor,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

import { getCart, saveCart, clearCart, type CartItem } from '@/lib/cart';
import {
  getRentalCart,
  updateRentalCartItem,
  removeRentalCartItem,
  clearRentalCart,
  calculateRentalCartTotal,
  calculateRentalItemTotal,
  type RentalCartItem,
} from '@/lib/rental-cart';

function CartContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab State: 'toko' atau 'sewa-alat'
  const initialTab = searchParams.get('tab') === 'sewa-alat' ? 'sewa-alat' : 'toko';
  const [activeTab, setActiveTab] = useState<'toko' | 'sewa-alat'>(initialTab);

  // Sync tab jika query param berubah
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'sewa-alat') {
      setActiveTab('sewa-alat');
    } else if (tabParam === 'toko') {
      setActiveTab('toko');
    }
  }, [searchParams]);

  // ==========================================
  // 1. STATE & HANDLERS: TOKO ONLINE
  // ==========================================
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoadedToko, setIsLoadedToko] = useState(false);

  // Sync Cart Toko Online from LocalStorage
  const syncCart = useCallback(() => {
    try {
      const items = getCart(user);
      setCartItems(items);
    } catch (e) {
      console.error('Error loading cart:', e);
      setCartItems([]);
    } finally {
      setIsLoadedToko(true);
    }
  }, [user]);

  useEffect(() => {
    syncCart();

    const handleCartUpdated = () => {
      syncCart();
    };

    window.addEventListener('cart-updated', handleCartUpdated);
    window.addEventListener('storage', handleCartUpdated);

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated);
      window.removeEventListener('storage', handleCartUpdated);
    };
  }, [syncCart]);

  // Update Item Quantity Toko Online
  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === id) {
          const nextQty = (item.quantity || 1) + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    setCartItems(updated);
    saveCart(updated, user);
  };

  // Remove Item Toko Online
  const handleRemoveItem = (id: string, nama: string) => {
    const updated = cartItems.filter((item) => item.id !== id);
    setCartItems(updated);
    saveCart(updated, user);

    showToast({
      title: 'Item Dihapus',
      message: `"${nama}" telah dikeluarkan dari keranjang belanja.`,
      type: 'info',
    });
  };

  // Clear Entire Cart Toko Online
  const handleClearCart = () => {
    setCartItems([]);
    clearCart(user);

    showToast({
      title: 'Keranjang Dikosongkan',
      message: 'Semua komoditas telah dibersihkan dari keranjang.',
      type: 'info',
    });
  };

  // Calculate Totals Toko Online
  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  }, [cartItems]);

  const subtotalAmount = useMemo(() => {
    return cartItems.reduce(
      (acc, curr) => acc + Number(curr.hargaPerSatuan || 0) * (curr.quantity || 1),
      0
    );
  }, [cartItems]);

  // Voucher / Promo State
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      showToast({
        title: 'Kode Voucher Kosong',
        message: 'Silakan masukkan kode voucher diskon Anda.',
        type: 'info',
      });
      return;
    }
    const code = voucherCode.trim().toUpperCase();
    if (code === 'PANENHEMAT' || code === 'KOPERASI' || code === 'DISKON10') {
      setAppliedVoucher(code);
      showToast({
        title: 'Voucher Berhasil Diterapkan!',
        message: 'Potongan diskon 10% telah diaplikasikan ke pesanan Anda.',
        type: 'success',
      });
    } else {
      showToast({
        title: 'Voucher Tidak Valid',
        message: 'Kode voucher tidak ditemukan atau sudah tidak berlaku.',
        type: 'error',
      });
    }
  };

  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    return Math.round(subtotalAmount * 0.1);
  }, [appliedVoucher, subtotalAmount]);

  const finalTotalAmount = useMemo(() => {
    return Math.max(0, subtotalAmount - discountAmount);
  }, [subtotalAmount, discountAmount]);

  // ==========================================
  // 2. STATE & HANDLERS: SEWA ALAT PERTANIAN
  // ==========================================
  const [rentalCartItems, setRentalCartItems] = useState<RentalCartItem[]>([]);
  const [isLoadedRental, setIsLoadedRental] = useState(false);

  // Sync Rental Cart from LocalStorage
  const syncRentalCart = useCallback(() => {
    try {
      const items = getRentalCart();
      setRentalCartItems(items);
    } catch (e) {
      console.error('Error loading rental cart:', e);
      setRentalCartItems([]);
    } finally {
      setIsLoadedRental(true);
    }
  }, []);

  useEffect(() => {
    syncRentalCart();

    const handleRentalCartUpdated = () => {
      syncRentalCart();
    };

    window.addEventListener('rental-cart-updated', handleRentalCartUpdated);
    window.addEventListener('storage', handleRentalCartUpdated);

    return () => {
      window.removeEventListener('rental-cart-updated', handleRentalCartUpdated);
      window.removeEventListener('storage', handleRentalCartUpdated);
    };
  }, [syncRentalCart]);

  // Update Quantity Unit Alat
  const handleUpdateRentalQty = (id: string, delta: number) => {
    const item = rentalCartItems.find((it) => it.id === id);
    if (!item) return;
    const nextQty = item.jumlahUnit + delta;
    if (nextQty <= 0) {
      removeRentalCartItem(id);
    } else {
      updateRentalCartItem(id, { jumlahUnit: Math.min(item.stokUnit || 99, nextQty) });
    }
  };

  // Update Durasi Alat
  const handleUpdateRentalDurasi = (id: string, delta: number) => {
    const item = rentalCartItems.find((it) => it.id === id);
    if (!item) return;
    const nextDurasi = Math.max(1, item.durasi + delta);
    updateRentalCartItem(id, { durasi: nextDurasi });
  };

  // Toggle Operator Alat
  const handleToggleRentalOperator = (id: string, checked: boolean) => {
    updateRentalCartItem(id, { includeOperator: checked });
  };

  // Remove Item Sewa Alat
  const handleRemoveRentalItem = (id: string, nama: string) => {
    removeRentalCartItem(id);
    showToast({
      title: 'Alat Dikeluarkan',
      message: `"${nama}" telah dihapus dari keranjang sewa.`,
      type: 'info',
    });
  };

  // Clear Entire Rental Cart
  const handleClearRentalCart = () => {
    clearRentalCart();
    showToast({
      title: 'Keranjang Sewa Dikosongkan',
      message: 'Semua unit alat telah dibersihkan dari keranjang sewa.',
      type: 'info',
    });
  };

  // Total Estimasi Biaya Sewa
  const totalRentalAmount = useMemo(() => {
    return calculateRentalCartTotal(rentalCartItems);
  }, [rentalCartItems]);

  const totalRentalUnits = useMemo(() => {
    return rentalCartItems.reduce((acc, curr) => acc + (curr.jumlahUnit || 1), 0);
  }, [rentalCartItems]);

  const isLoaded = activeTab === 'toko' ? isLoadedToko : isLoadedRental;

  return (
    <div className="min-h-screen bg-white sm:bg-[#f4f5f1] flex flex-col pb-32 sm:pb-20 font-sans">
      {/* Desktop App Header */}
      <div className="hidden sm:block">
        <AppHeader activePage="cart" />
      </div>

      {/* Mobile Top Bar (Fixed di top, solid white, anti-tembus) */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white px-4 h-14 flex items-center justify-between border-b border-[#EAEDE7] shadow-2xs">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-extrabold text-[#1a2610] tracking-tight">
          Keranjang Belanja
        </h1>

        {activeTab === 'toko' && cartItems.length > 0 ? (
          <button
            type="button"
            onClick={handleClearCart}
            className="w-10 h-10 -mr-1 rounded-full flex items-center justify-center text-[#5b6950] hover:text-[#c4242a] transition cursor-pointer"
            title="Kosongkan Keranjang"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : activeTab === 'sewa-alat' && rentalCartItems.length > 0 ? (
          <button
            type="button"
            onClick={handleClearRentalCart}
            className="w-10 h-10 -mr-1 rounded-full flex items-center justify-center text-[#5b6950] hover:text-[#c4242a] transition cursor-pointer"
            title="Kosongkan Sewa Alat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
      {/* Spacer placeholder mode mobile agar konten tidak tertutup fixed navbar */}
      <div className="sm:hidden h-14 shrink-0 pointer-events-none" aria-hidden="true" />

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 pt-3 sm:py-6 lg:py-8">
        {/* Top Segmented Control + Clear Button on Desktop */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-[#f4f5f1] sm:bg-[#EAEDE7] rounded-2xl w-full sm:w-fit border border-[#dce1d6]">
            <button
              type="button"
              onClick={() => setActiveTab('toko')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'toko'
                  ? 'bg-[#233414] text-white shadow-2xs'
                  : 'text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <ShoppingBag className={`w-3.5 h-3.5 ${activeTab === 'toko' ? 'text-[#D4F63D]' : ''}`} />
              <span>Toko Online</span>
              {cartItems.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black tabular-nums ${
                    activeTab === 'toko'
                      ? 'bg-[#D4F63D] text-[#1a2610]'
                      : 'bg-white text-[#1a2610] border border-[#cfd6c9]'
                  }`}
                >
                  {cartItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sewa-alat')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'sewa-alat'
                  ? 'bg-[#233414] text-white shadow-2xs'
                  : 'text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <Tractor className={`w-3.5 h-3.5 ${activeTab === 'sewa-alat' ? 'text-[#D4F63D]' : ''}`} />
              <span>Sewa Alat</span>
              {rentalCartItems.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black tabular-nums ${
                    activeTab === 'sewa-alat'
                      ? 'bg-[#D4F63D] text-[#1a2610]'
                      : 'bg-white text-[#1a2610] border border-[#cfd6c9]'
                  }`}
                >
                  {rentalCartItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Clear Button */}
          {activeTab === 'toko' && cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              className="hidden sm:flex text-xs font-semibold text-[#526046] hover:text-[#831c1e] bg-white transition items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-[#ffedea] border border-[#cfd6c9] hover:border-red-200 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
          {activeTab === 'sewa-alat' && rentalCartItems.length > 0 && (
            <button
              onClick={handleClearRentalCart}
              className="hidden sm:flex text-xs font-semibold text-[#526046] hover:text-[#831c1e] bg-white transition items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-[#ffedea] border border-[#cfd6c9] hover:border-red-200 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {/* Loading Spinner */}
        {!isLoaded ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-[#233414] animate-spin" />
            <span className="text-xs text-[#526046] font-medium">Memuat isi keranjang...</span>
          </div>
        ) : activeTab === 'toko' ? (
          /* ========================================================= */
          /* TAB 1: KONTEN KERANJANG TOKO ONLINE (GAMBAR 2 STYLE)      */
          /* ========================================================= */
          cartItems.length === 0 ? (
            <div className="bg-white sm:border sm:border-[#dce1d6] rounded-3xl p-8 sm:p-14 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-4">
              <div className="w-16 h-16 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] text-[#233414] flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 stroke-[1.75]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#1a2610]">
                Keranjang Belanja Kosong
              </h2>
              <p className="text-xs sm:text-sm text-[#526046] max-w-sm mt-1 mb-6 leading-relaxed">
                Belum ada komoditas hasil panen yang dimasukkan ke keranjang Anda.
              </p>
              <Link
                href="/toko"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs sm:text-sm transition"
              >
                <span>Mulai Belanja</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Table of Cart Items (Gambar 2 Style) */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-4 sm:p-6 lg:p-8 shadow-2xs">
                {/* Table Header Row (Gambar 2 Style: Product Code / Quantity / Total / Action) */}
                <div className="hidden sm:grid grid-cols-12 gap-4 pb-4 border-b border-[#EAEDE7] text-xs font-bold text-[#526046] uppercase tracking-wider">
                  <div className="col-span-6">Product Code</div>
                  <div className="col-span-3 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                <div className="divide-y divide-[#EAEDE7]">
                  {cartItems.map((item) => {
                    const itemTotal = Number(item.hargaPerSatuan || 0) * (item.quantity || 1);

                    return (
                      <div key={item.id} className="py-5 sm:py-6 first:pt-4 sm:first:pt-6 last:pb-2">
                        {/* Desktop Layout matching Gambar 2 */}
                        <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                          {/* Col 1: Product Code / Details (col-span-6) */}
                          <div className="col-span-6 flex items-center gap-4 min-w-0">
                            <Link
                              href={`/toko/${item.id}`}
                              className="w-16 h-16 lg:w-20 lg:h-20 shrink-0 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  item.imageUrl ||
                                  'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                                }
                                alt={item.nama}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                                }}
                              />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/toko/${item.id}`}
                                className="font-bold text-[#1a2610] hover:text-[#344d15] text-sm lg:text-base leading-snug line-clamp-1 transition"
                              >
                                {item.nama}
                              </Link>
                              <div className="text-xs text-[#5b6950] mt-1 truncate">
                                1 {item.satuan} • {item.kategori}
                              </div>
                              <div className="text-[11px] text-[#83917d] mt-0.5 tabular-nums">
                                Rp {Number(item.hargaPerSatuan || 0).toLocaleString('id-ID')} / {item.satuan}
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Quantity (Centered Pill Stepper, col-span-3) */}
                          <div className="col-span-3 flex justify-center">
                            <div className="inline-flex items-center justify-between h-9 rounded-full border border-[#cfd6c9] bg-white px-3 w-28 lg:w-32 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
                                title="Kurangi"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs lg:text-sm font-bold text-[#1a2610] tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
                                title="Tambah"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Col 3: Total (Right-aligned Bold Price, col-span-2) */}
                          <div className="col-span-2 text-right">
                            <span className="text-sm lg:text-base font-extrabold text-[#1a2610] tabular-nums">
                              Rp {itemTotal.toLocaleString('id-ID')}
                            </span>
                          </div>

                          {/* Col 4: Action (Trash Can Icon, col-span-1) */}
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id, item.nama)}
                              className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-[#5b6950] hover:text-[#c4242a] hover:bg-[#ffedea] transition cursor-pointer"
                              title="Hapus komoditas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="sm:hidden flex items-start gap-3.5">
                          <Link
                            href={`/toko/${item.id}`}
                            className="w-18 h-18 shrink-0 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7]"
                          >
                            <img
                              src={
                                item.imageUrl ||
                                'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                              }
                              alt={item.nama}
                              className="w-full h-full object-cover"
                            />
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/toko/${item.id}`}
                                className="font-bold text-[#1a2610] text-sm leading-snug line-clamp-1"
                              >
                                {item.nama}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id, item.nama)}
                                className="text-[#5b6950] hover:text-[#c4242a] p-1 -mr-1 -mt-1 cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="text-xs text-[#5b6950] mt-0.5">
                              1 {item.satuan} • {item.kategori}
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <span className="text-sm font-extrabold text-[#1a2610] tabular-nums">
                                Rp {itemTotal.toLocaleString('id-ID')}
                              </span>

                              <div className="inline-flex items-center justify-between h-8 rounded-full border border-[#cfd6c9] bg-white px-2.5 w-24 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.id, -1)}
                                  className="w-5 h-5 flex items-center justify-center text-[#526046]"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold text-[#1a2610] tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.id, 1)}
                                  className="w-5 h-5 flex items-center justify-center text-[#526046]"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Order Summary Card (Gambar 2 Exact Match) */}
              <div className="lg:col-span-4 lg:sticky lg:top-24">
                <div className="bg-white rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-6 lg:p-7 shadow-2xs space-y-5">
                  <h2 className="text-base sm:text-lg font-bold text-[#1a2610] tracking-tight">
                    Order Summary
                  </h2>

                  {/* Discount Voucher Input (Gambar 2 style) */}
                  <form onSubmit={handleApplyVoucher} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Discount voucher"
                      className="flex-1 h-11 px-4 text-xs sm:text-sm rounded-full border border-[#cfd6c9] bg-[#fbfcf9] text-[#1a2610] placeholder:text-[#83917d] focus:outline-none focus:border-[#233414] focus:ring-1 focus:ring-[#233414] transition"
                    />
                    <button
                      type="submit"
                      className="h-11 px-5 rounded-full border border-[#1a2610] bg-white hover:bg-[#1a2610] hover:text-white text-[#1a2610] text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </form>

                  {appliedVoucher && (
                    <div className="flex items-center justify-between text-xs bg-[#e2f2c8]/60 text-[#344d15] px-3.5 py-2 rounded-xl border border-[#c4e095]">
                      <span className="font-semibold">Voucher &quot;{appliedVoucher}&quot; Aktif</span>
                      <button
                        type="button"
                        onClick={() => setAppliedVoucher(null)}
                        className="font-bold hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div className="space-y-3 pt-2 text-xs sm:text-[13px] border-t border-[#EAEDE7]">
                    <div className="flex justify-between text-[#526046]">
                      <span>Sub Total</span>
                      <span className="font-semibold text-[#1a2610] tabular-nums">
                        Rp {subtotalAmount.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#526046]">
                      <span>Discount {appliedVoucher ? '(10%)' : ''}</span>
                      <span className={`font-semibold tabular-nums ${appliedVoucher ? 'text-[#344d15]' : 'text-[#83917d]'}`}>
                        {appliedVoucher ? `-Rp ${discountAmount.toLocaleString('id-ID')}` : '-'}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#526046]">
                      <span>Delivery fee</span>
                      <span className="font-semibold text-[#344d15]">
                        Rp 0 (Ambil di Kasir)
                      </span>
                    </div>

                    <div className="flex justify-between text-[#526046]">
                      <span>Total Kuantitas</span>
                      <span className="font-semibold text-[#1a2610] tabular-nums">
                        {totalItemsCount} Satuan
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-[#EAEDE7] pt-4 flex items-baseline justify-between">
                    <span className="text-sm sm:text-base font-bold text-[#1a2610]">Total</span>
                    <span className="text-xl sm:text-2xl font-black text-[#1a2610] tabular-nums">
                      Rp {finalTotalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Warranty / Guarantee note with check icon (Gambar 2 style) */}
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#f4f5f1] border border-[#EAEDE7] text-xs text-[#526046]">
                    <ShieldCheck className="w-4 h-4 text-[#344d15] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-[#1a2610] font-semibold">Jaminan Kualitas Komoditas</strong> langsung dipetik dari petani binaan resmi Koperasi Sinar Pagi Sejahtera.
                    </p>
                  </div>

                  {/* Checkout Now Pill Button (Gambar 2 style) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        router.push(`/login?callbackUrl=${encodeURIComponent('/checkout/toko')}`);
                        return;
                      }
                      router.push('/checkout/toko');
                    }}
                    className="w-full h-12 sm:h-14 bg-[#1a2610] hover:bg-[#233414] text-white rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.99]"
                  >
                    <span>Checkout Now</span>
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* ========================================================= */
          /* TAB 2: KONTEN KERANJANG SEWA ALAT (GAMBAR 2 STYLE)        */
          /* ========================================================= */
          rentalCartItems.length === 0 ? (
            <div className="bg-white sm:border sm:border-[#dce1d6] rounded-3xl p-8 sm:p-14 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-4">
              <div className="w-16 h-16 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] text-[#233414] flex items-center justify-center mb-4">
                <Tractor className="w-7 h-7 stroke-[1.75]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#1a2610]">
                Keranjang Sewa Alat Kosong
              </h2>
              <p className="text-xs sm:text-sm text-[#526046] max-w-sm mt-1 mb-6 leading-relaxed">
                Belum ada unit mesin atau alat pertanian yang dipilih untuk disewa.
              </p>
              <Link
                href="/sewa-alat"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs sm:text-sm transition"
              >
                <span>Pilih Alat Pertanian</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Table of Rental Equipment (Gambar 2 Style) */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-4 sm:p-6 lg:p-8 shadow-2xs">
                {/* Table Header Row */}
                <div className="hidden sm:grid grid-cols-12 gap-4 pb-4 border-b border-[#EAEDE7] text-xs font-bold text-[#526046] uppercase tracking-wider">
                  <div className="col-span-5">Product Code</div>
                  <div className="col-span-4 text-center">Quantity &amp; Durasi</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                <div className="divide-y divide-[#EAEDE7]">
                  {rentalCartItems.map((item) => {
                    const itemTotal = calculateRentalItemTotal(item);

                    return (
                      <div key={item.id} className="py-5 sm:py-6 first:pt-4 sm:first:pt-6 last:pb-2">
                        {/* Desktop Layout matching Gambar 2 */}
                        <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                          {/* Col 1: Equipment Details (col-span-5) */}
                          <div className="col-span-5 flex items-center gap-4 min-w-0">
                            <Link
                              href={`/sewa-alat/${item.equipmentId}`}
                              className="w-16 h-16 lg:w-20 lg:h-20 shrink-0 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  item.imageUrl ||
                                  'https://picsum.photos/seed/sewa-alat-koperasi/300/300'
                                }
                                alt={item.nama}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/sewa-alat/${item.equipmentId}`}
                                className="font-bold text-[#1a2610] hover:text-[#344d15] text-sm lg:text-base leading-snug line-clamp-1 transition"
                              >
                                {item.nama}
                              </Link>
                              <div className="text-xs text-[#5b6950] mt-1 truncate tabular-nums">
                                Rp {item.hargaSewa.toLocaleString('id-ID')}/{item.satuanSewa}
                              </div>

                              {item.biayaOperator ? (
                                <label className="inline-flex items-center gap-1.5 text-xs text-[#1a2610] font-medium cursor-pointer mt-1.5">
                                  <input
                                    type="checkbox"
                                    checked={item.includeOperator}
                                    onChange={(e) => handleToggleRentalOperator(item.id, e.target.checked)}
                                    className="w-3.5 h-3.5 rounded accent-[#233414] cursor-pointer"
                                  />
                                  <span>+ Operator (+Rp {item.biayaOperator.toLocaleString('id-ID')})</span>
                                </label>
                              ) : null}
                            </div>
                          </div>

                          {/* Col 2: Quantity & Durasi Stepper (col-span-4) */}
                          <div className="col-span-4 flex flex-col items-center gap-2">
                            {/* Unit Stepper */}
                            <div className="inline-flex items-center justify-between h-8 rounded-full border border-[#cfd6c9] bg-white px-2.5 w-28 lg:w-32 shadow-2xs">
                              <span className="text-[11px] text-[#5b6950] font-medium mr-1">Unit:</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateRentalQty(item.id, -1)}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
                                title="Kurangi unit"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-[#1a2610] tabular-nums">
                                {item.jumlahUnit}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateRentalQty(item.id, 1)}
                                disabled={item.jumlahUnit >= (item.stokUnit || 99)}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer disabled:opacity-40"
                                title="Tambah unit"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Durasi Stepper */}
                            <div className="inline-flex items-center justify-between h-8 rounded-full border border-[#cfd6c9] bg-[#f4f5f1] px-2.5 w-28 lg:w-32">
                              <span className="text-[11px] text-[#5b6950] font-medium mr-1">{item.satuanSewa}:</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateRentalDurasi(item.id, -1)}
                                disabled={item.durasi <= 1}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-white transition cursor-pointer disabled:opacity-40"
                                title="Kurangi durasi"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-extrabold text-[#1a2610] tabular-nums">
                                {item.durasi}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateRentalDurasi(item.id, 1)}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-white transition cursor-pointer"
                                title="Tambah durasi"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Col 3: Total (col-span-2, Right-aligned Bold) */}
                          <div className="col-span-2 text-right">
                            <span className="text-sm lg:text-base font-extrabold text-[#1a2610] tabular-nums">
                              Rp {itemTotal.toLocaleString('id-ID')}
                            </span>
                          </div>

                          {/* Col 4: Action (col-span-1, Trash Icon) */}
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveRentalItem(item.id, item.nama)}
                              className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-[#5b6950] hover:text-[#c4242a] hover:bg-[#ffedea] transition cursor-pointer"
                              title="Hapus alat"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="sm:hidden flex items-start gap-3.5">
                          <Link
                            href={`/sewa-alat/${item.equipmentId}`}
                            className="w-18 h-18 shrink-0 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7]"
                          >
                            <img
                              src={
                                item.imageUrl ||
                                'https://picsum.photos/seed/sewa-alat-koperasi/300/300'
                              }
                              alt={item.nama}
                              className="w-full h-full object-cover"
                            />
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/sewa-alat/${item.equipmentId}`}
                                className="font-bold text-[#1a2610] text-sm leading-snug line-clamp-1"
                              >
                                {item.nama}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleRemoveRentalItem(item.id, item.nama)}
                                className="text-[#5b6950] hover:text-[#c4242a] p-1 -mr-1 -mt-1 cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="text-xs text-[#5b6950] mt-0.5 tabular-nums">
                              {item.durasi} {item.satuanSewa} • Rp {item.hargaSewa.toLocaleString('id-ID')}/{item.satuanSewa}
                            </div>

                            {item.biayaOperator ? (
                              <label className="inline-flex items-center gap-1.5 text-xs text-[#1a2610] font-medium cursor-pointer mt-1">
                                <input
                                  type="checkbox"
                                  checked={item.includeOperator}
                                  onChange={(e) => handleToggleRentalOperator(item.id, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded accent-[#233414] cursor-pointer"
                                />
                                <span>+ Operator</span>
                              </label>
                            ) : null}

                            <div className="flex items-center justify-between mt-3">
                              <span className="text-sm font-extrabold text-[#1a2610] tabular-nums">
                                Rp {itemTotal.toLocaleString('id-ID')}
                              </span>

                              <div className="inline-flex items-center justify-between h-8 rounded-full border border-[#cfd6c9] bg-white px-2.5 w-24 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRentalQty(item.id, -1)}
                                  className="w-5 h-5 flex items-center justify-center text-[#526046]"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold text-[#1a2610] tabular-nums">
                                  {item.jumlahUnit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRentalQty(item.id, 1)}
                                  disabled={item.jumlahUnit >= (item.stokUnit || 99)}
                                  className="w-5 h-5 flex items-center justify-center text-[#526046] disabled:opacity-40"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column / Order Summary Sheet for Rental */}
              <div className="lg:col-span-4 lg:sticky lg:top-24">
                <div className="bg-white rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-6 lg:p-7 shadow-2xs space-y-5">
                  <h2 className="text-base sm:text-lg font-bold text-[#1a2610] tracking-tight">
                    Order Summary
                  </h2>

                  <div className="space-y-3 text-xs sm:text-[13px]">
                    <div className="flex justify-between text-[#526046]">
                      <span>Total Unit Mesin</span>
                      <span className="font-semibold text-[#1a2610] tabular-nums">
                        {totalRentalUnits} Unit ({rentalCartItems.length} Jenis)
                      </span>
                    </div>

                    <div className="flex justify-between text-[#526046]">
                      <span>Status Pengajuan</span>
                      <span className="font-semibold text-[#344d15]">
                        Verifikasi Admin Koperasi
                      </span>
                    </div>

                    <div className="flex justify-between text-[#526046]">
                      <span>Serah Terima Fisik</span>
                      <span className="font-semibold text-[#1a2610]">
                        Gudang Alsintan Koperasi
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[#EAEDE7] pt-4 flex items-baseline justify-between">
                    <span className="text-sm sm:text-base font-bold text-[#1a2610]">Total</span>
                    <span className="text-xl sm:text-2xl font-black text-[#1a2610] tabular-nums">
                      Rp {totalRentalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#f4f5f1] border border-[#EAEDE7] text-xs text-[#526046]">
                    <ShieldCheck className="w-4 h-4 text-[#344d15] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-[#1a2610] font-semibold">Alat Siap Operasional</strong> lolos uji mekanik dan garansi pendampingan operasional oleh dinas koperasi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        router.push(`/login?callbackUrl=${encodeURIComponent('/checkout/sewa-alat')}`);
                        return;
                      }
                      router.push('/checkout/sewa-alat');
                    }}
                    className="w-full h-12 sm:h-14 bg-[#1a2610] hover:bg-[#233414] text-white rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.99]"
                  >
                    <span>Checkout Now</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default function ShoppingCartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
