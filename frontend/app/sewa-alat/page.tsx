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

const KATEGORI_TABS = [
  {
    key: 'SEMUA',
    label: 'Semua',
    pillLabel: 'Semua Alat',
    emoji: '🌾',
    mobileBg: 'bg-gradient-to-br from-emerald-600 to-[#183d2e] text-white',
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

  // Booking Modal State
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [durasi, setDurasi] = useState('1');
  const [includeOperator, setIncludeOperator] = useState(false);
  const [lokasiLahan, setLokasiLahan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessResult, setBookingSuccessResult] = useState<{
    rentalCode: string;
    waUrl: string;
    totalEstimasi: number;
  } | null>(null);

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

  // Buka Modal Booking (Dengan Validasi Auth)
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
    setIncludeOperator(false);
    setLokasiLahan(user?.address || '');
    setCatatan('');
    setIsBookingOpen(true);
  };

  // Hitung Total Estimasi Biaya
  const calculatedTotal = useMemo(() => {
    if (!selectedEquipment) return 0;
    const durasiNumber = Math.max(1, Number(durasi) || 1);
    const hargaDasar = selectedEquipment.hargaSewa * durasiNumber;
    const biayaOperatorTotal =
      includeOperator && selectedEquipment.biayaOperator
        ? selectedEquipment.biayaOperator * durasiNumber
        : 0;
    return hargaDasar + biayaOperatorTotal;
  }, [selectedEquipment, durasi, includeOperator]);

  // Submit Booking
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
      {/* App Header with Mobile Hamburger Menu */}
      <AppHeader activePage="sewa-alat" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        {/* Header Title & Intro - Bersih tanpa ikon dan tanpa badge subsidi */}
        <div className="mb-3.5 sm:mb-5">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
            Sewa Alat Mesin Pertanian
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            Penyewaan mesin dan alat pertanian modern untuk pengolahan lahan dan panen anggota koperasi Minahasa Utara.
          </p>
        </div>

        {/* Search, Filter Bar, & Quick Stats */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 mb-3 sm:mb-5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari traktor, kultivator, drone, pemipil..."
              className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-slate-700 font-semibold cursor-pointer select-none text-[11px] sm:text-xs">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span>Hanya yang Siap Pakai</span>
            </label>

            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              Menampilkan <strong className="text-slate-800">{filteredEquipments.length}</strong> unit alat
            </span>
          </div>
        </div>

        {/* 1. Category Navigation - Mobile Mode (Lingkaran Tokopedia-Style) */}
        <div className="block sm:hidden mb-3">
          <div className="flex items-start gap-1 overflow-x-auto pb-1 no-scrollbar">
            {KATEGORI_TABS.map((cat) => {
              const isSelected = selectedKategori === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedKategori(cat.key)}
                  className="flex flex-col items-center gap-1 shrink-0 w-16 group cursor-pointer focus:outline-none transition active:scale-95 py-0.5"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xs transition-all ${
                      cat.mobileBg
                    } ${
                      isSelected
                        ? 'ring-2 ring-emerald-600 ring-offset-2 scale-105 shadow-md'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {cat.key === 'SEMUA' ? (
                      <LayoutGrid className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-base leading-none">{cat.emoji}</span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] text-center leading-tight w-full truncate transition-colors ${
                      isSelected
                        ? 'font-bold text-emerald-800'
                        : 'font-medium text-slate-700 group-hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Category Navigation - Tablet & Desktop Mode (Pill Rounded-lg) */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {KATEGORI_TABS.map((cat) => {
            const isSelected = selectedKategori === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedKategori(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200'
                }`}
              >
                {cat.key === 'SEMUA' ? (
                  <LayoutGrid className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-700'}`} />
                ) : (
                  <span className="text-sm leading-none">{cat.emoji}</span>
                )}
                <span>{cat.pillLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-12 sm:py-20 flex flex-col items-center justify-center gap-2 sm:gap-3">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-700 animate-spin" />
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Memuat katalog sewa alat...</span>
          </div>
        ) : filteredEquipments.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center justify-center min-h-[220px] sm:min-h-[320px] shadow-2xs">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-100">
              <Tractor className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">Tidak ada alat pertanian yang cocok</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 max-w-sm mb-3">
              Silakan coba gunakan kata kunci lain atau pilih filter kategori lainnya.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedKategori('SEMUA');
                setOnlyAvailable(false);
              }}
              className="py-1.5 px-3.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          /* Grid Sewa Alat dengan Jarak Rapi dan Tidak Mepet di Mobile */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5 md:gap-4">
            {filteredEquipments.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenBooking(item)}
                className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer h-full"
              >
                <div>
                  {/* Top Image Section with Badges */}
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
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

                    {/* Kategori Badge di Kiri Atas */}
                    <div className="absolute top-1.5 left-1.5 bg-emerald-700/95 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs max-w-[70%] truncate">
                      {item.kategori}
                    </div>

                    {/* Status Badge di Kanan Atas */}
                    <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-xs text-emerald-800 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isTersedia ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      <span>{item.isTersedia ? 'Ready' : 'Dipakai'}</span>
                    </div>

                    {/* Bottom Badge: Alat Koperasi */}
                    <div className="absolute bottom-1.5 left-1.5 bg-[#183d2e]/90 text-white text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 backdrop-blur-xs">
                      <span>Alat Koperasi</span>
                    </div>
                  </div>

                  {/* Body Content - Berjarak Nyaman dan Rapi */}
                  <div className="p-2.5 sm:p-3 flex flex-col justify-between gap-1 sm:gap-1.5">
                    {/* Judul Alat */}
                    <h3
                      className="text-xs sm:text-xs font-semibold text-slate-800 tracking-tight leading-tight line-clamp-2 h-[2.6em] group-hover:text-emerald-700 transition-colors"
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

                {/* Footer Action - Compact Toko Online Style */}
                <div className="p-1.5 pt-0 sm:p-2 sm:pt-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBooking(item);
                    }}
                    disabled={!item.isTersedia}
                    className={`flex-1 py-1 px-1.5 sm:py-1.5 sm:px-2 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs ${
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
                      href={`https://wa.me/${item.kontakPj.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                        `Halo Pengurus Koperasi Sinar Pagi Sejahtera, saya ingin bertanya tentang ketersediaan sewa alat "${item.nama}".`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 sm:p-1.5 rounded-md sm:rounded-lg border border-slate-200 hover:bg-emerald-50 text-emerald-700 transition flex items-center justify-center"
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

      {/* Booking Form Modal */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-emerald-600" />
              <span>Pengajuan Sewa Alat Pertanian</span>
            </DialogTitle>
          </DialogHeader>

          {selectedEquipment && !bookingSuccessResult && (
            <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs mt-2">
              {/* Info Unit Terpilih */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 border border-emerald-100">
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

              {/* Tanggal & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mulai Tanggal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Durasi Pemakaian ({selectedEquipment.satuanSewa}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durasi}
                    onChange={(e) => setDurasi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
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
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">
                        Gunakan Tenaga Operator Koperasi (+ Rp {selectedEquipment.biayaOperator.toLocaleString('id-ID')} / {selectedEquipment.satuanSewa})
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
                  Lokasi Lahan Kebun (Desa/Kecamatan Minahasa Utara)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={lokasiLahan}
                    onChange={(e) => setLokasiLahan(e.target.value)}
                    placeholder="Contoh: Desa Kolongan, Kec. Kalawat (Kebun Jagung)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
                  placeholder="Kebutuhan traktor rotary, kondisi tanah berbatu, jam operasional..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Rincian Perhitungan Biaya */}
              <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>
                    Tarif Sewa Pokok ({durasi} {selectedEquipment.satuanSewa}):
                  </span>
                  <span className="font-semibold text-slate-800">
                    Rp {(selectedEquipment.hargaSewa * (Number(durasi) || 1)).toLocaleString('id-ID')}
                  </span>
                </div>

                {includeOperator && selectedEquipment.biayaOperator ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Jasa Operator ({durasi} {selectedEquipment.satuanSewa}):
                    </span>
                    <span className="font-semibold text-slate-800">
                      Rp {(selectedEquipment.biayaOperator * (Number(durasi) || 1)).toLocaleString('id-ID')}
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

              <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="py-2 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {isSubmittingBooking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyiapkan Booking...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Ajukan & Hubungi WhatsApp Pengurus</span>
                    </>
                  )}
                </button>
              </DialogFooter>
            </form>
          )}

          {/* Booking Success Screen with Direct WhatsApp Button */}
          {bookingSuccessResult && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pengajuan Sewa Berhasil Disiapkan!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Kode Pengajuan:{' '}
                  <strong className="text-emerald-800 font-mono font-bold">
                    #{bookingSuccessResult.rentalCode}
                  </strong>
                  . Estimasi Total:{' '}
                  <strong className="text-slate-800">
                    Rp {bookingSuccessResult.totalEstimasi.toLocaleString('id-ID')}
                  </strong>
                  .
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 text-left">
                💡 Silakan klik tombol di bawah untuk mengirim pesan otomatis ke WhatsApp Pengurus/PJ Sewa Alat Koperasi guna konfirmasi jadwal unit dan lokasi pengantaran.
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href={bookingSuccessResult.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Pesan WhatsApp Sekarang</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition cursor-pointer"
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
