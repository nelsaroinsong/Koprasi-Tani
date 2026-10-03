'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
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
    if (!equipment.isTersedia) {
      showToast({
        title: 'Unit Sedang Dipakai',
        message: 'Alat ini saat ini sedang tidak dapat disewa.',
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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">
            Memuat detail alat pertanian...
          </p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            Alat Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <Link
            href="/sewa-alat"
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Katalog Sewa Alat</span>
          </Link>
        </div>
      </div>
    );
  }

  const cleanPhone = (equipment.kontakPj || '081944078924')
    .replace(/\D/g, '')
    .replace(/^0/, '62');

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Top Navigation & Breadcrumb */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              href="/sewa-alat"
              className="inline-flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs"
              title="Kembali ke Katalog Sewa Alat"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali ke Katalog</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400 hidden sm:inline">Sewa Alat</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-slate-800 font-bold truncate max-w-[200px]">
              {equipment.nama}
            </span>
          </div>

          {/* Quick Cart Button */}
          <Link
            href="/cart?tab=sewa-alat"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang Sewa</span>
            {rentalCartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] flex items-center justify-center">
                {rentalCartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Main Grid: Foto di Kiri, Detail & Form Booking di Kanan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Kolom Kiri: Galeri Foto Alat */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    equipment.imageUrl ||
                    'https://picsum.photos/seed/sewa-alat-koperasi/800/800'
                  }
                  alt={equipment.nama}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setIsImageModalOpen(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://picsum.photos/seed/sewa-alat-koperasi/800/800';
                  }}
                />

                {/* Badge Ketersediaan */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1.5 border border-emerald-100">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      equipment.isTersedia
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span>
                    {equipment.isTersedia ? 'Ready Disewakan' : 'Sedang Dipakai'}
                  </span>
                </div>

                {/* Badge Kategori */}
                <div className="absolute bottom-3 left-3 bg-emerald-700/95 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                  {equipment.kategori}
                </div>

                {/* Tombol Maximize */}
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md transition cursor-pointer"
                  title="Lihat Foto Ukuran Asli"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Jaminan Unit Koperasi */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Pemeliharaan Resmi Koperasi Sinar Pagi Sejahtera</span>
              </div>
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                Setiap unit alat mesin pertanian dicek oli, bahan bakar, dan fungsi mekanikalnya oleh teknisi koperasi sebelum diserahterimakan kepada anggota.
              </p>
            </div>
          </div>

          {/* Kolom Kanan: Rincian Info Alat & Pengajuan Sewa */}
          <div className="lg:col-span-6 space-y-5">
            {/* Header Info Alat */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {equipment.kategori}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2 leading-snug">
                  {equipment.nama}
                </h1>
              </div>

              {/* Harga Sewa */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Tarif Sewa Anggota
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-emerald-900 tracking-tight">
                      Rp {Number(equipment.hargaSewa).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {equipment.satuanSewa || 'hari'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-500 font-medium">
                    Kondisi Fisik
                  </div>
                  <span className="inline-block mt-0.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-2xs">
                    {equipment.kondisi || 'Sangat Baik'}
                  </span>
                </div>
              </div>

              {/* Grid Status Cepat */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-medium">
                    Stok Tersedia
                  </div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{equipment.stokUnit || 1} Unit Siap Pakai</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-medium">
                    Layanan Operator
                  </div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {equipment.biayaOperator
                        ? `+Rp ${Number(equipment.biayaOperator).toLocaleString('id-ID')}`
                        : 'Mandiri / Bebas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deskripsi */}
              {equipment.deskripsi && (
                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deskripsi Alat</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {equipment.deskripsi}
                  </p>
                </div>
              )}

              {/* Spesifikasi Teknis */}
              {equipment.spesifikasi && (
                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    <span>Spesifikasi Teknis</span>
                  </h3>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">
                    {equipment.spesifikasi}
                  </div>
                </div>
              )}
            </div>

            {/* Card Opsi Sewa & Tombol Aksi */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Rencana Penggunaan Sewa</span>
              </h2>

              {/* Atur Jumlah Unit & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Stepper Jumlah Unit */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jumlah Unit
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setJumlahUnit((prev) => Math.max(1, prev - 1))}
                      disabled={jumlahUnit <= 1}
                      className="p-2.5 hover:bg-slate-200/60 text-slate-700 transition disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={equipment.stokUnit || 99}
                      value={jumlahUnit}
                      onChange={(e) =>
                        setJumlahUnit(
                          Math.max(
                            1,
                            Math.min(
                              equipment.stokUnit || 99,
                              Number(e.target.value) || 1
                            )
                          )
                        )
                      }
                      className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setJumlahUnit((prev) =>
                          Math.min(equipment.stokUnit || 99, prev + 1)
                        )
                      }
                      disabled={jumlahUnit >= (equipment.stokUnit || 1)}
                      className="p-2.5 hover:bg-slate-200/60 text-slate-700 transition disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Maksimal {equipment.stokUnit || 1} unit tersedia
                  </span>
                </div>

                {/* Stepper Durasi Pemakaian */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Durasi ({equipment.satuanSewa || 'hari'})
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDurasi((prev) => Math.max(1, prev - 1))}
                      disabled={durasi <= 1}
                      className="p-2.5 hover:bg-slate-200/60 text-slate-700 transition disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={durasi}
                      onChange={(e) =>
                        setDurasi(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDurasi((prev) => prev + 1)}
                      className="p-2.5 hover:bg-slate-200/60 text-slate-700 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Hitungan per {equipment.satuanSewa || 'hari'}
                  </span>
                </div>
              </div>

              {/* Opsi Layanan Operator */}
              {equipment.biayaOperator ? (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
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
                        {Number(equipment.biayaOperator).toLocaleString('id-ID')} /{' '}
                        {equipment.satuanSewa})
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Disediakan kru terlatih koperasi untuk mengoperasikan unit di lahan Anda.
                      </div>
                    </div>
                  </label>
                </div>
              ) : null}

              {/* Rincian Estimasi Biaya */}
              <div className="p-3.5 bg-slate-100/70 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>
                    Tarif Pokok ({jumlahUnit} unit × {durasi} {equipment.satuanSewa}):
                  </span>
                  <span className="font-bold text-slate-800">
                    Rp{' '}
                    {(
                      equipment.hargaSewa *
                      durasi *
                      jumlahUnit
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
                {includeOperator && equipment.biayaOperator ? (
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>
                      Jasa Operator ({jumlahUnit} unit × {durasi} {equipment.satuanSewa}):
                    </span>
                    <span className="font-bold text-slate-800">
                      Rp{' '}
                      {(
                        equipment.biayaOperator *
                        durasi *
                        jumlahUnit
                      ).toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : null}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-black">
                  <span className="text-slate-800">Estimasi Biaya Alat Ini:</span>
                  <span className="text-base text-emerald-900">
                    Rp {calculatedTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Dua Tombol Aksi Utama: Tambah ke Keranjang Sewa & Sewa Sekarang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!equipment.isTersedia}
                  className="w-full py-3 px-3 rounded-xl border border-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>+ Keranjang Sewa (Banyak)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDirectCheckoutOpen(true)}
                  disabled={!equipment.isTersedia}
                  className="w-full py-3 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Sewa Alat Ini Sekarang</span>
                </button>
              </div>

              {/* Link WhatsApp Pengurus */}
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `Halo Pengurus Koperasi Sinar Pagi Sejahtera, saya tertarik menyewa alat "${equipment.nama}". Mohon info jadwal ketersediaannya.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
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
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition cursor-pointer"
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
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-emerald-700" />
              <span>Konfirmasi Sewa: {equipment.nama}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDirectSubmit} className="space-y-3.5 text-xs mt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mulai Tanggal Penggunaan <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                  value={lokasiLahan}
                  onChange={(e) => setLokasiLahan(e.target.value)}
                  placeholder="Contoh: Desa Kolongan, Kec. Kalawat"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Informasi kondisi tanah, jam operasional, atau implemen tambahan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Rincian:</span>
                <span>
                  {jumlahUnit} unit • {durasi} {equipment.satuanSewa}
                </span>
              </div>
              <div className="flex justify-between font-black text-sm text-emerald-950 pt-1 border-t border-emerald-200/60">
                <span>Total Estimasi:</span>
                <span>Rp {calculatedTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDirectCheckoutOpen(false)}
                className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyiapkan...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
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
