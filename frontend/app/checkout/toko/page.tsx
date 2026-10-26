'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import SlideCommit from '@/components/ui/SlideCommit';
import {
  ShoppingBag,
  Store,
  Building2,
  Banknote,
  MapPin,
  Clock,
  User,
  Phone,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getCart, clearCart, type CartItem } from '@/lib/cart';
import { getPrimaryImage } from '@/lib/utils';

export default function CheckoutTokoPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderResult, setCreatedOrderResult] = useState<any | null>(null);

  const [warehouseAddress, setWarehouseAddress] = useState(
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara'
  );
  const [adminPhone, setAdminPhone] = useState('081944078924');

  // Ambil info alamat koperasi & kontak
  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alamat) setWarehouseAddress(data.alamat);
        if (data?.telepon) setAdminPhone(data.telepon);
      })
      .catch(() => {});
  }, []);

  // Load keranjang toko online
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push(`/login?callbackUrl=${encodeURIComponent('/checkout/toko')}`);
        return;
      }
      try {
        const items = getCart(user);
        setCartItems(items);
      } catch (err) {
        console.error('Error loading cart:', err);
        setCartItems([]);
      } finally {
        setIsLoaded(true);
      }
    }
  }, [user, authLoading, router]);

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

  // Submit Order ke API
  const handleConfirmOrder = async () => {
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent('/checkout/toko')}`);
      throw new Error('Silakan login terlebih dahulu');
    }

    if (cartItems.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    try {
      setIsSubmitting(true);
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

      clearCart(user);
      setCartItems([]);
      setCreatedOrderResult(data.order);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('order-created'));
      }

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
      setIsSubmitting(false);
    }
  };

  // WhatsApp Handler
  const handleSendWhatsAppConfirmation = (orderData: any) => {
    const rawPhone = adminPhone || '081944078924';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const itemsSummary = orderData.items
      ?.map(
        (i: any) =>
          `- ${i.namaProduk || i.product?.nama} (${i.quantity} ${
            i.satuan || i.product?.satuan || 'unit'
          })`
      )
      .join('\n');

    const message = `Halo Admin Koperasi Sinar Pagi Sejahtera,
Saya telah membuat *Pesanan Resmi* melalui Toko Online Koperasi:

*Nomor Pesanan:* #${orderData.orderNumber}
*Nama Pemesan:* ${user?.name || 'Pelanggan'} (${user?.phone || '-'})
*Total Pembayaran:* Rp ${Number(orderData.totalAmount).toLocaleString('id-ID')}
*Metode:* Bayar Tunai saat Pengambilan di Gudang Koperasi
*Titik Ambil:* ${warehouseAddress}

Daftar Komoditas:
${itemsSummary || '-'}

${orderData.catatan ? `*Catatan:* ${orderData.catatan}\n` : ''}
Mohon info kesiapan fisik komoditas di gudang koperasi. Terima kasih!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (authLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="toko" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
          <p className="text-xs font-semibold text-[#526046]">
            Mempersiapkan halaman konfirmasi pesanan...
          </p>
        </div>
      </div>
    );
  }

  // Tampilan Sukses Checkout (Ticket / Receipt Style)
  if (createdOrderResult) {
    const orderDate = createdOrderResult.createdAt
      ? new Date(createdOrderResult.createdAt)
      : new Date();
    const formattedDate = orderDate
      .toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase();
    const formattedTime = orderDate
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace('.', ':');

    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="toko" />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">
          {/* Ticket / Receipt Card */}
          <div className="w-full max-w-[340px] sm:max-w-[370px] bg-white rounded-3xl border border-[#dce1d6] overflow-hidden relative">
            {/* Top Section: Party Popper & Heading */}
            <div className="pt-7 pb-4 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <svg
                  className="w-16 h-16"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M38 18C44 12 56 22 62 14"
                    stroke="#344d15"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M26 22C32 16 38 24 45 18"
                    stroke="#547318"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M48 28C54 22 64 30 70 24"
                    stroke="#233414"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="34" cy="12" r="3" fill="#D4F63D" />
                  <circle cx="58" cy="22" r="3.5" fill="#547318" />
                  <circle cx="68" cy="14" r="2.5" fill="#344d15" />
                  <circle cx="48" cy="8" r="2" fill="#233414" />
                  <rect
                    x="54"
                    y="26"
                    width="4.5"
                    height="4.5"
                    rx="1"
                    transform="rotate(25 54 26)"
                    fill="#D4F63D"
                  />
                  <rect
                    x="28"
                    y="18"
                    width="4"
                    height="4"
                    rx="1"
                    transform="rotate(-15 28 18)"
                    fill="#547318"
                  />
                  <path
                    d="M12 68L48 24C49 25 51 27 52 29L16 73C14 74 12 72 12 68Z"
                    fill="#233414"
                  />
                  <path
                    d="M18 61L30 46L36 51L24 66L18 61Z"
                    fill="#344d15"
                  />
                  <path
                    d="M29 47L41 32L47 37L35 52L29 47Z"
                    fill="#D4F63D"
                  />
                  <path
                    d="M40 33L48 24C49 25 51 27 52 29L44 38L40 33Z"
                    fill="#547318"
                  />
                  <path
                    d="M12 68C10 70 9 75 14 76C16 76 16 73 16 73L12 68Z"
                    fill="#1a2610"
                  />
                </svg>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-[#1a2610] tracking-tight">
                Pesanan Diterima
              </h1>
              <p className="text-xs text-[#526046] mt-1 max-w-[260px] mx-auto leading-relaxed">
                Pesanan resmi Anda telah berhasil dicatat & sedang disiapkan gudang koperasi.
              </p>
            </div>

            {/* Ticket Cutout Notches & Perforated Line */}
            <div className="relative my-2 flex items-center">
              <div className="absolute -left-3.5 w-7 h-7 rounded-full bg-[#f4f5f1] border-r border-[#dce1d6]" />
              <div className="w-full border-t-2 border-dashed border-[#dce1d6] mx-5" />
              <div className="absolute -right-3.5 w-7 h-7 rounded-full bg-[#f4f5f1] border-l border-[#dce1d6]" />
            </div>

            {/* Ticket Body / Metadata Grid */}
            <div className="px-6 py-4 space-y-4 text-left">
              {/* Row 1: Ticket ID & Amount */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5b6950]">
                    TICKET ID
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#1a2610] font-mono tracking-tight mt-0.5 tabular-nums">
                    #{createdOrderResult.orderNumber}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5b6950]">
                    AMOUNT
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#233414] mt-0.5 tabular-nums">
                    Rp {Number(createdOrderResult.totalAmount).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Row 2: Date & Time + Payment Method */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5b6950]">
                    DATE & TIME
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#1a2610] mt-0.5 tabular-nums">
                    {formattedDate} | {formattedTime}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5b6950]">
                    METODE
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#344d15] mt-0.5">
                    Tunai Kasir
                  </div>
                </div>
              </div>

              {/* Status / Location Box */}
              <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-2xl flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-[#233414] text-[#D4F63D] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1a2610] truncate">
                    Koperasi Sinar Pagi Sejahtera
                  </div>
                  <div className="text-[10px] text-[#526046] line-clamp-1 mt-0.5">
                    {warehouseAddress}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-center pt-0.5 pb-2">
                <span className="px-2.5 py-0.5 bg-[#e2f2c8] text-[#233414] border border-[#c9e39e] rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#233414]" />
                  <span>Menunggu Pembayaran Kasir Koperasi</span>
                </span>
              </div>
            </div>

            {/* Scalloped / Perforated Receipt Bottom Edge */}
            <div className="relative w-full overflow-hidden flex justify-between px-2 pt-2 -mb-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-[#f4f5f1] border-t border-[#dce1d6] shrink-0"
                />
              ))}
            </div>
          </div>

          {/* Action Buttons Below Ticket */}
          <div className="w-full max-w-[340px] sm:max-w-[370px] mt-5 px-1 space-y-3">
            <div className="flex items-center gap-2.5 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => handleSendWhatsAppConfirmation(createdOrderResult)}
                className="flex-1 py-2.5 sm:py-3 px-3 rounded-xl bg-white hover:bg-[#EAEDE7] text-[#1a2610] border border-[#cfd6c9] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Konfirmasi WA</span>
                <MessageCircle className="w-3.5 h-3.5 text-[#344d15] shrink-0" />
              </button>

              <Link
                href="/pesanan"
                className="flex-1 py-2.5 sm:py-3 px-3 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
              >
                <span>Status Pesanan</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4F63D] shrink-0" />
              </Link>
            </div>

            {/* Link Kembali Belanja di Toko Online */}
            <div className="text-center pt-0.5">
              <Link
                href="/toko"
                className="text-xs font-semibold text-[#526046] hover:text-[#233414] hover:underline inline-flex items-center gap-1 transition"
              >
                <span>← Kembali Belanja di Toko Online</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Jika Keranjang Kosong
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="toko" />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#1a2610]">Keranjang Belanja Anda Kosong</h2>
          <p className="text-xs text-[#526046] max-w-sm mt-1.5 leading-relaxed">
            Tidak ada komoditas pertanian yang sedang dipilih untuk checkout konfirmasi.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/cart"
              className="px-4 py-2.5 rounded-xl border border-[#cfd6c9] bg-white text-[#1a2610] font-bold text-xs hover:bg-[#EAEDE7] transition"
            >
              Buka Keranjang Saya
            </Link>
            <Link
              href="/toko"
              className="px-5 py-2.5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs transition"
            >
              Belanja di Toko Online
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white sm:bg-[#f4f5f1] flex flex-col font-sans pb-20">
      <div className="hidden sm:block">
        <AppHeader activePage="toko" />
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
          Checkout Pesanan
        </h1>

        <div className="w-10" />
      </div>
      {/* Spacer placeholder mode mobile agar konten tidak tertutup fixed navbar */}
      <div className="sm:hidden h-14 shrink-0 pointer-events-none" aria-hidden="true" />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-4 sm:py-6 lg:py-8 space-y-5 sm:space-y-6">
        {/* Desktop Compact Back Link */}
        <div className="hidden sm:flex items-center justify-between pb-1">
          <Link
            href="/cart?tab=toko"
            className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#1a2610] hover:text-[#344d15] transition group"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-[#cfd6c9] flex items-center justify-center text-[#1a2610] group-hover:bg-[#EAEDE7] transition shadow-2xs">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Keranjang Belanja</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#526046] shadow-2xs tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#344d15]" />
            <span>{totalItemsCount} Satuan ({cartItems.length} Komoditas)</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Kolom Kiri: Daftar Item & Informasi Pengambilan */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            {/* 1. Rincian Komoditas Yang Dipesan */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-7 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#EAEDE7]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#233414]" />
                  <h3 className="font-extrabold text-[#1a2610] text-xs sm:text-sm uppercase tracking-wider">
                    Daftar Komoditas ({cartItems.length})
                  </h3>
                </div>
                <Link
                  href="/cart?tab=toko"
                  className="px-3 py-1 rounded-full text-xs font-bold text-[#344d15] bg-[#e2f2c8]/60 hover:bg-[#e2f2c8] border border-[#c9e39e] transition cursor-pointer"
                >
                  Ubah
                </Link>
              </div>

              <div className="divide-y divide-[#EAEDE7]">
                {cartItems.map((item) => {
                  const itemSubtotal = Number(item.hargaPerSatuan) * (item.quantity || 1);
                  return (
                    <div key={item.id} className="py-4 first:pt-4 last:pb-1 flex items-center gap-4">
                      <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            getPrimaryImage(
                              item.imageUrl,
                              'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80'
                            )
                          }
                          alt={item.nama}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 py-0.5 space-y-1">
                        <h4 className="text-sm sm:text-base font-bold text-[#1a2610] truncate">
                          {item.nama}
                        </h4>
                        <div className="text-xs text-[#5b6950] tabular-nums">
                          Rp {Number(item.hargaPerSatuan).toLocaleString('id-ID')} / {item.satuan || 'unit'}
                        </div>
                        <div className="text-sm sm:text-base font-black text-[#1a2610] tabular-nums pt-1">
                          Rp {itemSubtotal.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-center shrink-0">
                        <span className="px-3.5 py-1.5 rounded-full border border-[#dce1d6] bg-[#f4f5f1] text-xs font-bold text-[#1a2610] tabular-nums shadow-2xs">
                          ×{item.quantity} {item.satuan}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Titik Pengambilan & Pembayaran Kasir */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-7 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#EAEDE7] pb-3">
                <Store className="w-4 h-4 text-[#233414]" />
                <h3 className="font-extrabold text-[#1a2610] text-xs sm:text-sm uppercase tracking-wider">
                  Titik Pengambilan & Pembayaran
                </h3>
              </div>

              <div className="p-4 bg-[#f8f9f6] rounded-2xl border border-[#dce1d6] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#cfd6c9] flex items-center justify-center text-[#233414] shrink-0 shadow-2xs">
                    <MapPin className="w-4 h-4 text-[#233414]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm leading-relaxed text-[#1a2610] font-bold">
                      {warehouseAddress}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2.5 border-t border-[#e2e7dd] text-xs text-[#526046]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#344d15]" />
                    <span>08:00 - 17:00 WITA</span>
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums font-medium">
                    <Phone className="w-3.5 h-3.5 text-[#344d15]" />
                    <span>Kasir: {adminPhone}</span>
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#e2f2c8]/40 border border-[#c9e39e] rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#c9e39e] flex items-center justify-center text-[#233414] shrink-0 shadow-2xs">
                    <Banknote className="w-4 h-4 text-[#233414]" />
                  </div>
                  <div className="text-xs min-w-0">
                    <div className="font-bold text-[#1a2610] text-xs sm:text-sm truncate">
                      Bayar Tunai di Kasir Koperasi
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#526046] truncate">
                      Saat komoditas ditimbang & diserahterimakan
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] bg-[#233414] text-[#D4F63D] font-extrabold shrink-0 shadow-2xs">
                  Rp 0 Admin
                </span>
              </div>
            </div>

            {/* 3. Catatan Pengambilan (Opsional) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-7 space-y-3 shadow-2xs">
              <label className="block font-extrabold text-[#1a2610] text-xs sm:text-sm">
                Catatan Pengambilan (Opsional)
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Diambil sekitar pukul 14:00 WITA..."
                className="w-full p-3.5 text-xs sm:text-sm bg-[#fafafa] border border-[#cfd6c9] rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] text-[#1a2610] placeholder:text-[#5b6950] transition"
              />
            </div>
          </div>

          {/* Kolom Kanan: Ringkasan Sticky & SlideCommit */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-7 space-y-5 shadow-2xs">
              <h2 className="text-base sm:text-lg font-bold text-[#1a2610] tracking-tight border-b border-[#EAEDE7] pb-3">
                Ringkasan Belanja
              </h2>

              <div className="space-y-3 text-xs sm:text-[13px]">
                <div className="flex justify-between text-[#526046]">
                  <span>Pemesan</span>
                  <span className="font-semibold text-[#1a2610] truncate max-w-[180px]">
                    {user?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Total Kuantitas</span>
                  <span className="font-semibold text-[#1a2610] tabular-nums">
                    {totalItemsCount} Satuan ({cartItems.length} Jenis)
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Biaya Layanan</span>
                  <span className="font-semibold text-[#344d15]">Gratis (Rp 0 - Ambil di Kasir)</span>
                </div>
              </div>

              <div className="border-t border-[#EAEDE7] pt-4 flex justify-between items-baseline">
                <span className="text-sm sm:text-base font-bold text-[#1a2610]">Total Tagihan:</span>
                <span className="text-2xl sm:text-3xl font-black text-[#1a2610] tracking-tight tabular-nums">
                  Rp {finalTotalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              {orderError && (
                <div className="p-3 bg-[#ffedea] border border-red-200 rounded-xl text-xs text-[#831c1e] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              <div className="pt-2">
                <SlideCommit
                  label="Geser untuk Buat Pesanan"
                  onConfirm={handleConfirmOrder}
                  disabled={isSubmitting}
                  trackColor="#1a2610"
                  handleColor="#ffffff"
                  successColor="#233414"
                  height={54}
                  radius={27}
                  className="w-full shadow-sm"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#526046] justify-center pt-1">
                <ShieldCheck className="w-4 h-4 text-[#344d15] shrink-0" />
                <span>Pesanan resmi tercatat di sistem koperasi</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
