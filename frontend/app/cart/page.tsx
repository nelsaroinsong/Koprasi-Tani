'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import SlideCommit from '@/components/ui/SlideCommit';
import {
  ShoppingCart,
  ShoppingBag,
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
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CartItem {
  id: string;
  nama: string;
  kategori: string;
  hargaPerSatuan: number;
  satuan: string;
  imageUrl?: string | null;
  quantity: number;
  petaniName?: string;
}

export default function ShoppingCartPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // State Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // State Checkout Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderResult, setCreatedOrderResult] = useState<any | null>(null);
  const pendingOrderRef = useRef<any | null>(null);

  // Sync Cart from LocalStorage
  const syncCart = useCallback(() => {
    try {
      const saved = localStorage.getItem('koperasi_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        } else {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    } catch (e) {
      console.error('Error loading cart:', e);
      setCartItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

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

  // Update Item Quantity
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
    localStorage.setItem('koperasi_cart', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cart-updated'));
  };

  // Remove Item
  const handleRemoveItem = (id: string, nama: string) => {
    const updated = cartItems.filter((item) => item.id !== id);
    setCartItems(updated);
    localStorage.setItem('koperasi_cart', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cart-updated'));

    showToast({
      title: 'Item Dihapus',
      message: `"${nama}" telah dikeluarkan dari keranjang belanja.`,
      type: 'info',
    });
  };

  // Clear Entire Cart
  const handleClearCart = () => {
    setCartItems([]);
    localStorage.removeItem('koperasi_cart');
    window.dispatchEvent(new CustomEvent('cart-updated'));

    showToast({
      title: 'Keranjang Dikosongkan',
      message: 'Semua komoditas telah dibersihkan dari keranjang.',
      type: 'info',
    });
  };

  // Calculate Totals
  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  }, [cartItems]);

  const subtotalAmount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + Number(curr.hargaPerSatuan || 0) * (curr.quantity || 1), 0);
  }, [cartItems]);

  const finalTotalAmount = useMemo(() => {
    return subtotalAmount;
  }, [subtotalAmount]);

  // Submit Official Order to API
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

      // Simpan referensi order untuk ditransisikan setelah animasi slide selesai
      pendingOrderRef.current = data.order;
      localStorage.removeItem('koperasi_cart');
      window.dispatchEvent(new CustomEvent('cart-updated'));
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

  // WhatsApp Confirmation
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

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col pb-20">
      {/* App Header */}
      <AppHeader activePage="toko" />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Title & Clear Action */}
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Keranjang Belanja
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Periksa komoditas hasil panen pilihan Anda sebelum menyelesaikan pemesanan di koperasi.
            </p>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 transition flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {!isLoaded ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Memuat keranjang...</span>
          </div>
        ) : cartItems.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-16 text-center flex flex-col items-center justify-center shadow-2xs max-w-2xl mx-auto my-6">
            <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <ShoppingCart className="w-9 h-9 stroke-[1.5]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Keranjang Belanja Anda Kosong
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1.5 mb-6">
              Belum ada komoditas hasil panen yang dimasukkan ke keranjang belanja Anda. Jelajahi katalog hasil tani koperasi dan dukung petani lokal kami.
            </p>
            <Link
              href="/toko"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mulai Belanja Komoditas</span>
            </Link>
          </div>
        ) : (
          /* Layout 2 Kolom Responsif (Mobile, Tablet md, Desktop lg) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Kolom Kiri: Daftar Komoditas di Keranjang */}
            <div className="md:col-span-7 lg:col-span-8 space-y-4">
              {cartItems.map((item) => {
                const itemTotal = Number(item.hargaPerSatuan || 0) * (item.quantity || 1);

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Left: Thumbnail Foto & Informasi Komoditas */}
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Product Image: Fixed aspect-square yang presisi di semua layar */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-24 md:h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 relative aspect-square">
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

                      {/* Info & Quantity */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                            {item.nama}
                          </h3>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span>Kategori: {item.kategori}</span>
                            {item.petaniName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span>Petani: {item.petaniName}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>Tersedia</span>
                            </span>
                          </div>
                        </div>

                        {/* Controls (Pengatur Kuantitas + Tombol Hapus) */}
                        <div className="flex items-center gap-3 mt-3">
                          {/* Quantity Counter */}
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

                          {/* Tombol Hapus */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id, item.nama)}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 text-xs font-medium transition cursor-pointer px-1.5 py-1 rounded"
                            title="Hapus komoditas ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Harga Total & Satuan */}
                    <div className="text-right sm:self-start shrink-0 w-full sm:w-auto flex sm:flex-col justify-between items-baseline sm:items-end border-t sm:border-t-0 border-slate-100 pt-2.5 sm:pt-0">
                      <div className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        Rp {itemTotal.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Rp {Number(item.hargaPerSatuan).toLocaleString('id-ID')} /{item.satuan}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Kolom Kanan: Ringkasan Pesanan */}
            <div className="md:col-span-5 lg:col-span-4 sticky top-24">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Ringkasan Pesanan
                </h2>

                {/* Input Kode Promo */}
                {/* Rincian Perhitungan */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                      <span>{totalItemsCount} komoditas</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">
                      Rp {subtotalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Pengambilan Barang</span>
                    <span className="font-semibold text-emerald-700">
                      Gratis (Gudang Koperasi)
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm sm:text-base font-extrabold text-slate-900">
                    <span>Total Pembayaran</span>
                    <span className="text-emerald-800 text-lg sm:text-xl font-black">
                      Rp {finalTotalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Tombol Lanjut ke Checkout */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => setIsCheckoutModalOpen(true)}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-xs transition flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span>Lanjut ke Checkout Pesanan</span>
                  <HugeiconsIcon
                    icon={ArrowRight02Icon}
                    size={16}
                    className="text-slate-300 group-hover:translate-x-0.5 group-hover:text-white transition-all"
                  />
                </motion.button>

                <p className="text-[10px] text-center text-slate-400">
                  Pengambilan komoditas fisik langsung di kantor/gudang koperasi
                </p>

                {/* Keunggulan & Garansi Koperasi */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pengambilan langsung di gudang koperasi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Garansi mutu hasil panen segar mitra petani</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Transaksi sah & tercatat resmi koperasi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CHECKOUT & KONFIRMASI PESANAN */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-200">
          {!createdOrderResult ? (
            <div>
              <DialogHeader className="text-left mb-4">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Konfirmasi Checkout Pesanan
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Selesaikan pesanan Anda untuk diteruskan ke Admin Gudang Koperasi.
                </DialogDescription>
              </DialogHeader>

              {/* Informational Banner */}
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5 mb-4 text-xs">
                <Building2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-slate-700 leading-relaxed text-[11px]">
                  <strong className="text-emerald-900">Sistem Satu Pintu Koperasi:</strong> Stok di gudang koperasi akan otomatis dialokasikan. Pembeli membayar tunai di kasir koperasi saat mengambil fisik komoditas.
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Metode Pembayaran */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Metode Pembayaran
                  </label>
                  <div className="p-3 rounded-xl border border-emerald-500 bg-emerald-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Bayar Tunai (Cash) di Kasir Koperasi</div>
                        <div className="text-[10px] text-slate-500">Bayar saat serah terima barang di tempat</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                      Resmi
                    </span>
                  </div>
                </div>

                {/* Lokasi Pengambilan */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Lokasi Pengambilan Fisik
                  </label>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Kantor & Gudang Koperasi Sinar Pagi Sejahtera</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Jl. Trans Sulawesi, Minahasa Utara, Sulawesi Utara
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Catatan untuk Petugas Koperasi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Contoh: Diambil hari Rabu jam 10 pagi..."
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {/* Ringkasan Biaya Final */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Total Komoditas:</span>
                    <span className="font-semibold text-slate-800">{totalItemsCount} barang</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Total yang Harus Dibayar:</span>
                    <span className="text-base text-emerald-800 font-black">
                      Rp {finalTotalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {orderError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-amber-900">Perhatian Ketersediaan Stok</div>
                      <div className="text-[11px] leading-relaxed text-amber-800">{orderError}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Batal & Slide to Confirm */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 mt-5 pt-3.5 border-t border-slate-100">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsCheckoutModalOpen(false)}
                  disabled={isSubmittingOrder}
                  className="w-full sm:w-auto py-3 px-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-2xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} className="text-slate-400 group-hover:text-slate-600" />
                  <span>Batal</span>
                </motion.button>

                <div className="w-full flex-1 min-w-0">
                  <SlideCommit
                    label="Geser untuk Konfirmasi Pesanan"
                    doneLabel="Pesanan Resmi Dibuat"
                    errorLabel="Gagal Memproses"
                    onConfirm={handleConfirmOrder}
                    onDone={() => {
                      if (pendingOrderRef.current) {
                        const orderData = pendingOrderRef.current;
                        setTimeout(() => {
                          setCreatedOrderResult(orderData);
                        }, 800);
                      }
                    }}
                    onError={(reason: any) => {
                      console.error('Konfirmasi pesanan gagal:', reason);
                    }}
                    trackColor="#064e3b"
                    handleColor="#ffffff"
                    successColor="#10b981"
                    dangerColor="#ef4444"
                    height={52}
                    radius={26}
                    speed={50}
                    returnBounce={0.38}
                    landingDip={0.026}
                    holdMs={1400}
                    disabled={isSubmittingOrder || cartItems.length === 0}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Success Order View */
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <PackageCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Pesanan Resmi Berhasil Dibuat!
              </h3>
              <div className="inline-block mt-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800">
                No. Pesanan: #{createdOrderResult.orderNumber}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                Pesanan Anda telah tercatat di sistem koperasi dan stok di gudang telah otomatis dialokasikan.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl my-4 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Pesanan:</span>
                  <span className="font-bold text-amber-600">MENUNGGU PEMBAYARAN DI KASIR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-bold text-slate-900">
                    Rp {Number(createdOrderResult.totalAmount).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lokasi Ambil:</span>
                  <span className="font-medium text-slate-800">Kantor & Gudang Koperasi</span>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppConfirmation(createdOrderResult)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Konfirmasi ke WhatsApp Admin Koperasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutModalOpen(false);
                    router.push('/pesanan');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Pantau di Halaman Pesanan
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
