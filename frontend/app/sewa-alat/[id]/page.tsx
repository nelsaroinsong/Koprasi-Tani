'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import LocationMapPreview from '@/components/LocationMapPreview';
import {
  Tractor,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Package,
  Wrench,
  UserCheck,
  MessageCircle,
  Plus,
  Minus,
  Maximize2,
  X,
  Loader2,
  Share2,
  MapPin,
  FileText,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
  addToRentalCart,
  getRentalCart,
  type RentalCartItem,
} from '@/lib/rental-cart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface EquipmentDetail {
  id: string;
  nama: string;
  kategori: string;
  deskripsi: string | null;
  spesifikasi: string | null;
  hargaSewa: number;
  satuanSewa: string;
  biayaOperator: number | null;
  stokUnit: number;
  stokTersedia?: number;
  unitDisewa?: number;
  kondisi: string;
  imageUrl: string | null;
  isTersedia: boolean;
  kontakPj: string | null;
}

export default function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const equipmentId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Booking State
  const [jumlahUnit, setJumlahUnit] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [durasi, setDurasi] = useState(1);
  const [includeOperator, setIncludeOperator] = useState(false);
  const [lokasiLahan, setLokasiLahan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Lightbox Foto Ukuran Penuh
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Modal Langsung Sewa Sekarang
  const [isDirectCheckoutOpen, setIsDirectCheckoutOpen] = useState(false);

  // Rental Cart Count
  const [rentalCartCount, setRentalCartCount] = useState(0);

  const updateCartCount = useCallback(() => {
    const items = getRentalCart();
    setRentalCartCount(items.length);
  }, []);

  useEffect(() => {
    updateCartCount();
    window.addEventListener('rental-cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('rental-cart-updated', updateCartCount);
    };
  }, [updateCartCount]);

  useEffect(() => {
    if (user?.address) {
      setLokasiLahan(user.address);
    }
  }, [user]);

  // Fetch Equipment Detail
  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/equipments/${equipmentId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Unit alat pertanian tidak ditemukan atau sudah dihapus.');
        } else {
          setError('Gagal memuat informasi unit alat.');
        }
        return;
      }
      const data = await res.json();
      setEquipment(data.equipment);
      setJumlahUnit(1);
      setDurasi(1);
    } catch (err: any) {
      console.error('Error fetching equipment detail:', err);
      setError('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Perhitungan Subtotal untuk Alat Ini
  const calculatedTotal = React.useMemo(() => {
    if (!equipment) return 0;
    const dur = Math.max(1, durasi);
    const qty = Math.max(1, jumlahUnit);
    const dasar = equipment.hargaSewa * dur * qty;
    const op =
      includeOperator && equipment.biayaOperator
        ? equipment.biayaOperator * dur * qty
        : 0;
    return dasar + op;
  }, [equipment, durasi, jumlahUnit, includeOperator]);

  // Aksi: Masukkan ke Keranjang Sewa Multi-Alat
  const handleAddToCart = () => {
    if (!equipment) return;
    const isOutOfStock =
      !equipment.isTersedia ||
      (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0);
    if (isOutOfStock) {
      showToast({
        title: 'Stok Unit Habis',
        message: 'Semua unit alat ini saat ini sedang disewa.',
        type: 'warning',
      });
      return;
    }

    addToRentalCart({
      equipmentId: equipment.id,
      nama: equipment.nama,
      kategori: equipment.kategori,
      hargaSewa: equipment.hargaSewa,
      satuanSewa: equipment.satuanSewa,
      biayaOperator: equipment.biayaOperator,
      includeOperator,
      stokUnit: equipment.stokUnit,
      jumlahUnit,
      durasi,
      imageUrl: equipment.imageUrl,
      kontakPj: equipment.kontakPj,
    });

    showToast({
      title: 'Ditambahkan ke Sewa',
      message: `${jumlahUnit} unit ${equipment.nama} telah ditambahkan ke keranjang sewa.`,
      type: 'success',
    });
  };

  // Aksi: Direct Sewa Sekarang via WhatsApp & API
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    if (!user) {
      showToast({
        title: 'Perlu Masuk Akun',
        message: 'Silakan masuk akun terlebih dahulu untuk mengajukan sewa.',
        type: 'info',
      });
      router.push(`/login?callbackUrl=/sewa-alat/${equipment.id}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: equipment.id,
          startDate,
          durasi,
          jumlahUnit,
          includeOperator,
          lokasiLahan,
          catatan,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: 'Pengajuan Siap',
          message: 'Detail sewa berhasil disiapkan. Mengalihkan ke WhatsApp pengurus...',
          type: 'success',
        });
        setIsDirectCheckoutOpen(false);
        if (data.waUrl) {
          window.open(data.waUrl, '_blank');
        }
      } else {
        showToast({
          title: 'Gagal Mengajukan Sewa',
          message: data.error || 'Terjadi kesalahan sistem saat memproses booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gangguan Jaringan',
        message: 'Tidak dapat mengirim pengajuan sewa.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#233414]" />
          <p className="text-xs sm:text-[13px] font-medium text-[#344d15]">
            Memuat detail alat pertanian...
          </p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#ffedea] border border-red-200 text-[#c4242a] flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1a2610] mb-1">
            Alat Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-[13px] text-[#526046] mb-6">{error}</p>
          <Link
            href="/sewa-alat"
            className="px-5 py-2.5 bg-[#233414] hover:bg-[#344d15] text-white rounded-xl font-semibold text-xs transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4F63D]" />
            <span>Kembali ke Katalog Sewa Alat</span>
          </Link>
        </div>
      </div>
    );
  }

  const cleanPhone = (equipment.kontakPj || '081944078924')
    .replace(/\D/g, '')
    .replace(/^0/, '62');

  const isOutOfStock =
    !equipment.isTersedia ||
    (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0);
  const maxUnits = Math.max(
    0,
    equipment.stokTersedia !== undefined
      ? equipment.stokTersedia
      : equipment.stokUnit || 1
  );

  return (
    <div className="min-h-screen bg-[#f4f5f1] pb-20 lg:pb-16 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <AppHeader activePage="sewa-alat" />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Top Navigation & Breadcrumb */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5b6950]">
            <Link
              href="/sewa-alat"
              className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#EAEDE7] text-[#1a2610] transition-colors"
              title="Kembali ke Katalog Sewa Alat"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#233414]" />
              <span className="hidden sm:inline">Kembali ke Katalog</span>
            </Link>
            <span className="text-[#cfd6c9]">/</span>
            <span className="text-[#526046] hidden sm:inline">Sewa Alat</span>
            <span className="text-[#cfd6c9] hidden sm:inline">/</span>
            <span className="text-[#1a2610] font-bold truncate max-w-[180px] sm:max-w-[240px]">
              {equipment.nama}
            </span>
          </div>

          {/* Quick Cart Button */}
          <Link
            href="/cart?tab=sewa-alat"
            className="inline-flex items-center gap-2 h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-semibold transition-colors shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4F63D]" />
            <span>Keranjang Sewa</span>
            {rentalCartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#D4F63D] text-[#1a2610] font-black text-[10px] flex items-center justify-center tabular-nums">
                {rentalCartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Main Grid: Foto di Kiri, Detail & Form Booking di Kanan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7 lg:gap-8 items-start">
          {/* Kolom Kiri: Galeri Foto Alat */}
          <div className="lg:col-span-6 space-y-3.5 sm:space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-[#dce1d6]">
              <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#dce1d6] group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    equipment.imageUrl ||
                    'https://picsum.photos/seed/sewa-alat-koperasi/800/800'
                  }
                  alt={equipment.nama}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain p-2 group-hover:scale-[1.03] transition-transform duration-300 cursor-pointer"
                  onClick={() => setIsImageModalOpen(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://picsum.photos/seed/sewa-alat-koperasi/800/800';
                  }}
                />

                {/* Badge Ketersediaan */}
                <div
                  className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border ${
                    !equipment.isTersedia || (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0)
                      ? 'bg-[#ffedea] text-[#831c1e] border-red-200'
                      : 'bg-white text-[#1a2610] border-[#dce1d6]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !equipment.isTersedia || (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0)
                        ? 'bg-[#c4242a]'
                        : 'bg-[#547318]'
                    }`}
                  />
                  <span>
                    {!equipment.isTersedia || (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0)
                      ? 'Sedang Disewa (Stok Kosong)'
                      : 'Ready Disewakan'}
                  </span>
                </div>

                {/* Badge Kategori */}
                <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 bg-[#233414] text-[#D4F63D] text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg">
                  {equipment.kategori}
                </div>

                {/* Tombol Maximize */}
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 p-2 rounded-xl bg-white hover:bg-[#EAEDE7] text-[#1a2610] border border-[#cfd6c9] transition-colors cursor-pointer"
                  title="Lihat Foto Ukuran Asli"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Jaminan Unit Koperasi */}
            <div className="p-3.5 sm:p-4 bg-[#e2f2c8]/60 border border-[#c9e39e] rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#1a2610] text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-[#233414] shrink-0" />
                <span>Pemeliharaan Resmi Koperasi Sinar Pagi Sejahtera</span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#344d15] leading-relaxed">
                Setiap unit alat mesin pertanian dicek oli, bahan bakar, dan fungsi mekanikalnya oleh teknisi koperasi sebelum diserahterimakan kepada anggota.
              </p>
            </div>
          </div>

          {/* Kolom Kanan: Rincian Info Alat & Pengajuan Sewa */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5">
            {/* Header Info Alat */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#dce1d6] space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#233414] bg-[#e2f2c8] px-2.5 py-0.5 rounded-md border border-[#c9e39e]">
                  {equipment.kategori}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1a2610] tracking-tight mt-2 leading-snug">
                  {equipment.nama}
                </h1>
              </div>

              {/* Harga Sewa */}
              <div className="p-3.5 sm:p-4 bg-[#f4f5f1] border border-[#dce1d6] rounded-2xl flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-[11px] text-[#526046] font-medium">
                    Tarif Sewa Anggota
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-[#233414] tracking-tight tabular-nums">
                      Rp {Number(equipment.hargaSewa).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-[#5b6950] font-medium">
                      / {equipment.satuanSewa || 'hari'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-[#526046] font-medium">
                    Kondisi Fisik
                  </div>
                  <span className="inline-block mt-0.5 px-2.5 py-1 bg-white border border-[#cfd6c9] text-[#1a2610] text-xs font-bold rounded-lg">
                    {equipment.kondisi || 'Sangat Baik'}
                  </span>
                </div>
              </div>

              {/* Grid Status Cepat */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl space-y-0.5">
                  <div className="text-[10px] sm:text-[11px] text-[#5b6950] font-medium">
                    Stok Tersedia
                  </div>
                  <div className={`text-xs font-bold flex items-center gap-1.5 ${
                    !equipment.isTersedia || (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0)
                      ? 'text-[#c4242a]'
                      : 'text-[#1a2610]'
                  }`}>
                    <Package className={`w-3.5 h-3.5 shrink-0 ${
                      !equipment.isTersedia || (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0)
                        ? 'text-[#c4242a]'
                        : 'text-[#344d15]'
                    }`} />
                    <span className="truncate">
                      {!equipment.isTersedia || (equipment.stokTersedia !== undefined && equipment.stokTersedia <= 0)
                        ? '0 Unit (Sedang Disewa)'
                        : `${equipment.stokTersedia ?? equipment.stokUnit ?? 1} Unit Siap Pakai`}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl space-y-0.5">
                  <div className="text-[10px] sm:text-[11px] text-[#5b6950] font-medium">
                    Layanan Operator
                  </div>
                  <div className="text-xs font-bold text-[#1a2610] flex items-center gap-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-[#344d15] shrink-0" />
                    <span className="truncate tabular-nums">
                      {equipment.biayaOperator
                        ? `+Rp ${Number(equipment.biayaOperator).toLocaleString('id-ID')}`
                        : 'Mandiri / Bebas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deskripsi */}
              {equipment.deskripsi && (
                <div className="pt-3 border-t border-[#EAEDE7]">
                  <h3 className="text-xs font-bold text-[#1a2610] mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#526046]" />
                    <span>Deskripsi Alat</span>
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#526046] leading-relaxed whitespace-pre-line">
                    {equipment.deskripsi}
                  </p>
                </div>
              )}

              {/* Spesifikasi Teknis */}
              {equipment.spesifikasi && (
                <div className="pt-3 border-t border-[#EAEDE7]">
                  <h3 className="text-xs font-bold text-[#1a2610] mb-1.5 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#526046]" />
                    <span>Spesifikasi Teknis</span>
                  </h3>
                  <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl text-xs font-mono text-[#1a2610] whitespace-pre-line leading-relaxed">
                    {equipment.spesifikasi}
                  </div>
                </div>
              )}
            </div>

            {/* Card Opsi Sewa & Tombol Aksi */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border space-y-4 transition-colors ${
              isOutOfStock
                ? 'bg-[#f4f5f1] border-[#cfd6c9]'
                : 'bg-white border-[#dce1d6]'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1a2610] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#233414]" />
                  <span>Rencana Penggunaan Sewa</span>
                </h2>
                {isOutOfStock && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#ffedea] text-[#831c1e] text-[11px] font-bold border border-red-200">
                    Sedang Disewa
                  </span>
                )}
              </div>

              {isOutOfStock && (
                <div className="p-3.5 bg-[#ffedea]/70 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-[#831c1e]">
                  <AlertCircle className="w-4 h-4 text-[#c4242a] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Unit Sedang Disewa Koperasi</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      Seluruh unit alat ini saat ini sedang disewa anggota lain. Anda dapat menanyakan jadwal sewa berikutnya ke pengurus koperasi via WhatsApp di bawah.
                    </p>
                  </div>
                </div>
              )}

              {/* Atur Jumlah Unit & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Stepper Jumlah Unit */}
                <div>
                  <label className="block font-bold text-[#1a2610] mb-1">
                    Jumlah Unit
                  </label>
                  <div className="flex items-center border border-[#cfd6c9] rounded-xl bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setJumlahUnit((prev) => Math.max(1, prev - 1))}
                      disabled={isOutOfStock || jumlahUnit <= 1}
                      className="p-2.5 hover:bg-[#EAEDE7] text-[#1a2610] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxUnits || 1}
                      disabled={isOutOfStock}
                      value={jumlahUnit}
                      onChange={(e) =>
                        setJumlahUnit(
                          Math.max(
                            1,
                            Math.min(
                              maxUnits || 1,
                              Number(e.target.value) || 1
                            )
                          )
                        )
                      }
                      className="w-full text-center font-bold text-[#1a2610] bg-transparent focus:outline-none disabled:text-[#68785b] tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setJumlahUnit((prev) =>
                          Math.min(maxUnits || 1, prev + 1)
                        )
                      }
                      disabled={isOutOfStock || jumlahUnit >= maxUnits}
                      className="p-2.5 hover:bg-[#EAEDE7] text-[#1a2610] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className={`text-[10px] mt-1 block font-medium ${isOutOfStock ? 'text-[#c4242a] font-bold' : 'text-[#5b6950]'}`}>
                    {isOutOfStock
                      ? 'Stok kosong di koperasi'
                      : `Maksimal ${maxUnits} unit tersedia`}
                  </span>
                </div>

                {/* Stepper Durasi Pemakaian */}
                <div>
                  <label className="block font-bold text-[#1a2610] mb-1">
                    Durasi ({equipment.satuanSewa || 'hari'})
                  </label>
                  <div className="flex items-center border border-[#cfd6c9] rounded-xl bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDurasi((prev) => Math.max(1, prev - 1))}
                      disabled={isOutOfStock || durasi <= 1}
                      className="p-2.5 hover:bg-[#EAEDE7] text-[#1a2610] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      disabled={isOutOfStock}
                      value={durasi}
                      onChange={(e) =>
                        setDurasi(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full text-center font-bold text-[#1a2610] bg-transparent focus:outline-none disabled:text-[#68785b] tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setDurasi((prev) => prev + 1)}
                      disabled={isOutOfStock}
                      className="p-2.5 hover:bg-[#EAEDE7] text-[#1a2610] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-[#5b6950] mt-1 block">
                    Hitungan per {equipment.satuanSewa || 'hari'}
                  </span>
                </div>
              </div>

              {/* Opsi Layanan Operator */}
              {equipment.biayaOperator ? (
                <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOperator}
                      disabled={isOutOfStock}
                      onChange={(e) => setIncludeOperator(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#233414] text-[#233414] focus:ring-[#233414] border-[#cfd6c9] mt-0.5 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-[#1a2610]">
                        Gunakan Tenaga Operator Koperasi (+ Rp{' '}
                        {Number(equipment.biayaOperator).toLocaleString('id-ID')} /{' '}
                        {equipment.satuanSewa})
                      </div>
                      <div className="text-[10px] text-[#526046] mt-0.5">
                        Disediakan kru terlatih koperasi untuk mengoperasikan unit di lahan Anda.
                      </div>
                    </div>
                  </label>
                </div>
              ) : null}

              {/* Rincian Estimasi Biaya */}
              <div className="p-3.5 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-[#526046] text-[11px]">
                  <span>
                    Tarif Pokok ({jumlahUnit} unit × {durasi} {equipment.satuanSewa}):
                  </span>
                  <span className="font-bold text-[#1a2610] tabular-nums">
                    Rp{' '}
                    {(
                      equipment.hargaSewa *
                      durasi *
                      jumlahUnit
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
                {includeOperator && equipment.biayaOperator ? (
                  <div className="flex justify-between text-[#526046] text-[11px]">
                    <span>
                      Jasa Operator ({jumlahUnit} unit × {durasi} {equipment.satuanSewa}):
                    </span>
                    <span className="font-bold text-[#1a2610] tabular-nums">
                      Rp{' '}
                      {(
                        equipment.biayaOperator *
                        durasi *
                        jumlahUnit
                      ).toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : null}
                <div className="pt-2 border-t border-[#cfd6c9] flex justify-between items-center font-black">
                  <span className="text-[#1a2610]">Estimasi Biaya Alat Ini:</span>
                  <span className="text-base text-[#233414] tabular-nums">
                    Rp {calculatedTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Dua Tombol Aksi Utama: Tambah ke Keranjang Sewa & Sewa Sekarang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="w-full h-10 sm:h-11 px-3 rounded-xl border border-[#c9e39e] bg-[#e2f2c8] hover:bg-[#d5ebae] text-[#233414] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#EAEDE7] disabled:border-[#cfd6c9] disabled:text-[#68785b]"
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span className="truncate">{isOutOfStock ? 'Stok Sewa Kosong' : '+ Keranjang Sewa (Banyak)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDirectCheckoutOpen(true)}
                  disabled={isOutOfStock}
                  className="w-full h-10 sm:h-11 px-3 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#EAEDE7] disabled:text-[#68785b]"
                >
                  <Calendar className="w-4 h-4 text-[#D4F63D] shrink-0" />
                  <span className="truncate">{isOutOfStock ? 'Sedang Disewa (Habis)' : 'Sewa Alat Ini Sekarang'}</span>
                </button>
              </div>

              {/* Link WhatsApp Pengurus */}
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `Halo Pengurus Koperasi Sinar Pagi Sejahtera, saya tertarik menyewa alat "${equipment.nama}". Mohon info jadwal ketersediaannya.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-10 px-3 rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#EAEDE7] text-[#1a2610] font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#344d15]" />
                <span>Tanya Pengurus via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: Lightbox Foto Ukuran Asli */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white border border-[#dce1d6] rounded-3xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#233414] hover:bg-[#344d15] text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                equipment.imageUrl ||
                'https://picsum.photos/seed/sewa-alat-koperasi/1200/1200'
              }
              alt={equipment.nama}
              loading="lazy"
              decoding="async"
              className="max-h-[82vh] w-auto object-contain mx-auto rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* MODAL 2: Dialog Direct Sewa Sekarang */}
      <Dialog
        open={isDirectCheckoutOpen}
        onOpenChange={setIsDirectCheckoutOpen}
      >
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl bg-white border border-[#dce1d6]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1a2610] flex items-center gap-2">
              <Tractor className="w-5 h-5 text-[#233414]" />
              <span>Konfirmasi Sewa: {equipment.nama}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDirectSubmit} className="space-y-3.5 text-xs mt-2">
            <div>
              <label className="block font-bold text-[#1a2610] mb-1">
                Mulai Tanggal Penggunaan <span className="text-[#c4242a]">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414] font-semibold"
              />
            </div>

            {/* Lokasi Lahan Kebun dengan Preview Maps & Deteksi GPS */}
            <LocationMapPreview
              value={lokasiLahan}
              onChange={setLokasiLahan}
              required={false}
            />

            <div>
              <label className="block font-bold text-[#1a2610] mb-1">
                Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Informasi kondisi tanah, jam operasional, atau implemen tambahan..."
                className="w-full px-3 py-2 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#68785b] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#233414] focus:border-[#233414]"
              />
            </div>

            <div className="p-3 bg-[#e2f2c8]/60 border border-[#c9e39e] rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-[#1a2610]">
                <span>Rincian:</span>
                <span>
                  {jumlahUnit} unit • {durasi} {equipment.satuanSewa}
                </span>
              </div>
              <div className="flex justify-between font-black text-sm text-[#233414] pt-1 border-t border-[#c9e39e] tabular-nums">
                <span>Total Estimasi:</span>
                <span>Rp {calculatedTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDirectCheckoutOpen(false)}
                className="py-2 px-3 border border-[#cfd6c9] bg-white hover:bg-[#EAEDE7] text-[#526046] rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 bg-[#233414] hover:bg-[#344d15] text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4F63D]" />
                    <span>Menyiapkan...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 text-[#D4F63D]" />
                    <span>Ajukan ke WhatsApp PJ</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
