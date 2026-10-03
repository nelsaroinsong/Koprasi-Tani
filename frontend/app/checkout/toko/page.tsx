'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Calendar,
  Clock,
  User,
  Phone,
  Home,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  PackageCheck,
  Loader2,
  MessageCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getCart, clearCart, type CartItem } from '@/lib/cart';

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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        <AppHeader activePage="toko" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">
            Mempersiapkan halaman konfirmasi pesanan...
          </p>
        </div>
      </div>
    );
  }

  // Tampilan Sukses Checkout
  if (createdOrderResult) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        <AppHeader activePage="toko" />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <PackageCheck className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
                Menunggu Pembayaran Kasir Koperasi
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 tracking-tight">
                Pesanan Berhasil Dicatat!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                Nomor pesanan resmi Anda adalah{' '}
                <strong className="text-emerald-900 font-mono text-sm sm:text-base">
                  #{createdOrderResult.orderNumber}
                </strong>
                . Komoditas sedang disiapkan oleh staf gudang koperasi.
              </p>
            </div>

            {/* Rincian Singkat Pesanan */}
            <div className="max-w-lg mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 text-left text-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Total Tagihan Tunai</span>
                <span className="text-base font-black text-emerald-900">
                  Rp {Number(createdOrderResult.totalAmount).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 shrink-0">Lokasi Serah Terima:</span>
                <span className="font-semibold text-slate-800 text-right">
                  {warehouseAddress}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Metode Pembayaran:</span>
                <span className="font-semibold text-emerald-800">
                  Bayar Tunai di Kasir Koperasi
                </span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSendWhatsAppConfirmation(createdOrderResult)}
                className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-100" />
                <span>Konfirmasi ke WhatsApp Admin</span>
              </button>

              <Link
                href="/pesanan"
                className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition"
              >
                <span>Lihat Status Pesanan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="pt-2">
              <Link
                href="/toko"
                className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
        <AppHeader activePage="toko" />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Keranjang Belanja Anda Kosong</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            Tidak ada komoditas pertanian yang sedang dipilih untuk checkout konfirmasi.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/cart"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
            >
              Buka Keranjang Saya
            </Link>
            <Link
              href="/toko"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
            >
              Belanja di Toko Online
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <AppHeader activePage="toko" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Link href="/" className="hover:text-emerald-700 transition">
            Beranda
          </Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-emerald-700 transition">
            Keranjang Belanja
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-bold">Konfirmasi Pesanan Toko Online</span>
        </nav>

        {/* Page Title */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                Halaman Checkout Resmi
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Konfirmasi Pesanan & Pengambilan Komoditas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Periksa rincian komoditas, lokasi titik serah terima gudang, dan instruksi bayar tunai di kasir.
            </p>
          </div>

          <Link
            href="/cart?tab=toko"
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ubah Keranjang</span>
          </Link>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Kolom Kiri: Detail Informasi & Form Luas (7-8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* 1. Titik Pengambilan Resmi Gudang Koperasi */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Titik Serah Terima Resmi Koperasi
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Lokasi fisik pengambilan komoditas dan loket kasir koperasi
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-slate-800 font-semibold">
                    {warehouseAddress}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jam Layanan: <strong>08:00 - 17:00 WITA</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kontak Kasir/Admin: <strong>{adminPhone}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Data Pemesan & Domisili Anggota */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Informasi Pembeli / Anggota
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Data identitas untuk verifikasi staf kasir saat pengambilan
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Nama Lengkap</div>
                  <div className="font-bold text-slate-900 mt-0.5">{user?.name || '-'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{user?.email || '-'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Alamat Domisili</div>
                  <div className="font-semibold text-slate-800 mt-0.5 leading-snug">
                    {user?.address || 'Belum diisi di profil pengguna'}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Metode Pembayaran Kasir */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Metode Pembayaran
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sistem serah terima resmi Koperasi Sinar Pagi Sejahtera
                  </p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-2xl flex items-start gap-3">
                <Banknote className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-950 flex items-center gap-2">
                    <span>Tunai (Cash) di Kasir Gudang Koperasi</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-black">
                      Bebas Biaya Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                    Pembayaran dilakukan secara tunai langsung kepada kasir koperasi pada saat fisik komoditas diserahkan dan ditimbang/dicek bersama.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Rincian Komoditas Yang Dipesan */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Daftar Komoditas Dipesan
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {totalItemsCount} satuan barang ({cartItems.length} macam komoditas)
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-3 flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.nama}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 text-xl font-bold shadow-2xs">
                        🌾
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.nama}
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.quantity} {item.satuan || 'unit'} × Rp{' '}
                        {Number(item.hargaPerSatuan).toLocaleString('id-ID')}
                      </div>
                      {item.petaniName && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Mitra: {item.petaniName}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400 font-medium">Subtotal</div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                        Rp {(Number(item.hargaPerSatuan) * (item.quantity || 1)).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Catatan Pengambilan (Opsional) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-3">
              <label className="block font-bold text-slate-800 text-xs sm:text-sm">
                Catatan Pengambilan (Opsional)
              </label>
              <textarea
                rows={3}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Barang akan diambil oleh driver pikap warna hitam sekitar pukul 14:00 WITA..."
                className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-slate-800 placeholder:text-slate-400 transition"
              />
            </div>
          </div>

          {/* Kolom Kanan: Ringkasan Sticky & SlideCommit (4-5 cols) */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Ringkasan Transaksi</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Resmi Koperasi
                </span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Kuantitas</span>
                  <span className="font-semibold text-slate-900">
                    {totalItemsCount} Satuan ({cartItems.length} Jenis)
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Metode Pembayaran</span>
                  <span className="font-semibold text-emerald-800">
                    Tunai Kas Koperasi
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Lokasi Serah Terima</span>
                  <span className="font-semibold text-slate-800">
                    Gudang Koperasi
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Penanganan</span>
                  <span className="font-semibold text-emerald-700">Rp 0 (Gratis)</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-700">Total Tagihan Kasir:</span>
                <span className="text-lg sm:text-xl font-black text-emerald-900 tracking-tight">
                  Rp {finalTotalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              {orderError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              <div className="pt-2">
                <SlideCommit
                  label="Geser untuk Buat Pesanan Resmi"
                  onConfirm={handleConfirmOrder}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Transaksi sah terdaftar di sistem koperasi</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
