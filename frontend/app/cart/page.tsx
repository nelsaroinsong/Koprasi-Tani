'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import SlideCommit from '@/components/ui/SlideCommit';
import LocationMapPreview from '@/components/LocationMapPreview';
import {
  ShoppingCart,
  ShoppingBag,
  Tractor,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Tag,
  Building2,
  Banknote,
  MapPin,
  AlertCircle,
  PackageCheck,
  Loader2,
  MessageCircle,
  Calendar,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

  // State Checkout Modal Toko Online
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderResult, setCreatedOrderResult] = useState<any | null>(null);
  const pendingOrderRef = useRef<any | null>(null);

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

  // Submit Official Order to API (Toko Online)
  const handleConfirmOrder = async () => {
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent('/cart')}`);
      throw new Error('Silakan login terlebih dahulu untuk checkout');
    }

    if (cartItems.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    try {
      setIsSubmittingOrder(true);
      setOrderError(null);

      const itemsPayload = cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          paymentMethod: 'TUNAI_DI_KOPERASI',
          pickupMethod: 'AMBIL_DI_KOPERASI',
          notes: orderNotes.trim() ? orderNotes.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan ke sistem koperasi');
      }

      pendingOrderRef.current = data.order;
      clearCart(user);
      setCartItems([]);

      showToast({
        title: 'Pesanan Resmi Dibuat',
        message: `No. Pesanan #${data.order.orderNumber} telah tercatat di sistem koperasi.`,
        type: 'success',
      });

      return data.order;
    } catch (err: any) {
      console.error('Error submitting order:', err);
      setOrderError(err.message || 'Terjadi gangguan saat memproses pesanan.');
      throw err;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSendWhatsAppConfirmation = (orderData: any) => {
    const adminPhone = '6281234567890';
    const message = `Halo Admin Koperasi Sinar Pagi Sejahtera,
Saya telah membuat *Pesanan Resmi* melalui Toko Online Koperasi:

*No. Pesanan:* #${orderData.orderNumber}
*Nama Pemesan:* ${user?.name || 'Pelanggan'}
*Total Pembayaran:* Rp ${Number(orderData.totalAmount).toLocaleString('id-ID')}
*Metode:* Bayar Tunai saat Pengambilan di Gudang Koperasi

Mohon dipersiapkan komoditas tersebut. Terima kasih!`;

    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ==========================================
  // 2. STATE & HANDLERS: SEWA ALAT PERTANIAN
  // ==========================================
  const [rentalCartItems, setRentalCartItems] = useState<RentalCartItem[]>([]);
  const [isLoadedRental, setIsLoadedRental] = useState(false);
  const [rentalStartDate, setRentalStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [rentalLokasiLahan, setRentalLokasiLahan] = useState(user?.address || '');
  const [rentalCatatan, setRentalCatatan] = useState('');
  const [isSubmittingRental, setIsSubmittingRental] = useState(false);
  const [isRentalCheckoutModalOpen, setIsRentalCheckoutModalOpen] = useState(false);
  const [rentalOrderError, setRentalOrderError] = useState<string | null>(null);
  const [createdRentalResult, setCreatedRentalResult] = useState<any | null>(null);

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

  useEffect(() => {
    if (user?.address) {
      setRentalLokasiLahan(user.address);
    }
  }, [user]);

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

  // Submit Pengajuan Sewa Multi-Alat (Menunggu Persetujuan Admin Koperasi)
  const handleConfirmRentalOrder = async () => {
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent('/cart?tab=sewa-alat')}`);
      throw new Error('Silakan masuk akun terlebih dahulu');
    }

    if (rentalCartItems.length === 0) {
      throw new Error('Keranjang sewa alat masih kosong.');
    }

    if (!rentalStartDate) {
      throw new Error('Tentukan tanggal mulai pemakaian sewa.');
    }

    try {
      setIsSubmittingRental(true);
      setRentalOrderError(null);
      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: rentalStartDate,
          lokasiLahan: rentalLokasiLahan,
          catatan: rentalCatatan,
          items: rentalCartItems.map((it) => ({
            equipmentId: it.equipmentId,
            durasi: it.durasi,
            jumlahUnit: it.jumlahUnit,
            includeOperator: it.includeOperator,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim pengajuan sewa ke koperasi');
      }

      clearRentalCart();
      setRentalCartItems([]);
      setIsRentalCheckoutModalOpen(false);
      setCreatedRentalResult(data);

      showToast({
        title: 'Pengajuan Sewa Terkirim',
        message: `Pengajuan sewa #${data.rentalCode} berhasil diajukan dan menunggu persetujuan admin.`,
        type: 'success',
      });

      return data;
    } catch (err: any) {
      console.error('Error submitting rental cart:', err);
      setRentalOrderError(err.message || 'Terjadi gangguan saat memproses sewa alat.');
      throw err;
    } finally {
      setIsSubmittingRental(false);
    }
  };

  const isLoaded = activeTab === 'toko' ? isLoadedToko : isLoadedRental;

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col pb-24">
      {/* App Header */}
      <AppHeader activePage="cart" />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Title & Clear Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Keranjang Saya
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola daftar belanjaan komoditas toko online dan pengajuan sewa alat pertanian Anda.
            </p>
          </div>

          {/* Tombol Kosongkan sesuai tab aktif */}
          {activeTab === 'toko' && cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 transition flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-red-50 border border-slate-200 hover:border-red-200 cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Komoditas</span>
            </button>
          )}

          {activeTab === 'sewa-alat' && rentalCartItems.length > 0 && (
            <button
              onClick={handleClearRentalCart}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 transition flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-red-50 border border-slate-200 hover:border-red-200 cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Sewa Alat</span>
            </button>
          )}
        </div>

        {/* TAB SEGMENTED CONTROL: TOKO ONLINE & SEWA ALAT */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit mb-6 sm:mb-8 border border-slate-300/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('toko')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'toko'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Toko Online</span>
            {cartItems.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === 'toko'
                    ? 'bg-emerald-950 text-white'
                    : 'bg-slate-300 text-slate-800'
                }`}
              >
                {cartItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sewa-alat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'sewa-alat'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Tractor className="w-4 h-4" />
            <span>Sewa Alat</span>
            {rentalCartItems.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === 'sewa-alat'
                    ? 'bg-emerald-950 text-white'
                    : 'bg-slate-300 text-slate-800'
                }`}
              >
                {rentalCartItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading Spinner */}
        {!isLoaded ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Memuat isi keranjang...</span>
          </div>
        ) : activeTab === 'toko' ? (
          /* ========================================================= */
          /* TAB 1: KONTEN KERANJANG TOKO ONLINE                       */
          /* ========================================================= */
          cartItems.length === 0 ? (
            /* Empty State Toko */
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-14 text-center flex flex-col items-center justify-center shadow-2xs max-w-2xl mx-auto my-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5]" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Keranjang Belanja Toko Kosong
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 mb-6">
                Belum ada komoditas hasil panen yang dimasukkan. Jelajahi katalog hasil tani koperasi dan dukung petani lokal kami.
              </p>
              <Link
                href="/toko"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Mulai Belanja Komoditas</span>
              </Link>
            </div>
          ) : (
            /* Layout 2 Kolom Toko Online */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Kolom Kiri: Daftar Komoditas */}
              <div className="md:col-span-7 lg:col-span-8 space-y-3.5">
                {cartItems.map((item) => {
                  const itemTotal = Number(item.hargaPerSatuan || 0) * (item.quantity || 1);

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-20 h-20 sm:w-22 sm:h-22 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 relative aspect-square">
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
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                              {item.nama}
                            </h3>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>Kategori: {item.kategori}</span>
                              {item.petaniName && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Petani: {item.petaniName}</span>
                                </>
                              )}
                            </div>
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span>Tersedia di Gudang</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-3">
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition cursor-pointer"
                                title="Kurangi Kuantitas"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition cursor-pointer"
                                title="Tambah Kuantitas"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id, item.nama)}
                              className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                              title="Hapus komoditas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 shrink-0">
                        <div className="text-[11px] text-slate-400 font-medium">
                          Rp {Number(item.hargaPerSatuan).toLocaleString('id-ID')} / {item.satuan}
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-emerald-800">
                          Rp {itemTotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kolom Kanan: Ringkasan Belanja Toko */}
              <div className="md:col-span-5 lg:col-span-4 sticky top-20 space-y-4">
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
                    Ringkasan Belanja Komoditas
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Kuantitas</span>
                      <span className="font-semibold text-slate-900">{totalItemsCount} Satuan</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Metode Pembayaran</span>
                      <span className="font-semibold text-emerald-800">Tunai Kas Koperasi</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Lokasi Pengambilan</span>
                      <span className="font-semibold text-slate-800">Gudang Koperasi</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-700">Total Tagihan:</span>
                    <span className="text-lg font-black text-emerald-900">
                      Rp {finalTotalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCheckoutModalOpen(true)}
                    className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <span>Lanjut ke Konfirmasi Pengambilan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* ========================================================= */
          /* TAB 2: KONTEN KERANJANG SEWA ALAT PERTANIAN               */
          /* ========================================================= */
          rentalCartItems.length === 0 ? (
            /* Empty State Sewa Alat */
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-14 text-center flex flex-col items-center justify-center shadow-2xs max-w-2xl mx-auto my-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Tractor className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5]" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Keranjang Sewa Alat Masih Kosong
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 mb-6">
                Belum ada unit mesin atau alat pertanian yang dipilih. Masukkan traktor, kultivator, pompa, atau mesin panen untuk disewa bersamaan.
              </p>
              <Link
                href="/sewa-alat"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition"
              >
                <Tractor className="w-4 h-4" />
                <span>Jelajahi Katalog Sewa Alat</span>
              </Link>
            </div>
          ) : (
            /* Layout 2 Kolom Sewa Multi-Alat */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Kolom Kiri: Daftar Unit Alat yang Disewa */}
              <div className="md:col-span-7 lg:col-span-8 space-y-3.5">
                {rentalCartItems.map((item) => {
                  const itemTotal = calculateRentalItemTotal(item);

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                item.imageUrl ||
                                'https://picsum.photos/seed/sewa-alat-koperasi/300/300'
                              }
                              alt={item.nama}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                              {item.kategori}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1 truncate">
                              {item.nama}
                            </h3>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Tarif: <span className="font-bold text-slate-800">Rp {item.hargaSewa.toLocaleString('id-ID')}</span> / {item.satuanSewa}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRentalItem(item.id, item.nama)}
                          className="text-slate-400 hover:text-red-600 transition p-1.5 cursor-pointer"
                          title="Hapus alat dari sewa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Stepper Pengaturan Kuantitas & Durasi */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        {/* Stepper Jumlah Unit */}
                        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-xs font-semibold text-slate-600">
                            Jumlah Unit:
                          </span>
                          <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateRentalQty(item.id, -1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition cursor-pointer"
                              title="Kurangi unit"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-slate-900">
                              {item.jumlahUnit}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRentalQty(item.id, 1)}
                              disabled={item.jumlahUnit >= (item.stokUnit || 99)}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition cursor-pointer disabled:opacity-40"
                              title="Tambah unit"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Stepper Durasi Hari */}
                        <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                          <span className="text-xs font-semibold text-slate-600">
                            Durasi ({item.satuanSewa}):
                          </span>
                          <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateRentalDurasi(item.id, -1)}
                              disabled={item.durasi <= 1}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition cursor-pointer disabled:opacity-40"
                              title="Kurangi durasi"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-slate-900">
                              {item.durasi}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRentalDurasi(item.id, 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition cursor-pointer"
                              title="Tambah durasi"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Checklist Operator */}
                      {item.biayaOperator ? (
                        <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.includeOperator}
                              onChange={(e) =>
                                handleToggleRentalOperator(item.id, e.target.checked)
                              }
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 mt-0.5 cursor-pointer"
                            />
                            <div className="text-xs">
                              <span className="font-bold text-slate-800">
                                Gunakan Kru Operator Koperasi (+ Rp{' '}
                                {item.biayaOperator.toLocaleString('id-ID')} / {item.satuanSewa})
                              </span>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Operator terlatih siap mengoperasikan unit di lahan Anda.
                              </p>
                            </div>
                          </label>
                        </div>
                      ) : null}

                      {/* Subtotal Unit Ini */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">Subtotal Estimasi:</span>
                        <span className="font-extrabold text-sm sm:text-base text-emerald-900">
                          Rp {itemTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kolom Kanan: Ringkasan Pengajuan Sewa Multi-Alat (Persis Format Toko Online di Gambar 3) */}
              <div className="md:col-span-5 lg:col-span-4 sticky top-20 space-y-4">
                <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span>Ringkasan Pengajuan Sewa</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Perlu Approval Admin
                    </span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Unit Mesin</span>
                      <span className="font-semibold text-slate-900">
                        {totalRentalUnits} Unit ({rentalCartItems.length} Jenis)
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Metode Pembayaran</span>
                      <span className="font-semibold text-emerald-800">
                        Tunai Kasir Koperasi
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Lokasi Pengambilan</span>
                      <span className="font-semibold text-slate-800">
                        Kantor / Gudang Koperasi
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-700">Total Estimasi Tagihan:</span>
                    <span className="text-lg font-black text-emerald-900">
                      Rp {totalRentalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        router.push(`/login?callbackUrl=${encodeURIComponent('/cart?tab=sewa-alat')}`);
                        return;
                      }
                      setIsRentalCheckoutModalOpen(true);
                    }}
                    className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <span>Lanjut ke Konfirmasi Pengajuan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* MODAL CHECKOUT TOKO ONLINE: AMBIL DI KASIR GUDANG TUNAI */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-700" />
              <span>Konfirmasi Pengambilan & Kas Tunai</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Komoditas diambil langsung di kantor & gudang Koperasi Sinar Pagi Sejahtera.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            {/* Lokasi Gudang */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Titik Pengambilan Resmi Koperasi:</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pl-5.5">
                Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara.
              </p>
            </div>

            {/* Metode Bayar Tunai */}
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <Banknote className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-950">Pembayaran Tunai di Kasir Koperasi</div>
                <div className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                  Serahkan uang tunai pas kepada kasir koperasi pada saat serah terima barang fisik di gudang.
                </div>
              </div>
            </div>

            {/* Catatan Tambahan Pembeli */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Catatan Pengambilan (Opsional)
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Diambil sore hari sekitar jam 15:00 WITA..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none font-medium"
              />
            </div>

            {/* Error Message */}
            {orderError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Total Pembayaran & Slide to Commit */}
            <div className="p-3.5 bg-slate-100 rounded-2xl flex justify-between items-baseline font-black">
              <span className="text-slate-700">Total Tagihan Tunai:</span>
              <span className="text-base text-emerald-900">
                Rp {finalTotalAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="pt-2">
              <SlideCommit
                label="Geser untuk Buat Pesanan Resmi"
                onConfirm={handleConfirmOrder}
                disabled={isSubmittingOrder}
                className="w-full"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: CHECKOUT SEWA ALAT (APPROVAL ADMIN KOPERASI)    */}
      {/* ======================================================== */}
      <Dialog open={isRentalCheckoutModalOpen} onOpenChange={setIsRentalCheckoutModalOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-emerald-700" />
              <span>Konfirmasi Pengajuan Sewa Alat</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Pengajuan sewa memerlukan persetujuan admin koperasi terlebih dahulu untuk pengecekan unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            {/* Banner Informasi Persetujuan Admin Koperasi */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">Verifikasi & Approval Admin:</span> Setelah diajukan, Admin Koperasi akan memeriksa ketersediaan teknis dan jadwal mesin sebelum unit diserahkan.
              </div>
            </div>

            {/* Input Mulai Tanggal Sewa */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mulai Tanggal Penggunaan <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={rentalStartDate}
                onChange={(e) => setRentalStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold text-xs text-slate-800"
              />
            </div>

            {/* Input Lokasi Lahan Kebun dengan Preview Maps & Deteksi GPS */}
            <LocationMapPreview
              value={rentalLokasiLahan}
              onChange={setRentalLokasiLahan}
              required={false}
            />

            {/* Catatan Kebutuhan Tambahan */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                value={rentalCatatan}
                onChange={(e) => setRentalCatatan(e.target.value)}
                placeholder="Instruksi tambahan, implemen traktor rotary, jam pemakaian..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none font-medium text-xs text-slate-800"
              />
            </div>

            {/* Error Message */}
            {rentalOrderError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rentalOrderError}</span>
              </div>
            )}

            {/* Total Pembayaran & Slide to Commit */}
            <div className="p-3.5 bg-slate-100 rounded-2xl flex justify-between items-baseline font-black">
              <span className="text-slate-700">Total Estimasi Sewa:</span>
              <span className="text-base text-emerald-900">
                Rp {totalRentalAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="pt-2">
              <SlideCommit
                label="Geser untuk Ajukan Sewa Alat"
                onConfirm={handleConfirmRentalOrder}
                disabled={isSubmittingRental}
                className="w-full"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: SUKSES PENGAJUAN SEWA ALAT (APPROVAL PENDING)   */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(createdRentalResult)}
        onOpenChange={(open) => !open && setCreatedRentalResult(null)}
      >
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <PackageCheck className="w-7 h-7" />
          </div>

          <DialogTitle className="text-lg font-extrabold text-slate-900">
            Pengajuan Sewa Berhasil Dikirim!
          </DialogTitle>

          <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800 mx-auto">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu Persetujuan Admin Koperasi</span>
          </div>

          <DialogDescription className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Pengajuan sewa alat dengan kode <strong className="text-slate-800">#{createdRentalResult?.rentalCode}</strong> telah masuk ke antrean verifikasi pengurus koperasi.
          </DialogDescription>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl my-4 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Mulai Tanggal:</span>
              <span className="font-semibold text-slate-800">{rentalStartDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metode Bayar:</span>
              <span className="font-semibold text-slate-800">Tunai Kasir Koperasi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lokasi Kebun:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                {rentalLokasiLahan || 'Kantor Koperasi'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-black">
              <span className="text-slate-700">Total Estimasi:</span>
              <span className="text-emerald-800 text-sm">
                Rp {Number(createdRentalResult?.totalEstimasi || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {createdRentalResult?.waUrl && (
              <a
                href={createdRentalResult.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                <span>Konfirmasi via WhatsApp Pengurus</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setCreatedRentalResult(null);
                router.push('/pesanan');
              }}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Lihat Status di Halaman Pesanan
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ShoppingCartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
