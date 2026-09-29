'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  Receipt,
  CreditCard,
  LogOut,
  ChevronRight,
  ShoppingCart,
  Phone,
  Camera,
  Trash2,
  MessageCircle,
  Minus,
  Plus,
  ArrowLeft,
  AlertCircle,
  Building2,
  PackageCheck,
  Check,
  Loader2,
  Banknote,
  ClipboardList,
  RefreshCw,
  Clock,
  Truck,
  Store,
  Home,
  Boxes,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getCart, saveCart, clearCart } from '@/lib/cart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function UserProfileDropdown() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Follow Stats: Mengikuti & Diikuti
  const [followStats, setFollowStats] = useState<{ followingCount: number; followersCount: number }>({
    followingCount: 0,
    followersCount: 0,
  });

  const fetchFollowStats = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setFollowStats({
            followingCount: data.user.followingCount || 0,
            followersCount: data.user.followersCount || 0,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching follow stats:', e);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchFollowStats();
    }
  }, [user, fetchFollowStats]);

  useEffect(() => {
    if (isOpen) {
      fetchFollowStats();
    }
  }, [isOpen, fetchFollowStats]);

  // Multi-step Checkout States (Hanya Cash di Koperasi & Ambil di Gudang Koperasi)
  const DEFAULT_PICKUP_LOCATION =
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara';
  const [cartStep, setCartStep] = useState<'CART' | 'CHECKOUT' | 'SUCCESS'>('CART');
  const [paymentMethod] = useState<'CASH_KOPERASI'>('CASH_KOPERASI');
  const [pickupLocation, setPickupLocation] = useState(DEFAULT_PICKUP_LOCATION);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderResult, setCreatedOrderResult] = useState<any | null>(null);

  // Ambil alamat dinamis kantor & gudang koperasi yang diatur oleh Admin
  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alamat) {
          setPickupLocation(data.alamat);
        }
      })
      .catch(() => {});
  }, [activeModal]);

  // Sync cart from localStorage (terisolasi per akun pengguna)
  const syncCart = useCallback(() => {
    try {
      const items = getCart(user);
      setCartItems(items);
      const totalQty = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0);
      setCartCount(totalQty);
    } catch {
      setCartItems([]);
      setCartCount(0);
    }
  }, [user]);

  const [adminPhone, setAdminPhone] = useState<string>('081944078924');

  // Fetch nomor kontak pengurus/admin koperasi aktif
  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data?.adminContact?.phone) {
          setAdminPhone(data.adminContact.phone);
        }
      })
      .catch((err) => console.error('Error fetching admin phone:', err));
  }, []);

  useEffect(() => {
    syncCart();
    const handleCartEvent = () => syncCart();
    window.addEventListener('cart-updated', handleCartEvent);
    return () => window.removeEventListener('cart-updated', handleCartEvent);
  }, [syncCart]);

  useEffect(() => {
    if (activeModal === 'cart') {
      setCartStep('CART');
      setOrderError(null);
    }
  }, [activeModal]);

  // Update kuantitas produk di dalam keranjang
  const updateCartItemQty = (idx: number, delta: number) => {
    const updated = [...cartItems];
    const currentQty = Number(updated[idx].quantity) || 1;
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      updated.splice(idx, 1);
    } else {
      updated[idx].quantity = newQty;
    }
    saveCart(updated, user);
    syncCart();
  };

  // Submit pesanan resmi ke API Koperasi
  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      const itemsPayload = cartItems.map((item) => ({
        productId: item.id,
        quantity: Number(item.quantity) || 1,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'CASH_KOPERASI',
          alamatKirim: pickupLocation,
          catatan: orderNotes,
          items: itemsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan ke sistem koperasi');
      }

      setCreatedOrderResult(data.order);
      setCartStep('SUCCESS');

      // Bersihkan keranjang belanja akun ini
      clearCart(user);
      syncCart();
    } catch (err: any) {
      console.error(err);
      setOrderError(err.message || 'Terjadi gangguan saat memproses pesanan.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Kirim Konfirmasi WhatsApp Pesanan Resmi ke Admin Koperasi
  const handleSendWhatsAppConfirmation = (orderData: any) => {
    const rawPhone = adminPhone || '081944078924';
    const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');

    const itemsText = (orderData.items || [])
      .map(
        (item: any, idx: number) =>
          `${idx + 1}. *${item.product?.nama || item.nama}*\n   • Jumlah: ${item.quantity} ${item.product?.satuan || item.satuan || 'unit'}\n   • Subtotal: Rp ${(
            Number(item.hargaPerSatuan || item.subtotal || 0) * (item.quantity ? 1 : 1)
          ).toLocaleString('id-ID')}`
      )
      .join('\n\n');

    const paymentText = '💵 Bayar Tunai (Cash) di Kantor Koperasi';

    const message = `Halo Pengurus Koperasi Sinar Pagi Sejahtera,
Saya telah membuat *Pesanan Resmi* melalui Toko Online Koperasi:

*No. Pesanan:* #${orderData.orderNumber}
*Metode Pembayaran:* ${paymentText}
*Total Tagihan:* Rp ${Number(orderData.totalAmount).toLocaleString('id-ID')}
*Lokasi Pengambilan:* ${pickupLocation}
*Catatan:* ${orderData.catatan || '-'}

*Data Pemesan:*
• Nama: ${user?.name || '-'}
• No. HP: ${user?.phone || '-'}
• Email: ${user?.email || '-'}

*Daftar Komoditas:*
${itemsText}

Mohon dipersiapkan di gudang koperasi dan dikonfirmasi ketersediaannya. Terima kasih!`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const displayRole = user.role === 'PETANI' ? 'PETANI' : 'PEMBELI';
  const registeredDate = '22 September 2026';

  const cartTotalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.hargaPerSatuan) * Number(item.quantity),
    0
  );

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2.5" ref={dropdownRef}>
        {/* Tombol Keranjang Belanja */}
        <Link
          href="/cart"
          prefetch={true}
          className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 flex items-center justify-center transition border border-slate-200 cursor-pointer shadow-2xs group"
          title="Keranjang Belanja"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 group-hover:scale-110 transition-transform" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500 text-white font-bold text-[8px] sm:text-[10px] flex items-center justify-center shadow-xs ring-2 ring-white">
              {cartCount}
            </span>
          )}
        </Link>

        {/* Profile Trigger Pill - Hanya di Desktop (>= lg), di mobile & tablet sudah ada di BottomNav */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden lg:flex items-center gap-1.5 sm:gap-2.5 p-0.5 sm:p-1 sm:pr-3 rounded-full border border-slate-200 hover:border-emerald-500/50 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs group"
          type="button"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>

          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-800 leading-tight group-hover:text-emerald-800 transition">
              {user.name}
            </div>
            <div className="text-[10px] font-bold text-emerald-700 tracking-wider">
              {displayRole}
            </div>
          </div>

          <div className="text-slate-400 group-hover:text-slate-700 transition pr-1">
            {isOpen ? <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </div>
        </button>

        {/* Dropdown Card */}
        {isOpen && (
          <div className="absolute right-3 sm:right-6 top-16 sm:top-20 z-50 w-[320px] sm:w-[350px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Dark Forest Green Header - Klik mengarah langsung ke halaman /profile */}
            <div
              onClick={() => {
                setIsOpen(false);
                router.push('/profile');
              }}
              className="bg-[#1b4332] hover:bg-[#16382a] text-white p-5 relative overflow-hidden cursor-pointer transition"
              title="Buka Halaman Profil Saya"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl" />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-extrabold text-xl shadow-md overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs ring-2 ring-[#1b4332]">
                    <CheckCircle2 className="w-3.5 h-3.5 fill-amber-500 text-white" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 backdrop-blur-xs text-[11px] font-bold text-emerald-100 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{displayRole}</span>
                </div>
              </div>

              <div className="relative z-10 mb-4">
                <h3 className="text-base font-bold tracking-tight text-white leading-tight flex items-center gap-1.5">
                  <span>{user.name}</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-80" />
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 mt-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>{user.phone || '+62 812-4455-6677'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/90 mt-1 max-w-[270px]">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                  <span className="truncate" title={user.address || 'Minahasa Utara, Sulawesi Utara'}>
                    {user.address || 'Minahasa Utara, Sulawesi Utara'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-emerald-700/60 flex items-center justify-between text-xs text-emerald-100/90 relative z-10">
                <span className="text-[11px] text-emerald-300/80 font-medium">Terdaftar</span>
                <span className="font-bold text-xs text-emerald-100">{registeredDate}</span>
              </div>

              {/* Status Mengikuti & Pengikut */}
              {user.role === 'PETANI' ? (
                <div className="mt-2 pt-2 border-t border-emerald-700/40 flex items-center justify-between text-xs text-emerald-100/90 relative z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      router.push('/toko/mengikuti');
                    }}
                    className="flex items-center gap-1.5 hover:text-white transition group cursor-pointer"
                    title="Lihat daftar petani yang diikuti"
                  >
                    <span className="text-[11px] text-emerald-300/80 group-hover:text-emerald-200 font-medium">Mengikuti:</span>
                    <span className="font-bold text-xs text-emerald-100 group-hover:underline">{followStats.followingCount}</span>
                  </button>
                  <span className="text-emerald-500/60">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-emerald-300/80 font-medium">Pengikut:</span>
                    <span className="font-bold text-xs text-emerald-100">{followStats.followersCount}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-emerald-700/40 flex items-center justify-between text-xs text-emerald-100/90 relative z-10">
                  <span className="text-[11px] text-emerald-300/80 font-medium">Mengikuti:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      router.push('/toko/mengikuti');
                    }}
                    className="font-bold text-xs text-emerald-100 hover:text-white hover:underline transition cursor-pointer flex items-center gap-1 group"
                    title="Lihat daftar petani yang Anda ikuti"
                  >
                    <span>{followStats.followingCount} Petani</span>
                    <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>

            {/* Menu List - Tanpa Monitoring Pesanan (karena pesanan sudah ada di navbar), profil mengarah ke halaman sendiri /profile */}
            <div className="p-3.5 space-y-1">
              {user.role === 'PETANI' && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/dashboard');
                  }}
                  className="w-full p-2.5 rounded-2xl hover:bg-emerald-50/70 bg-emerald-50/30 flex items-center justify-between group transition cursor-pointer text-left border border-emerald-100"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Dashboard Petani</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">Mitra</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Pantau stok panen & cash di kasir</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/profile');
                }}
                className="w-full p-2.5 rounded-2xl hover:bg-slate-50 flex items-center justify-between group transition cursor-pointer text-left"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Halaman Profil Saya</div>
                    <div className="text-[11px] text-slate-400">Kelola identitas, foto profil & kontak domisili</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveModal('pembayaran');
                }}
                className="w-full p-2.5 rounded-2xl hover:bg-slate-50 flex items-center justify-between group transition cursor-pointer text-left"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Metode Pembayaran</div>
                    <div className="text-[11px] text-slate-400">Kas Koperasi & Rekening Resmi</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
              </button>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full p-2.5 rounded-2xl hover:bg-red-50 text-red-600 flex items-center justify-center gap-2 font-semibold text-xs transition cursor-pointer"
                  type="button"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Modal for Selected Menu Item */}
      <Dialog open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className={`${activeModal === 'riwayat' ? 'sm:max-w-2xl' : 'sm:max-w-lg'} rounded-3xl p-5 sm:p-6 bg-white border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto`}>
          {/* ======================================================== */}
          {/* MODAL 1: KERANJANG BELANJA & MULTI-STEP CHECKOUT        */}
          {/* ======================================================== */}
          {activeModal === 'cart' && (
            <div>
              {/* STEP 1: CART VIEW */}
              {cartStep === 'CART' && (
                <div>
                  <DialogHeader className="text-left mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                          Keranjang Belanja Koperasi
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-0.5">
                          {cartItems.length > 0
                            ? `${cartCount} komoditas siap dipesan dari gudang Koperasi.`
                            : 'Keranjang belanja Anda saat ini masih kosong.'}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  {cartItems.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="font-semibold text-slate-600">Belum ada komoditas di keranjang</p>
                      <p className="text-[11px] mt-0.5">Pilih produk komoditas pada katalog toko online untuk mulai berbelanja.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 my-3">
                      {cartItems.map((item, idx) => {
                        const itemTotal = Number(item.hargaPerSatuan) * Number(item.quantity);
                        return (
                          <div
                            key={item.id || idx}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-11 h-11 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                                <img
                                  src={
                                    item.imageUrl ||
                                    'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=200&q=80'
                                  }
                                  alt={item.nama}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 truncate">{item.nama}</div>
                                <div className="text-slate-500 text-[11px] mt-0.5">
                                  Rp {Number(item.hargaPerSatuan).toLocaleString('id-ID')} /{item.satuan}
                                </div>
                                <div className="font-extrabold text-emerald-800 text-xs mt-0.5">
                                  Subtotal: Rp {itemTotal.toLocaleString('id-ID')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQty(idx, -1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                                  title="Kurangi kuantitas"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-xs font-bold text-slate-800">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQty(idx, 1)}
                                  className="w-6 h-6 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center transition cursor-pointer"
                                  title="Tambah kuantitas"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = cartItems.filter((_, i) => i !== idx);
                                  saveCart(updated, user);
                                  syncCart();
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer shrink-0"
                                title="Hapus item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs px-1">
                        <span className="text-slate-600 font-medium">Total Pembayaran ({cartCount} item):</span>
                        <span className="text-base font-black text-emerald-800">
                          Rp {cartTotalAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Buttons Cart */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                    {cartItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCartStep('CHECKOUT')}
                        className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        <span>Lanjut ke Checkout Pesanan Koperasi</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      {cartItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            clearCart(user);
                            syncCart();
                          }}
                          className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-red-600 rounded-xl font-semibold text-xs transition cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="flex-1 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                      >
                        Tutup Keranjang
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CHECKOUT FORM & PAYMENT SELECTION */}
              {cartStep === 'CHECKOUT' && (
                <div>
                  <DialogHeader className="text-left mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCartStep('CART')}
                        className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                          Checkout Pesanan Koperasi
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-0.5">
                          Semua pesanan masuk dan diproses langsung oleh Admin Koperasi.
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Informational banner koperasi satu pintu */}
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5 mb-3 text-xs">
                    <Building2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-slate-700 leading-relaxed text-[11px]">
                      <strong className="text-emerald-900">Sistem Satu Pintu Koperasi:</strong> Stok fisik di gudang akan otomatis dipotong. Pembeli membayar ke Admin Koperasi, dan keuntungan akan diserahkan tunai ke petani.
                    </div>
                  </div>

                  <div className="space-y-3.5 my-3 text-xs">
                    {/* Metode Pembayaran - Murni Tunai (Cash) di Koperasi */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
                        Metode Pembayaran *
                      </label>
                      <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500 bg-emerald-50/70 shadow-2xs">
                        <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 flex items-center justify-between">
                            <span>Bayar Tunai (Cash) di Koperasi</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                              Langsung di Tempat
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            Bayar langsung secara tunai kepada kasir/admin di kantor koperasi saat serah terima fisik barang.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lokasi Pengambilan - Murni Ambil di Kantor & Gudang Koperasi */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
                        Lokasi Pengambilan Komoditas *
                      </label>
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3 shadow-2xs">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                          <MapPin className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-slate-900 flex items-center justify-between">
                            <span>Kantor & Gudang Koperasi</span>
                            <span className="text-[10px] bg-slate-200/80 text-slate-700 font-semibold px-2 py-0.5 rounded">
                              Ambil di Tempat
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {pickupLocation}
                          </div>
                          <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                            ✓ Komoditas disiapkan dan diserahkan langsung oleh staf gudang koperasi.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Catatan Tambahan */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Catatan Khusus untuk Admin Koperasi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Contoh: Rencana ambil besok pagi jam 09:00, mohon dikemas karung..."
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    {/* Ringkasan Biaya */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                        <span>Total Komoditas:</span>
                        <span className="font-semibold text-slate-800">{cartCount} barang</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                        <span>Total Pembayaran:</span>
                        <span className="text-base text-emerald-800 font-black">
                          Rp {cartTotalAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {orderError && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{orderError}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCartStep('CART')}
                      disabled={isSubmittingOrder}
                      className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmOrder}
                      disabled={isSubmittingOrder}
                      className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Memproses ke Koperasi...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Konfirmasi & Buat Pesanan Resmi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SUCCESS STATE */}
              {cartStep === 'SUCCESS' && createdOrderResult && (
                <div className="text-center py-4">
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
                      <span className="font-bold text-amber-700">Menunggu Pembayaran</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Metode Bayar:</span>
                      <span className="font-semibold text-slate-800">
                        Tunai (Cash) di Kantor Koperasi
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lokasi Ambil:</span>
                      <span className="font-semibold text-slate-800">
                        Kantor & Gudang Koperasi
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5">
                      <span className="font-semibold text-slate-700">Total Tagihan:</span>
                      <span className="font-black text-emerald-800 text-sm">
                        Rp {Number(createdOrderResult.totalAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppConfirmation(createdOrderResult)}
                      className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-200" />
                      <span>Kirim Konfirmasi ke WhatsApp Admin Koperasi</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          router.push('/pesanan');
                        }}
                        className="flex-1 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                      >
                        Pantau di Halaman Pesanan
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs transition cursor-pointer"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODAL 3: METODE PEMBAYARAN KOPERASI                     */}
          {/* ======================================================== */}
          {activeModal === 'pembayaran' && (
            <div>
              <DialogHeader className="text-left mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                      Metode Pembayaran Koperasi
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      Pilihan kanal pembayaran resmi Koperasi Sinar Pagi Sejahtera.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 my-3 text-xs">
                {/* 1. Kas Tunai */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>💵 Pembayaran Tunai (Cash di Koperasi)</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pembeli menyerahkan uang tunai langsung ke kasir/admin di kantor koperasi pada saat serah terima barang.
                  </p>
                </div>

                {/* 2. Transfer Bank BRI */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      💳 Transfer Bank BRI (Rekening Resmi)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Aktif
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-500">Bank Rakyat Indonesia (BRI)</div>
                    <div className="font-mono text-sm font-bold text-slate-900">
                      0012-01-002891-53-0
                    </div>
                    <div className="text-[11px] font-medium text-slate-700">
                      a/n Koperasi Sinar Pagi Sejahtera
                    </div>
                  </div>
                </div>

                {/* 3. QRIS Koperasi */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      📱 QRIS Koperasi Sinar Pagi Sejahtera
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Dapat dipindai menggunakan seluruh aplikasi mobile banking (BCA, Mandiri, BRI, BNI) dan dompet digital (GoPay, OVO, Dana).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs transition cursor-pointer mt-2"
              >
                Tutup
              </button>
            </div>
          )}

          </DialogContent>
      </Dialog>
    </>
  );
}
