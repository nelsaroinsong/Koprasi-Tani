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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader activePage="sewa-alat" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        {/* Header Title & Search Toolbar (Mirip dengan Toko Online) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-3.5 sm:mb-5">
          <div>
            <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Sewa Alat Pertanian
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-2xl">
              Penyewaan mesin dan alat pertanian modern untuk pengolahan lahan dan panen anggota Koperasi Sinar Pagi Sejahtera.
            </p>
          </div>

          <div className="relative w-full md:w-72 lg:w-80 shrink-0">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari traktor, kultivator, drone, pemipil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Kategori Navigation & Filter Status (Tepat di bawah title seperti Toko Online) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 mb-4 sm:mb-5 no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {dynamicKategoriTabs.map((tab) => {
              const active = selectedKategori.toLowerCase().trim() === tab.key.toLowerCase().trim();
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedKategori(tab.key)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shadow-2xs shrink-0 ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer select-none shrink-0 ml-auto pl-2">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
            />
            <span className="text-[11px] sm:text-xs">Hanya yang Siap Pakai</span>
          </label>
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

                {/* Footer Action - Tambah ke Keranjang Sewa & WhatsApp */}
                <div className="p-1.5 pt-0 sm:p-2 sm:pt-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleAddToCartDirectly(item, e)}
                    disabled={!item.isTersedia}
                    className={`flex-1 py-1 px-1.5 sm:py-1.5 sm:px-2 rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs ${
                      item.isTersedia
                        ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title={item.isTersedia ? 'Tambahkan alat ke keranjang sewa' : 'Unit sedang dipakai'}
                  >
                    <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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

              {/* Lokasi Lahan Kebun dengan Preview Maps & Deteksi GPS */}
              <LocationMapPreview
                value={lokasiLahan}
                onChange={setLokasiLahan}
                required={false}
              />

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
