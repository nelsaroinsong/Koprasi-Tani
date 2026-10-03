'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  Tractor,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Phone,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wrench,
  Loader2,
  Check,
  X,
  MessageCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  Info,
  LayoutGrid,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { EquipmentItem } from '@/lib/equipments';
import initialEquipmentsData from '@/data/equipments.json';
import {
  getRentalCart,
  addToRentalCart,
  updateRentalCartItem,
  removeRentalCartItem,
  clearRentalCart,
  calculateRentalCartTotal,
  calculateRentalItemTotal,
  type RentalCartItem,
} from '@/lib/rental-cart';

const KATEGORI_TABS = [
  {
    key: 'SEMUA',
    label: 'Semua Alat',
    pillLabel: 'Semua Alat',
    emoji: '🚜',
    mobileBg: 'bg-emerald-700 text-white shadow-xs',
  },
  {
    key: 'Traktor & Pengolah Lahan',
    label: 'Traktor',
    pillLabel: 'Traktor & Lahan',
    emoji: '🚜',
    mobileBg: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border border-amber-300/60',
  },
  {
    key: 'Mesin Panen & Perontok',
    label: 'Panen',
    pillLabel: 'Mesin Panen',
    emoji: '🌽',
    mobileBg: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border border-amber-300/60',
  },
  {
    key: 'Penyemprot & Pemupukan',
    label: 'Semprot',
    pillLabel: 'Drone & Semprot',
    emoji: '💧',
    mobileBg: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 border border-blue-300/60',
  },
  {
    key: 'Pascapanen & Pengolahan',
    label: 'Pascapanen',
    pillLabel: 'Pascapanen',
    emoji: '⚙️',
    mobileBg: 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-900 border border-emerald-300/60',
  },
];

export default function SewaAlatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // State Data (Instant rendering dengan initial data dari seed lokal)
  const [equipments, setEquipments] = useState<EquipmentItem[]>(
    (initialEquipmentsData as EquipmentItem[]) || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Keranjang Sewa Multi-Alat State
  const [rentalCart, setRentalCart] = useState<RentalCartItem[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [cartStartDate, setCartStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [cartLokasiLahan, setCartLokasiLahan] = useState('');
  const [cartCatatan, setCartCatatan] = useState('');
  const [isSubmittingCart, setIsSubmittingCart] = useState(false);

  // Quick Booking Modal State (Shortcut dari card)
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [durasi, setDurasi] = useState('1');
  const [jumlahUnit, setJumlahUnit] = useState(1);
  const [includeOperator, setIncludeOperator] = useState(false);
  const [lokasiLahan, setLokasiLahan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessResult, setBookingSuccessResult] = useState<{
    rentalCode: string;
    waUrl: string;
    totalEstimasi: number;
  } | null>(null);

  // Sync Keranjang Sewa dari LocalStorage
  const refreshCart = useCallback(() => {
    setRentalCart(getRentalCart());
  }, []);

  useEffect(() => {
    refreshCart();
    window.addEventListener('rental-cart-updated', refreshCart);
    return () => {
      window.removeEventListener('rental-cart-updated', refreshCart);
    };
  }, [refreshCart]);

  useEffect(() => {
    if (user?.address) {
      setCartLokasiLahan(user.address);
      setLokasiLahan(user.address);
    }
  }, [user]);

  // Fetch Equipments from API
  const fetchEquipments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/equipments');
      const data = await res.json();
      if (res.ok && Array.isArray(data.equipments)) {
        setEquipments(data.equipments);
      }
    } catch (err) {
      console.error('Error fetching equipments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [fetchEquipments]);

  // Filter Data
  const filteredEquipments = useMemo(() => {
    return equipments.filter((item) => {
      const matchKategori = selectedKategori === 'SEMUA' || item.kategori === selectedKategori;
      const matchAvailable = !onlyAvailable || item.isTersedia;
      const matchSearch =
        !searchQuery.trim() ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchKategori && matchAvailable && matchSearch;
    });
  }, [equipments, selectedKategori, onlyAvailable, searchQuery]);

  // Buka Modal Booking Cepat (Dengan Validasi Auth)
  const handleOpenBooking = (item: EquipmentItem) => {
    if (!user) {
      showToast({
        title: 'Perlu Masuk Akun',
        message: 'Silakan masuk akun terlebih dahulu untuk mengajukan sewa alat.',
        type: 'info',
      });
      router.push('/login?callbackUrl=/sewa-alat');
      return;
    }

    if (user.role === 'PETANI' && !user.isVerified) {
      showToast({
        title: 'Akun Petani Perlu Verifikasi',
        message: 'Akun Petani Anda sedang dalam antrean verifikasi pengurus koperasi.',
        type: 'warning',
      });
      router.push('/verifikasi-petani');
      return;
    }

    if (!user.isOnboarded && user.role !== 'ADMIN') {
      router.push('/onboarding');
      return;
    }

    setSelectedEquipment(item);
    setBookingSuccessResult(null);
    setStartDate(new Date().toISOString().split('T')[0]);
    setDurasi('1');
    setJumlahUnit(1);
    setIncludeOperator(false);
    setLokasiLahan(user?.address || '');
    setCatatan('');
    setIsBookingOpen(true);
  };

  // Tambahkan Unit dari Modal Cepat ke Keranjang Multi-Alat
  const handleAddQuickToCart = () => {
    if (!selectedEquipment) return;
    addToRentalCart({
      equipmentId: selectedEquipment.id,
      nama: selectedEquipment.nama,
      kategori: selectedEquipment.kategori,
      hargaSewa: selectedEquipment.hargaSewa,
      satuanSewa: selectedEquipment.satuanSewa,
      biayaOperator: selectedEquipment.biayaOperator,
      includeOperator,
      stokUnit: selectedEquipment.stokUnit,
      jumlahUnit,
      durasi: Number(durasi) || 1,
      imageUrl: selectedEquipment.imageUrl,
      kontakPj: selectedEquipment.kontakPj,
    });
    setIsBookingOpen(false);
    showToast({
      title: 'Ditambahkan ke Keranjang Sewa',
      message: `${jumlahUnit} unit ${selectedEquipment.nama} berhasil dimasukkan. Anda dapat memilih alat lainnya.`,
      type: 'success',
    });
  };

  // Hitung Total Estimasi Biaya Modal Cepat
  const calculatedTotal = useMemo(() => {
    if (!selectedEquipment) return 0;
    const durasiNumber = Math.max(1, Number(durasi) || 1);
    const qty = Math.max(1, Number(jumlahUnit) || 1);
    const hargaDasar = selectedEquipment.hargaSewa * durasiNumber * qty;
    const biayaOperatorTotal =
      includeOperator && selectedEquipment.biayaOperator
        ? selectedEquipment.biayaOperator * durasiNumber * qty
        : 0;
    return hargaDasar + biayaOperatorTotal;
  }, [selectedEquipment, durasi, jumlahUnit, includeOperator]);

  // Submit Booking Cepat (Single Unit)
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;

    if (!startDate) {
      showToast({
        title: 'Tanggal Belum Dipilih',
        message: 'Silakan pilih tanggal rencana penggunaan alat.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmittingBooking(true);
      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipment.id,
          startDate,
          durasi: Number(durasi) || 1,
          jumlahUnit,
          includeOperator,
          lokasiLahan,
          catatan,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookingSuccessResult({
          rentalCode: data.rentalCode,
          waUrl: data.waUrl,
          totalEstimasi: data.totalEstimasi,
        });
        showToast({
          title: 'Pengajuan Siap',
          message: 'Detail booking telah disiapkan. Silakan kirim pesan ke WhatsApp PJ Koperasi.',
          type: 'success',
        });
      } else {
        showToast({
          title: 'Gagal Mengajukan Sewa',
          message: data.error || 'Terjadi gangguan saat memproses booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Kesalahan Sistem',
        message: 'Gagal mengajukan sewa alat pertanian.',
        type: 'error',
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Submit Booking Multi-Alat dari Keranjang Sewa
  const handleSubmitMultiCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rentalCart.length === 0) return;

    if (!user) {
      showToast({
        title: 'Perlu Masuk Akun',
        message: 'Silakan login terlebih dahulu untuk mengajukan sewa.',
        type: 'info',
      });
      router.push('/login?callbackUrl=/sewa-alat');
      return;
    }

    try {
      setIsSubmittingCart(true);
      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: cartStartDate,
          lokasiLahan: cartLokasiLahan,
          catatan: cartCatatan,
          items: rentalCart.map((it) => ({
            equipmentId: it.equipmentId,
            durasi: it.durasi,
            jumlahUnit: it.jumlahUnit,
            includeOperator: it.includeOperator,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        clearRentalCart();
        setIsCartModalOpen(false);
        showToast({
          title: 'Pengajuan Multi-Sewa Berhasil!',
          message: `Pengajuan ${data.itemsCount} alat telah disiapkan. Mengalihkan ke WhatsApp pengurus...`,
          type: 'success',
        });
        if (data.waUrl) {
          window.open(data.waUrl, '_blank');
        }
      } else {
        showToast({
          title: 'Gagal Mengajukan Sewa',
          message: data.error || 'Gagal memproses pengajuan sewa multi-alat.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gangguan Jaringan',
        message: 'Terjadi kendala saat mengirim pengajuan sewa.',
        type: 'error',
      });
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const totalCartEstimasi = useMemo(() => {
    return calculateRentalCartTotal(rentalCart);
  }, [rentalCart]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Banner Hero / Title Bersih Rapi */}
        <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Tractor className="w-6 h-6 text-emerald-700" />
              <span>Sewa Alat Pertanian</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Penyewaan mesin dan alat pertanian modern untuk pengolahan lahan dan panen anggota Koperasi Sinar Pagi Sejahtera.
            </p>
          </div>

          {/* Tombol Buka Keranjang Sewa Multi-Alat */}
          {rentalCart.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Keranjang Sewa ({rentalCart.length} alat)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-white font-mono text-xs">
                Rp {totalCartEstimasi.toLocaleString('id-ID')}
              </span>
            </button>
          )}
        </div>

        {/* Filter Toolbar (Kategori, Search, Filter Ketersediaan) */}
        <div className="space-y-3 mb-6">
          {/* Scrollable Kategori Horizontal */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {KATEGORI_TABS.map((tab) => {
              const active = selectedKategori === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedKategori(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar & Toggle Ketersediaan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari traktor, kultivator, drone, pemipil..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
              />
              <span>Hanya yang Siap Pakai</span>
              <span className="text-[11px] text-slate-400">
                (Menampilkan {filteredEquipments.length} unit alat)
              </span>
            </label>
          </div>
        </div>

        {/* State Kosong / Grid Alat */}
        {filteredEquipments.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Tractor className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Tidak ada alat pertanian yang cocok
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
              Silakan gunakan kata kunci pencarian lain atau ubah filter kategori.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedKategori('SEMUA');
                setOnlyAvailable(false);
              }}
              className="py-2 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          /* Grid Sewa Alat - Klik Card Masuk ke Halaman Info Detail /sewa-alat/[id] */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5 md:gap-4">
            {filteredEquipments.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/sewa-alat/${item.id}`)}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer h-full"
                title={`Klik untuk melihat detail lengkap unit "${item.nama}"`}
              >
                <div>
                  {/* Top Image Section with Badges - Strict 1:1 Aspect Ratio */}
                  <div
                    className="relative aspect-square w-full shrink-0 bg-slate-100 overflow-hidden"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        item.imageUrl ||
                        'https://picsum.photos/seed/sewa-alat-koperasi/600/600'
                      }
                      alt={item.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://picsum.photos/seed/sewa-alat-koperasi/600/600';
                      }}
                    />

                    {/* Status Badge di Kanan Atas */}
                    <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-xs text-emerald-800 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 z-10">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isTersedia
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span>{item.isTersedia ? 'Ready' : 'Dipakai'}</span>
                    </div>

                    {/* Badge Kategori di Kiri Bawah */}
                    <div className="absolute bottom-1.5 left-1.5 bg-emerald-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs max-w-[80%] truncate z-10">
                      {item.kategori}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-2.5 sm:p-3 flex flex-col justify-between gap-1 sm:gap-1.5">
                    {/* Judul Alat */}
                    <h3
                      className="text-xs font-semibold text-slate-800 tracking-tight leading-tight line-clamp-2 h-[2.6em] group-hover:text-emerald-700 transition-colors"
                      title={item.nama}
                    >
                      {item.nama}
                    </h3>

                    {/* Harga Sewa */}
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                        Rp {Number(item.hargaSewa).toLocaleString('id-ID')}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 font-normal">
                        /{item.satuanSewa || 'hari'}
                      </span>
                    </div>

                    {/* Stok & Kondisi Unit */}
                    <div className="text-[9px] sm:text-[11px] text-slate-500 font-medium truncate">
                      Stok {item.stokUnit || 1} unit • {item.kondisi || 'Sangat Baik'}
                    </div>

                    {/* Operator Info */}
                    <div className="text-[10px] sm:text-xs font-bold text-slate-800 truncate">
                      {item.biayaOperator
                        ? `+Rp ${Number(item.biayaOperator).toLocaleString('id-ID')} operator`
                        : 'Operator mandiri / bebas'}
                    </div>
                  </div>
                </div>

                {/* Footer Action - Opsi Sewa Cepat & WhatsApp */}
                <div className="p-1.5 pt-0 sm:p-2 sm:pt-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBooking(item);
                    }}
                    disabled={!item.isTersedia}
                    className={`flex-1 py-1 px-1.5 sm:py-1.5 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs ${
                      item.isTersedia
                        ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>{item.isTersedia ? '+ Sewa Alat' : 'Sedang Dipakai'}</span>
                  </button>

                  {item.kontakPj && (
                    <a
                      href={`https://wa.me/${item.kontakPj
                        .replace(/\D/g, '')
                        .replace(/^0/, '62')}?text=${encodeURIComponent(
                        `Halo Pengurus Koperasi Sinar Pagi Sejahtera, saya ingin bertanya tentang ketersediaan sewa alat "${item.nama}".`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 sm:p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 text-emerald-700 transition flex items-center justify-center"
                      title="Tanya Pengurus via WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FLOATING ACTION BAR: Keranjang Sewa Multi-Alat (Muncul jika ada item di keranjang sewa) */}
      {rentalCart.length > 0 && (
        <aside
          aria-label="Keranjang Sewa Aktif"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg bg-slate-900/95 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{rentalCart.length} Jenis Alat Disewa</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-emerald-400 font-black">
                Total Estimasi: Rp {totalCartEstimasi.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              Lihat & Ajukan Sewa
            </button>
            <button
              type="button"
              onClick={clearRentalCart}
              className="p-2 text-slate-400 hover:text-red-400 transition cursor-pointer"
              title="Kosongkan Keranjang Sewa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* DIALOG 1: MODAL KERANJANG SEWA MULTI-ALAT */}
      <Dialog open={isCartModalOpen} onOpenChange={setIsCartModalOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-700" />
                <span>Keranjang Pengajuan Sewa ({rentalCart.length} Alat)</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {rentalCart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="font-semibold text-slate-600">Keranjang sewa Anda masih kosong</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Pilih alat dari katalog lalu tekan &quot;+ Sewa Alat&quot; atau tambahkan dari halaman info alat.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitMultiCart} className="space-y-4 text-xs mt-2">
              {/* Daftar Alat di Keranjang */}
              <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1">
                {rentalCart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.imageUrl ||
                              'https://picsum.photos/seed/sewa-alat-koperasi/100/100'
                            }
                            alt={item.nama}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs truncate">
                            {item.nama}
                          </h4>
                          <div className="text-[10px] text-slate-500">
                            Rp {item.hargaSewa.toLocaleString('id-ID')} / {item.satuanSewa}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeRentalCartItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                        title="Hapus dari Keranjang Sewa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stepper Jumlah Unit & Durasi */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Jumlah Unit:
                        </span>
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden w-fit">
                          <button
                            type="button"
                            onClick={() =>
                              updateRentalCartItem(item.id, {
                                jumlahUnit: Math.max(1, item.jumlahUnit - 1),
                              })
                            }
                            className="px-2 py-1 hover:bg-slate-100 text-slate-700 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-900 min-w-[28px] text-center">
                            {item.jumlahUnit}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateRentalCartItem(item.id, {
                                jumlahUnit: Math.min(
                                  item.stokUnit || 99,
                                  item.jumlahUnit + 1
                                ),
                              })
                            }
                            className="px-2 py-1 hover:bg-slate-100 text-slate-700 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Durasi ({item.satuanSewa}):
                        </span>
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden w-fit">
                          <button
                            type="button"
                            onClick={() =>
                              updateRentalCartItem(item.id, {
                                durasi: Math.max(1, item.durasi - 1),
                              })
                            }
                            className="px-2 py-1 hover:bg-slate-100 text-slate-700 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-900 min-w-[28px] text-center">
                            {item.durasi}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateRentalCartItem(item.id, {
                                durasi: item.durasi + 1,
                              })
                            }
                            className="px-2 py-1 hover:bg-slate-100 text-slate-700 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Checklist Operator Per Item */}
                    {item.biayaOperator ? (
                      <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.includeOperator}
                          onChange={(e) =>
                            updateRentalCartItem(item.id, {
                              includeOperator: e.target.checked,
                            })
                          }
                          className="w-3.5 h-3.5 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300"
                        />
                        <span>
                          Sertakan Kru Operator (+Rp{' '}
                          {item.biayaOperator.toLocaleString('id-ID')}/{item.satuanSewa})
                        </span>
                      </label>
                    ) : null}

                    {/* Subtotal Item */}
                    <div className="text-right text-[11px] font-bold text-emerald-900 pt-1">
                      Subtotal: Rp {calculateRentalItemTotal(item).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Lokasi & Tanggal Pemakaian Bersama */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mulai Tanggal Sewa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={cartStartDate}
                    onChange={(e) => setCartStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lokasi Lahan Kebun (Minahasa Utara)
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={cartLokasiLahan}
                      onChange={(e) => setCartLokasiLahan(e.target.value)}
                      placeholder="Contoh: Desa Kolongan, Kec. Kalawat"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Kebutuhan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    value={cartCatatan}
                    onChange={(e) => setCartCatatan(e.target.value)}
                    placeholder="Instruksi tambahan, implemen traktor yang dibutuhkan, jam kedatangan alat..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Total Estimasi Semua Alat */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-emerald-800 font-medium">
                    Total Estimasi ({rentalCart.length} Jenis Alat):
                  </div>
                  <div className="text-lg font-black text-emerald-950">
                    Rp {totalCartEstimasi.toLocaleString('id-ID')}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-700 bg-white px-2 py-1 rounded-lg border border-emerald-200 font-semibold">
                  Kas Tunai Koperasi
                </span>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCartModalOpen(false)}
                  className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
                >
                  Tutup & Tambah Lagi
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCart}
                  className="py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSubmittingCart ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyiapkan Pengajuan...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Ajukan Sewa Semua Alat</span>
                    </>
                  )}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: SHORTCUT QUICK BOOKING MODAL (DARI TOMBOL CARD) */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-emerald-700" />
                <span>Pengajuan Sewa Alat Pertanian</span>
              </div>
              {selectedEquipment && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingOpen(false);
                    router.push(`/sewa-alat/${selectedEquipment.id}`);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Halaman Info</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEquipment && !bookingSuccessResult && (
            <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs mt-2">
              {/* Info Unit Terpilih */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-emerald-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {selectedEquipment.imageUrl ? (
                    <img
                      src={selectedEquipment.imageUrl}
                      alt={selectedEquipment.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Tractor className="w-6 h-6 text-emerald-600 m-auto mt-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {selectedEquipment.nama}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                    Rp {selectedEquipment.hargaSewa.toLocaleString('id-ID')} / {selectedEquipment.satuanSewa}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Kondisi: {selectedEquipment.kondisi} • Stok: {selectedEquipment.stokUnit} unit
                  </div>
                </div>
              </div>

              {/* Tanggal, Durasi, dan Jumlah Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mulai Tanggal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Durasi ({selectedEquipment.satuanSewa})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durasi}
                    onChange={(e) => setDurasi(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jumlah Unit (Max: {selectedEquipment.stokUnit || 1})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedEquipment.stokUnit || 99}
                    required
                    value={jumlahUnit}
                    onChange={(e) =>
                      setJumlahUnit(
                        Math.max(
                          1,
                          Math.min(
                            selectedEquipment.stokUnit || 99,
                            Number(e.target.value) || 1
                          )
                        )
                      )
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold"
                  />
                </div>
              </div>

              {/* Opsi Layanan Operator */}
              {selectedEquipment.biayaOperator ? (
                <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOperator}
                      onChange={(e) => setIncludeOperator(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">
                        Gunakan Tenaga Operator Koperasi (+ Rp{' '}
                        {selectedEquipment.biayaOperator.toLocaleString('id-ID')} /{' '}
                        {selectedEquipment.satuanSewa})
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Disediakan kru terlatih koperasi untuk mengoperasikan mesin di lahan perkebunan Anda.
                      </div>
                    </div>
                  </label>
                </div>
              ) : null}

              {/* Lokasi Lahan Kebun */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lokasi Lahan Kebun (Minahasa Utara)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={lokasiLahan}
                    onChange={(e) => setLokasiLahan(e.target.value)}
                    placeholder="Contoh: Desa Kolongan, Kec. Kalawat"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Kebutuhan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Kebutuhan implemen bajak rotary, kondisi tanah berbatu, jam operasional..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Rincian Perhitungan Biaya */}
              <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>
                    Tarif Sewa Pokok ({jumlahUnit} unit × {durasi} {selectedEquipment.satuanSewa}):
                  </span>
                  <span className="font-semibold text-slate-800">
                    Rp{' '}
                    {(
                      selectedEquipment.hargaSewa *
                      (Number(durasi) || 1) *
                      jumlahUnit
                    ).toLocaleString('id-ID')}
                  </span>
                </div>

                {includeOperator && selectedEquipment.biayaOperator ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Jasa Operator ({jumlahUnit} unit × {durasi} {selectedEquipment.satuanSewa}):
                    </span>
                    <span className="font-semibold text-slate-800">
                      Rp{' '}
                      {(
                        selectedEquipment.biayaOperator *
                        (Number(durasi) || 1) *
                        jumlahUnit
                      ).toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Total Estimasi Sewa:</span>
                  <span className="font-black text-sm text-emerald-800">
                    Rp {calculatedTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleAddQuickToCart}
                  className="py-2.5 px-3.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>+ Tambah ke Keranjang Sewa (Banyak)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(false)}
                    className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {isSubmittingBooking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyiapkan...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        <span>Sewa Unit Ini</span>
                      </>
                    )}
                  </button>
                </div>
              </DialogFooter>
            </form>
          )}

          {/* Sukses Booking Dialog */}
          {bookingSuccessResult && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Pengajuan Sewa Siap Dikirim!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Kode Pengajuan: <span className="font-mono font-bold text-slate-800">{bookingSuccessResult.rentalCode}</span>
                <br />
                Total Estimasi: <span className="font-bold text-emerald-800">Rp {bookingSuccessResult.totalEstimasi.toLocaleString('id-ID')}</span>
              </p>
              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <a
                  href={bookingSuccessResult.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim ke WhatsApp Pengurus</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingOpen(false);
                    setBookingSuccessResult(null);
                  }}
                  className="py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
