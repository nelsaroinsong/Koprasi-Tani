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
  { key: 'SEMUA', label: 'Semua Alat', emoji: '🌾' },
  { key: 'Traktor & Pengolah Lahan', label: 'Traktor & Olah Lahan', emoji: '🚜' },
  { key: 'Mesin Panen & Perontok', label: 'Mesin Panen', emoji: '🌽' },
  { key: 'Penyemprot & Pemupukan', label: 'Drone & Semprot', emoji: '💧' },
  { key: 'Pascapanen & Pengolahan', label: 'Pascapanen', emoji: '⚙️' },
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Hero Banner Agritech Compact & Premium */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#123625] via-[#1b4d36] to-[#0f2e1f] text-white p-5 sm:p-8 shadow-sm mb-6 border border-emerald-800/40">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold border border-emerald-400/30 mb-3 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Fasilitas Alsintan Koperasi Sinar Pagi Sejahtera</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Peminjaman & Sewa Alat Mesin Pertanian (Alsintan)
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 leading-relaxed">
              Tingkatkan produktivitas pengolahan tanah, pemupukan presisi, dan panen dengan unit mesin modern bersubsidi khusus anggota koperasi Minahasa Utara.
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-3 border-t border-emerald-700/40 text-[10px] sm:text-xs text-emerald-200">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tarif Subsidi Anggota</span>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Operator Bersertifikat</span>
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Unit Terawat & Siap Kerja</span>
              </span>
            </div>
          </div>
        </div>

        {/* Filter Category Tabs (Horizontal Scroll on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
          {KATEGORI_TABS.map((tab) => {
            const isActive = selectedKategori === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedKategori(tab.key)}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs border ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search, Filter Bar, & Quick Stats */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari traktor, kultivator, drone, pemipil..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span>Hanya yang Tersedia</span>
            </label>

            <span className="text-[11px] text-slate-400 font-medium">
              Menampilkan <strong className="text-slate-800">{filteredEquipments.length}</strong> unit alat
            </span>
          </div>
        </div>

        {/* Grid Catalog Cards */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs text-slate-500 font-medium">Memuat katalog alsintan...</span>
          </div>
        ) : filteredEquipments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-14 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Tractor className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak ada alat pertanian yang cocok</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
              Silakan coba gunakan kata kunci lain atau ubah kategori pilihan untuk melihat unit mesin lainnya.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredEquipments.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image Container with Badges */}
                  <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.nama}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Tractor className="w-12 h-12" />
                      </div>
                    )}

                    {/* Availability Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs backdrop-blur-md ${
                          item.isTersedia
                            ? 'bg-emerald-600/90 text-white border border-emerald-400/40'
                            : 'bg-amber-600/90 text-white border border-amber-400/40'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>{item.isTersedia ? 'Tersedia' : 'Dalam Perawatan'}</span>
                      </span>
                    </div>

                    {/* Kondisi Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-semibold backdrop-blur-md">
                        {item.kondisi}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span>{item.kategori}</span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                      {item.nama}
                    </h2>

                    {item.spesifikasi && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] sm:text-[11px] text-slate-600 flex items-start gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{item.spesifikasi}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {item.deskripsi || 'Unit alat mesin pertanian modern Koperasi Sinar Pagi Sejahtera siap pakai.'}
                    </p>
                  </div>
                </div>

                {/* Price & Action Area */}
                <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Tarif Sewa Subsidi:
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-800">
                        Rp {item.hargaSewa.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {' '}/ {item.satuanSewa}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold block">Operator:</span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {item.biayaOperator
                          ? `+ Rp ${item.biayaOperator.toLocaleString('id-ID')}`
                          : 'Mandiri / Gratis'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenBooking(item)}
                      disabled={!item.isTersedia}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                        item.isTersedia
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:bg-emerald-900'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.isTersedia ? 'Ajukan Sewa Unit' : 'Unit Sedang Dipakai'}</span>
                    </button>

                    {item.kontakPj && (
                      <a
                        href={`https://wa.me/${item.kontakPj.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                          `Halo Pengurus Koperasi Sinar Pagi Sejahtera, saya ingin bertanya tentang ketersediaan sewa alat "${item.nama}".`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border border-slate-200 hover:bg-white text-emerald-700 rounded-xl transition cursor-pointer shadow-2xs hover:border-emerald-300"
                        title="Tanya Pengurus via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
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
                💡 Silakan klik tombol di bawah untuk mengirim pesan otomatis ke WhatsApp Pengurus/PJ Alsintan Koperasi guna konfirmasi jadwal unit dan lokasi pengantaran.
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
