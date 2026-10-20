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

  const finalTotalAmount = useMemo(() => {
    return subtotalAmount;
  }, [subtotalAmount]);

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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:py-6">
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
          /* TAB 1: KONTEN KERANJANG TOKO ONLINE (GAMBAR 5 STYLE)      */
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Gambar 5 Style Flat Item List */}
              <div className="md:col-span-7 lg:col-span-8 bg-white sm:rounded-3xl sm:border sm:border-[#dce1d6] sm:p-5 divide-y divide-[#EAEDE7]">
                {cartItems.map((item) => {
                  const itemTotal = Number(item.hargaPerSatuan || 0) * (item.quantity || 1);

                  return (
                    <div
                      key={item.id}
                      className="py-4 first:pt-1 last:pb-1 flex items-stretch gap-3.5 sm:gap-4"
                    >
                      {/* Square Rounded Thumbnail on Left */}
                      <Link
                        href={`/toko/${item.id}`}
                        className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] relative aspect-square"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            item.imageUrl ||
                            'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={item.nama}
                          className="w-full h-full object-cover object-center"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      </Link>

                      {/* Center Column: Title, Unit/Category Subtitle, Price at Bottom */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <Link
                            href={`/toko/${item.id}`}
                            className="font-bold text-[#1a2610] hover:text-[#344d15] text-sm sm:text-base leading-snug line-clamp-1 transition"
                          >
                            {item.nama}
                          </Link>
                          <div className="text-xs text-[#5b6950] mt-0.5 truncate">
                            1 {item.satuan} • {item.kategori}
                          </div>
                        </div>

                        <div className="text-sm sm:text-base font-extrabold text-[#1a2610] tabular-nums">
                          Rp {itemTotal.toLocaleString('id-ID')}
                        </div>
                      </div>

                      {/* Right Column: Top-Right X Remove Button & Bottom-Right Pill Stepper (Gambar 5 Exact Match) */}
                      <div className="flex flex-col items-end justify-between py-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id, item.nama)}
                          className="text-[#5b6950] hover:text-[#1a2610] transition p-1 -mr-1 -mt-1 cursor-pointer"
                          title="Hapus komoditas"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="inline-flex items-center h-8 rounded-full border border-[#dce1d6] bg-white px-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
                            title="Kurangi"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[#1a2610] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
                            title="Tambah"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column / Bottom Summary Sheet (Gambar 5 Total + Dark Pill Button) */}
              <div className="md:col-span-5 lg:col-span-4 md:sticky md:top-20">
                <div className="bg-white sm:rounded-3xl sm:border sm:border-[#dce1d6] pt-4 sm:p-6 border-t border-[#EAEDE7] sm:border-t-[#dce1d6] space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[#526046]">
                      <span>Total Kuantitas</span>
                      <span className="font-semibold text-[#1a2610] tabular-nums">{totalItemsCount} Satuan</span>
                    </div>
                    <div className="flex justify-between text-[#526046]">
                      <span>Serah Terima & Bayar</span>
                      <span className="font-semibold text-[#344d15]">Tunai di Kasir Koperasi</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-[#EAEDE7]">
                    <span className="text-sm font-semibold text-[#526046]">Total:</span>
                    <span className="text-xl sm:text-2xl font-black text-[#1a2610] tabular-nums">
                      Rp {finalTotalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        router.push(`/login?callbackUrl=${encodeURIComponent('/checkout/toko')}`);
                        return;
                      }
                      router.push('/checkout/toko');
                    }}
                    className="w-full h-12 sm:h-13 px-6 bg-[#1a2610] hover:bg-[#233414] text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                  >
                    <span>Lanjut ke Checkout</span>
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* ========================================================= */
          /* TAB 2: KONTEN KERANJANG SEWA ALAT (GAMBAR 5 STYLE)        */
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Gambar 5 Style Flat Item List for Rental Equipment */}
              <div className="md:col-span-7 lg:col-span-8 bg-white sm:rounded-3xl sm:border sm:border-[#dce1d6] sm:p-5 divide-y divide-[#EAEDE7]">
                {rentalCartItems.map((item) => {
                  const itemTotal = calculateRentalItemTotal(item);

                  return (
                    <div key={item.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                      <div className="flex items-stretch gap-3.5 sm:gap-4">
                        {/* Square Rounded Thumbnail */}
                        <Link
                          href={`/sewa-alat/${item.equipmentId}`}
                          className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] relative aspect-square"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.imageUrl ||
                              'https://picsum.photos/seed/sewa-alat-koperasi/300/300'
                            }
                            alt={item.nama}
                            className="w-full h-full object-cover"
                          />
                        </Link>

                        {/* Center Column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <Link
                              href={`/sewa-alat/${item.equipmentId}`}
                              className="font-bold text-[#1a2610] hover:text-[#344d15] text-sm sm:text-base leading-snug line-clamp-1 transition"
                            >
                              {item.nama}
                            </Link>
                            <div className="text-xs text-[#5b6950] mt-0.5 truncate tabular-nums">
                              {item.durasi} {item.satuanSewa} • Rp {item.hargaSewa.toLocaleString('id-ID')}/{item.satuanSewa}
                            </div>
                          </div>

                          <div className="text-sm sm:text-base font-extrabold text-[#1a2610] tabular-nums">
                            Rp {itemTotal.toLocaleString('id-ID')}
                          </div>
                        </div>

                        {/* Right Column: Top-Right X & Bottom-Right Unit Pill Stepper */}
                        <div className="flex flex-col items-end justify-between py-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveRentalItem(item.id, item.nama)}
                            className="text-[#5b6950] hover:text-[#1a2610] transition p-1 -mr-1 -mt-1 cursor-pointer"
                            title="Hapus alat"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="inline-flex items-center h-8 rounded-full border border-[#dce1d6] bg-white px-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateRentalQty(item.id, -1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
                              title="Kurangi unit"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-[#1a2610] tabular-nums">
                              {item.jumlahUnit}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRentalQty(item.id, 1)}
                              disabled={item.jumlahUnit >= (item.stokUnit || 99)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[#526046] hover:text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer disabled:opacity-40"
                              title="Tambah unit"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Compact Duration & Operator Pill Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="inline-flex items-center gap-2 bg-[#f4f5f1] px-3 py-1 rounded-full border border-[#EAEDE7]">
                          <span className="text-[#526046] font-medium">Durasi ({item.satuanSewa}):</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateRentalDurasi(item.id, -1)}
                            disabled={item.durasi <= 1}
                            className="text-[#1a2610] font-bold px-1 disabled:opacity-30 cursor-pointer"
                          >
                            −
                          </button>
                          <span className="font-extrabold text-[#1a2610] tabular-nums">{item.durasi}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateRentalDurasi(item.id, 1)}
                            className="text-[#1a2610] font-bold px-1 cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {item.biayaOperator ? (
                          <label className="inline-flex items-center gap-1.5 text-xs text-[#1a2610] font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.includeOperator}
                              onChange={(e) => handleToggleRentalOperator(item.id, e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-[#233414] cursor-pointer"
                            />
                            <span>+ Operator (Rp {item.biayaOperator.toLocaleString('id-ID')})</span>
                          </label>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column / Bottom Summary Sheet */}
              <div className="md:col-span-5 lg:col-span-4 md:sticky md:top-20">
                <div className="bg-white sm:rounded-3xl sm:border sm:border-[#dce1d6] pt-4 sm:p-6 border-t border-[#EAEDE7] sm:border-t-[#dce1d6] space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[#526046]">
                      <span>Total Unit Mesin</span>
                      <span className="font-semibold text-[#1a2610] tabular-nums">
                        {totalRentalUnits} Unit ({rentalCartItems.length} Jenis)
                      </span>
                    </div>
                    <div className="flex justify-between text-[#526046]">
                      <span>Status Pengajuan</span>
                      <span className="font-semibold text-[#344d15]">Verifikasi Admin Koperasi</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-[#EAEDE7]">
                    <span className="text-sm font-semibold text-[#526046]">Total:</span>
                    <span className="text-xl sm:text-2xl font-black text-[#1a2610] tabular-nums">
                      Rp {totalRentalAmount.toLocaleString('id-ID')}
                    </span>
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
                    className="w-full h-12 sm:h-13 px-6 bg-[#1a2610] hover:bg-[#233414] text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                  >
                    <span>Lanjut ke Checkout Sewa</span>
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
