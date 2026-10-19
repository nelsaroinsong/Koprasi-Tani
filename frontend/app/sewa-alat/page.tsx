'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import LocationMapPreview from '@/components/LocationMapPreview';
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

// Kategori akan dimuat dinamis dari data admin kelola kategori

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

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Fetch Kategori Sewa Alat dari Data Kelola Kategori Admin
  useEffect(() => {
    fetch('/api/admin/equipment-categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch((err) => console.error('Error fetching equipment categories:', err));
  }, []);

  // Daftar Tabs Kategori Dinamis sesuai Admin
  const dynamicKategoriTabs = useMemo(() => {
    const tabs = [{ key: 'SEMUA', label: 'Semua Alat' }];
    if (categories.length > 0) {
      categories.forEach((cat) => {
        tabs.push({
          key: cat.name,
          label: cat.name,
        });
      });
    } else {
      const unique = Array.from(new Set(equipments.map((e) => e.kategori).filter(Boolean)));
      unique.forEach((cat) => {
        tabs.push({ key: cat, label: cat });
      });
    }
    return tabs;
  }, [categories, equipments]);

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

  useEffect(() => {
    if (user?.address) {
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
      const matchKategori =
        selectedKategori === 'SEMUA' ||
        (item.kategori && item.kategori.toLowerCase().trim() === selectedKategori.toLowerCase().trim());
      const matchAvailable = !onlyAvailable || item.isTersedia;
      const matchSearch =
        !searchQuery.trim() ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchKategori && matchAvailable && matchSearch;
    });
  }, [equipments, selectedKategori, onlyAvailable, searchQuery]);

  // Masukkan langsung ke keranjang sewa multi-alat saat tombol '+ Sewa Alat' ditekan
  const handleAddToCartDirectly = (item: EquipmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isTersedia) return;
    addToRentalCart({
      equipmentId: item.id,
      nama: item.nama,
      kategori: item.kategori,
      hargaSewa: item.hargaSewa,
      satuanSewa: item.satuanSewa,
      biayaOperator: item.biayaOperator,
      includeOperator: false,
      stokUnit: item.stokUnit || 1,
      jumlahUnit: 1,
      durasi: 1,
      imageUrl: item.imageUrl,
      kontakPj: item.kontakPj,
    });
    showToast({
      title: 'Masuk Keranjang Sewa',
      message: `${item.nama} berhasil ditambahkan ke keranjang sewa alat!`,
      type: 'success',
    });
  };

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

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <AppHeader activePage="sewa-alat" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-12">
        {/* Header Title & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-3.5 sm:mb-5">
          <div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-[#1a2610] tracking-tight leading-tight">
              Sewa Alat Pertanian
            </h1>
            <p className="text-xs sm:text-[13px] text-[#526046] mt-1 max-w-2xl leading-relaxed">
              Penyewaan mesin dan alat pertanian modern untuk pengolahan lahan dan panen anggota Koperasi Sinar Pagi Sejahtera.
            </p>
          </div>

          <div className="relative w-full md:w-72 lg:w-80 shrink-0">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#68785b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari traktor, kultivator, drone, pemipil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 sm:h-10 pl-9 sm:pl-10 pr-8 text-xs sm:text-[13px] bg-white border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#68785b] focus:outline-none focus:border-[#233414] focus:ring-1 focus:ring-[#233414] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#EAEDE7] hover:bg-[#cfd6c9] text-[#233414] flex items-center justify-center transition-colors cursor-pointer"
                title="Bersihkan pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Kategori Navigation & Filter Status */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 mb-4 sm:mb-6 no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {dynamicKategoriTabs.map((tab) => {
              const active = selectedKategori.toLowerCase().trim() === tab.key.toLowerCase().trim();
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedKategori(tab.key)}
                  className={`h-8 sm:h-9 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-[13px] whitespace-nowrap transition-colors cursor-pointer border shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#233414] text-white border-[#233414] font-semibold'
                      : 'bg-white text-[#233414] hover:bg-[#EAEDE7] border-[#cfd6c9] font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] font-medium text-[#526046] hover:text-[#1a2610] cursor-pointer select-none shrink-0 ml-auto pl-2">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded accent-[#233414] text-[#233414] focus:ring-[#233414] border-[#cfd6c9] cursor-pointer"
            />
            <span className="text-[11px] sm:text-xs font-semibold">Hanya yang Siap Pakai</span>
          </label>
        </div>

        {/* State Kosong / Grid Alat */}
        {filteredEquipments.length === 0 ? (
          <div className="bg-white border border-[#dce1d6] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center justify-center min-h-[240px] sm:min-h-[300px]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] text-[#233414] flex items-center justify-center mb-3 sm:mb-4">
              <Tractor className="w-5 h-5 sm:w-6 sm:h-6 text-[#344d15]" />
            </div>
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-[#1a2610]">
              Tidak ada alat pertanian yang cocok
            </h3>
            <p className="text-xs sm:text-[13px] text-[#526046] mt-1 max-w-sm mb-4 leading-relaxed">
              Silakan gunakan kata kunci pencarian lain atau ubah filter kategori.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedKategori('SEMUA');
                setOnlyAvailable(false);
              }}
              className="py-2 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          /* Grid Sewa Alat - Klik Card Masuk ke Halaman Info Detail /sewa-alat/[id] */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 lg:gap-4">
            {filteredEquipments.map((item) => {
              const isOutOfStock = !item.isTersedia || (item.stokTersedia !== undefined && item.stokTersedia <= 0);
              const remainingStock = item.stokTersedia !== undefined ? item.stokTersedia : (item.isTersedia ? (item.stokUnit || 1) : 0);

              return (
                <article
                  key={item.id}
                  onClick={() => router.push(`/sewa-alat/${item.id}`)}
                  className={`border rounded-xl sm:rounded-2xl overflow-hidden transition-colors duration-150 flex flex-col justify-between group cursor-pointer h-full ${
                    isOutOfStock
                      ? 'bg-[#f4f5f1] border-[#d5dccf]'
                      : 'bg-white border-[#dce1d6] hover:border-[#344d15]'
                  }`}
                  title={
                    isOutOfStock
                      ? `Unit "${item.nama}" sedang disewa / stok kosong di koperasi`
                      : `Klik untuk melihat detail lengkap unit "${item.nama}"`
                  }
                >
                  <div>
                    {/* Top Image Section with Badges */}
                    <div className="relative aspect-square sm:aspect-[4/3] w-full shrink-0 bg-[#EAEDE7] overflow-hidden border-b border-[#EAEDE7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          item.imageUrl ||
                          'https://picsum.photos/seed/sewa-alat-koperasi/600/600'
                        }
                        alt={item.nama}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isOutOfStock ? 'grayscale opacity-75' : 'group-hover:scale-[1.03]'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://picsum.photos/seed/sewa-alat-koperasi/600/600';
                        }}
                      />

                      {/* Badge Kategori di Kiri Atas */}
                      <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 bg-[#233414] text-[#D4F63D] text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg max-w-[60%] truncate z-10">
                        {item.kategori}
                      </div>

                      {/* Status Badge di Kanan Atas */}
                      {isOutOfStock ? (
                        <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-[#ffedea] text-[#831c1e] text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg flex items-center gap-1 z-10 border border-red-200">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#c4242a]" />
                          <span>Disewa</span>
                        </div>
                      ) : (
                        <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-white text-[#1a2610] text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg flex items-center gap-1 z-10 border border-[#dce1d6]">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#547318]" />
                          <span>Ready ({remainingStock})</span>
                        </div>
                      )}
                    </div>

                    {/* Body Content */}
                    <div className="p-2.5 sm:p-3.5 lg:p-4 flex flex-col justify-between">
                      {/* Judul Alat */}
                      <h3
                        className={`text-xs sm:text-sm lg:text-[15px] font-bold tracking-tight leading-snug line-clamp-1 transition-colors ${
                          isOutOfStock ? 'text-[#68785b]' : 'text-[#1a2610] group-hover:text-[#344d15]'
                        }`}
                        title={item.nama}
                      >
                        {item.nama}
                      </h3>

                      {/* Harga Sewa */}
                      <div className="mt-1 sm:mt-1.5 flex items-baseline gap-0.5 sm:gap-1">
                        <span
                          className={`text-xs sm:text-[15px] lg:text-base font-extrabold tracking-tight tabular-nums ${
                            isOutOfStock ? 'text-[#68785b]' : 'text-[#233414]'
                          }`}
                        >
                          Rp {Number(item.hargaSewa).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] sm:text-xs text-[#5b6950] font-medium">
                          /{item.satuanSewa || 'hari'}
                        </span>
                      </div>

                      {/* Stok & Kondisi Unit + Operator Info */}
                      <div className="mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-[#EAEDE7] space-y-0.5 sm:space-y-1">
                        {isOutOfStock ? (
                          <div className="text-[10px] sm:text-xs font-semibold text-[#c4242a] truncate">
                            Stok Kosong • Sedang Disewa
                          </div>
                        ) : (
                          <div className="text-[10px] sm:text-xs text-[#526046] font-medium truncate tabular-nums">
                            Sisa {remainingStock} unit • {item.kondisi || 'Sangat Baik'}
                          </div>
                        )}

                        <div className="text-[10px] sm:text-xs font-semibold text-[#1a2610] truncate">
                          {item.biayaOperator
                            ? `+Rp ${Number(item.biayaOperator).toLocaleString('id-ID')} operator`
                            : 'Operator mandiri / bebas'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action - Tambah ke Keranjang Sewa & WhatsApp */}
                  <div className="px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5 lg:px-4 lg:pb-4 pt-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleAddToCartDirectly(item, e)}
                      disabled={isOutOfStock}
                      className={`flex-1 h-8 sm:h-9 lg:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        isOutOfStock
                          ? 'bg-[#EAEDE7] text-[#68785b] border border-[#cfd6c9] cursor-not-allowed'
                          : 'bg-[#233414] hover:bg-[#344d15] text-white cursor-pointer'
                      }`}
                      title={isOutOfStock ? 'Unit alat saat ini sedang disewa anggota lain' : 'Tambahkan alat ke keranjang sewa'}
                    >
                      <ShoppingCart
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                          isOutOfStock ? 'text-[#68785b]' : 'text-[#D4F63D]'
                        }`}
                      />
                      <span className="truncate">{isOutOfStock ? 'Sedang Disewa' : '+ Sewa Alat'}</span>
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
                        className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 shrink-0 rounded-lg sm:rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#EAEDE7] hover:border-[#233414] text-[#233414] transition-colors flex items-center justify-center"
                        title="Tanya Pengurus via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#344d15]" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* DIALOG 2: SHORTCUT QUICK BOOKING MODAL (DARI TOMBOL CARD) */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl bg-white border border-[#dce1d6]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1a2610] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-[#233414]" />
                <span>Pengajuan Sewa Alat Pertanian</span>
              </div>
              {selectedEquipment && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingOpen(false);
                    router.push(`/sewa-alat/${selectedEquipment.id}`);
                  }}
                  className="text-xs font-semibold text-[#233414] hover:text-[#344d15] hover:underline flex items-center gap-1 cursor-pointer"
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
              <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-[#cfd6c9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {selectedEquipment.imageUrl ? (
                    <img
                      src={selectedEquipment.imageUrl}
                      alt={selectedEquipment.nama}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Tractor className="w-6 h-6 text-[#344d15] m-auto mt-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#1a2610] text-xs sm:text-sm truncate">
                    {selectedEquipment.nama}
                  </div>
                  <div className="text-[11px] text-[#233414] font-semibold mt-0.5 tabular-nums">
                    Rp {selectedEquipment.hargaSewa.toLocaleString('id-ID')} / {selectedEquipment.satuanSewa}
                  </div>
                  <div className="text-[10px] text-[#5b6950] font-medium">
                    Kondisi: {selectedEquipment.kondisi} • Stok: {selectedEquipment.stokUnit} unit
                  </div>
                </div>
              </div>

              {/* Tanggal, Durasi, dan Jumlah Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-[#1a2610] mb-1">
                    Mulai Tanggal <span className="text-[#c4242a]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a2610] mb-1">
                    Durasi ({selectedEquipment.satuanSewa})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durasi}
                    onChange={(e) => setDurasi(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a2610] mb-1">
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
                    className="w-full px-2.5 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Opsi Layanan Operator */}
              {selectedEquipment.biayaOperator ? (
                <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOperator}
                      onChange={(e) => setIncludeOperator(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#233414] text-[#233414] focus:ring-[#233414] border-[#cfd6c9] mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-[#1a2610]">
                        Gunakan Tenaga Operator Koperasi (+ Rp{' '}
                        {selectedEquipment.biayaOperator.toLocaleString('id-ID')} /{' '}
                        {selectedEquipment.satuanSewa})
                      </div>
                      <div className="text-[10px] text-[#526046] mt-0.5">
                        Disediakan kru terlatih koperasi untuk mengoperasikan mesin di lahan perkebunan Anda.
                      </div>
                    </div>
                  </label>
                </div>
              ) : null}

              {/* Lokasi Lahan Kebun dengan Preview Maps & Deteksi GPS */}
              <LocationMapPreview
                value={lokasiLahan}
                onChange={setLokasiLahan}
                required={false}
              />

              {/* Catatan Tambahan */}
              <div>
                <label className="block font-bold text-[#1a2610] mb-1">
                  Catatan Kebutuhan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Kebutuhan implemen bajak rotary, kondisi tanah berbatu, jam operasional..."
                  className="w-full px-3 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#68785b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414]"
                />
              </div>

              {/* Rincian Perhitungan Biaya */}
              <div className="p-3.5 rounded-2xl bg-[#f4f5f1] border border-[#dce1d6] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#526046]">
                  <span>
                    Tarif Sewa Pokok ({jumlahUnit} unit × {durasi} {selectedEquipment.satuanSewa}):
                  </span>
                  <span className="font-semibold text-[#1a2610] tabular-nums">
                    Rp{' '}
                    {(
                      selectedEquipment.hargaSewa *
                      (Number(durasi) || 1) *
                      jumlahUnit
                    ).toLocaleString('id-ID')}
                  </span>
                </div>

                {includeOperator && selectedEquipment.biayaOperator ? (
                  <div className="flex items-center justify-between text-[11px] text-[#526046]">
                    <span>
                      Jasa Operator ({jumlahUnit} unit × {durasi} {selectedEquipment.satuanSewa}):
                    </span>
                    <span className="font-semibold text-[#1a2610] tabular-nums">
                      Rp{' '}
                      {(
                        selectedEquipment.biayaOperator *
                        (Number(durasi) || 1) *
                        jumlahUnit
                      ).toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-[#cfd6c9] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1a2610]">Total Estimasi Sewa:</span>
                  <span className="font-black text-sm text-[#233414] tabular-nums">
                    Rp {calculatedTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleAddQuickToCart}
                  className="py-2.5 px-3.5 rounded-xl border border-[#c9e39e] bg-[#e2f2c8] text-[#233414] hover:bg-[#d5ebae] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-[#233414]" />
                  <span>+ Tambah ke Keranjang Sewa (Banyak)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(false)}
                    className="py-2.5 px-3 border border-[#cfd6c9] bg-white hover:bg-[#EAEDE7] text-[#526046] rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="py-2.5 px-4 bg-[#233414] hover:bg-[#344d15] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingBooking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4F63D]" />
                        <span>Menyiapkan...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
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
              <div className="w-12 h-12 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1a2610]">
                Pengajuan Sewa Siap Dikirim!
              </h3>
              <p className="text-xs text-[#526046] max-w-sm mx-auto">
                Kode Pengajuan: <span className="font-mono font-bold text-[#1a2610]">{bookingSuccessResult.rentalCode}</span>
                <br />
                Total Estimasi: <span className="font-bold text-[#233414] tabular-nums">Rp {bookingSuccessResult.totalEstimasi.toLocaleString('id-ID')}</span>
              </p>
              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <a
                  href={bookingSuccessResult.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
                  <span>Kirim ke WhatsApp Pengurus</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingOpen(false);
                    setBookingSuccessResult(null);
                  }}
                  className="py-2 text-xs font-semibold text-[#5b6950] hover:text-[#1a2610] transition-colors cursor-pointer"
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
