'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import SlideCommit from '@/components/ui/SlideCommit';
import LocationMapPreview from '@/components/LocationMapPreview';
import {
  Tractor,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Loader2,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import {
  getRentalCart,
  clearRentalCart,
  calculateRentalCartTotal,
  calculateRentalItemTotal,
  type RentalCartItem,
} from '@/lib/rental-cart';

export default function CheckoutSewaAlatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [rentalCartItems, setRentalCartItems] = useState<RentalCartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [rentalStartDate, setRentalStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [rentalLokasiLahan, setRentalLokasiLahan] = useState(user?.address || '');
  const [rentalCatatan, setRentalCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rentalOrderError, setRentalOrderError] = useState<string | null>(null);
  const [createdRentalResult, setCreatedRentalResult] = useState<any | null>(null);

  const [adminPhone, setAdminPhone] = useState('081944078924');
  const [warehouseAddress, setWarehouseAddress] = useState(
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara'
  );

  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alamat) setWarehouseAddress(data.alamat);
        if (data?.telepon) setAdminPhone(data.telepon);
      })
      .catch(() => {});
  }, []);

  // Load keranjang sewa
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent('/checkout/sewa-alat')}`
        );
        return;
      }
      try {
        const items = getRentalCart();
        setRentalCartItems(items);
        if (user.address && !rentalLokasiLahan) {
          setRentalLokasiLahan(user.address);
        }
      } catch (err) {
        console.error('Error loading rental cart:', err);
        setRentalCartItems([]);
      } finally {
        setIsLoaded(true);
      }
    }
  }, [user, authLoading, router, rentalLokasiLahan]);

  const totalRentalAmount = useMemo(() => {
    return calculateRentalCartTotal(rentalCartItems);
  }, [rentalCartItems]);

  const totalRentalUnits = useMemo(() => {
    return rentalCartItems.reduce((acc, curr) => acc + (curr.jumlahUnit || 1), 0);
  }, [rentalCartItems]);

  // Submit Pengajuan Sewa Multi-Alat
  const handleConfirmRentalOrder = async () => {
    if (!user) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent('/checkout/sewa-alat')}`
      );
      throw new Error('Silakan masuk akun terlebih dahulu');
    }

    if (rentalCartItems.length === 0) {
      throw new Error('Keranjang sewa alat masih kosong.');
    }

    if (!rentalStartDate) {
      throw new Error('Tentukan tanggal mulai pemakaian sewa.');
    }

    try {
      setIsSubmitting(true);
      setRentalOrderError(null);

      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: rentalStartDate,
          lokasiLahan: rentalLokasiLahan,
          catatan: rentalCatatan,
          items: rentalCartItems.map((it) => ({
            equipmentId: it.equipmentId,
            durasi: it.durasi,
            jumlahUnit: it.jumlahUnit,
            includeOperator: it.includeOperator,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim pengajuan sewa ke koperasi');
      }

      clearRentalCart();
      setRentalCartItems([]);
      setCreatedRentalResult(data);

      showToast({
        title: 'Pengajuan Sewa Terkirim',
        message: `Pengajuan sewa #${data.rentalCode} berhasil diajukan dan menunggu persetujuan admin.`,
        type: 'success',
      });

      return data;
    } catch (err: any) {
      console.error('Error submitting rental:', err);
      setRentalOrderError(err.message || 'Terjadi kesalahan sistem.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Handler
  const handleOpenRentalWhatsApp = (rental: any) => {
    const rawPhone = adminPhone || '081944078924';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const rentalCode = rental.rentalCode || rental.rentalNumber || rental.id;
    const durationDays = rental.durationDays || rental.durasi || rental.items?.[0]?.durasi || 1;
    const totalAmount = rental.totalEstimasi ?? rental.totalAmount ?? 0;
    const location = rental.lokasiLahan || rental.farmLocationAddress || rental.location || '-';
    const notes = rental.catatan || rental.notes;

    const itemsSummary = rental.items
      ?.map(
        (i: any) =>
          `- ${i.nama || i.equipmentName || 'Alat Pertanian'} (${i.jumlahUnit || i.quantity || 1} unit x ${
            i.durasi || i.rentalDays || durationDays
          } hari)`
      )
      .join('\n');

    const message = `Halo Admin Koperasi Sinar Pagi Sejahtera,
Saya ingin konfirmasi *Pengajuan Sewa Alat Pertanian*:

*Nomor Pengajuan:* #${rentalCode}
*Nama Pemohon:* ${rental.userName} (${rental.userPhone || user?.phone || '-'})
*Mulai Tanggal:* ${rental.startDate}
*Durasi Sewa:* ${durationDays} hari
*Lokasi Lahan Kebun:* ${location}
${
  rental.farmLocationGps
    ? `*Titik GPS Lahan:* ${rental.farmLocationGps.lat}, ${rental.farmLocationGps.lng}\nMaps: https://www.google.com/maps?q=${rental.farmLocationGps.lat},${rental.farmLocationGps.lng}\n`
    : ''
}*Total Biaya Estimasi:* Rp ${Number(totalAmount).toLocaleString('id-ID')}
*Status:* Menunggu Persetujuan Admin Koperasi

Daftar Alat Mesin:
${itemsSummary || '-'}

${notes ? `*Catatan Kebutuhan:* ${notes}\n` : ''}
Mohon info persetujuan admin koperasi untuk pengajuan ini. Terima kasih!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (authLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <Loader2 className="w-8 h-8 text-[#233414] animate-spin" />
          <p className="text-xs font-semibold text-[#526046]">
            Mempersiapkan formulir konfirmasi pengajuan sewa alat...
          </p>
        </div>
      </div>
    );
  }

  // Tampilan Sukses Pengajuan Sewa (Ticket / Receipt Style)
  if (createdRentalResult) {
    const rentalDate = createdRentalResult.createdAt
      ? new Date(createdRentalResult.createdAt)
      : new Date();
    const formattedDate = rentalDate
      .toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase();
    const formattedTime = rentalDate
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace('.', ':');

    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />

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
                Pengajuan Terkirim
              </h1>
              <p className="text-xs text-[#526046] mt-1 max-w-[260px] mx-auto leading-relaxed">
                Pengajuan sewa alat resmi Anda telah berhasil dikirim ke pengurus koperasi.
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
                    TICKET ID / NO. SEWA
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#1a2610] font-mono tracking-tight mt-0.5 tabular-nums">
                    #{createdRentalResult.rentalCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5b6950]">
                    ESTIMASI BIAYA
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#233414] mt-0.5 tabular-nums">
                    Rp {Number(createdRentalResult.totalEstimasi).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Row 2: Date & Time + Start Date */}
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
                    MULAI SEWA
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#344d15] mt-0.5 tabular-nums">
                    {createdRentalResult.startDate}
                  </div>
                </div>
              </div>

              {/* Location Pill Box */}
              <div className="p-3 bg-[#f4f5f1] border border-[#dce1d6] rounded-2xl flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-[#233414] text-[#D4F63D] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1a2610] truncate">
                    Lokasi Lahan Kebun
                  </div>
                  <div className="text-[10px] text-[#526046] line-clamp-1 mt-0.5">
                    {rentalLokasiLahan || 'Minahasa Utara, Sulawesi Utara'}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-center pt-0.5 pb-2">
                <span className="px-2.5 py-0.5 bg-[#e2f2c8] text-[#233414] border border-[#c9e39e] rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#233414]" />
                  <span>Menunggu Persetujuan Admin Koperasi</span>
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
                onClick={() =>
                  handleOpenRentalWhatsApp({
                    rentalNumber: createdRentalResult.rentalCode,
                    userName: user?.name,
                    userPhone: user?.phone,
                    startDate: createdRentalResult.startDate,
                    durationDays: 1,
                    farmLocationAddress: rentalLokasiLahan,
                    totalAmount: createdRentalResult.totalEstimasi,
                    notes: rentalCatatan,
                  })
                }
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

            {/* Link Kembali ke Katalog Sewa Alat */}
            <div className="text-center pt-0.5">
              <Link
                href="/sewa-alat"
                className="text-xs font-semibold text-[#526046] hover:text-[#233414] hover:underline inline-flex items-center gap-1 transition"
              >
                <span>← Buka Katalog Sewa Alat Lagi</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Jika Keranjang Sewa Kosong
  if (rentalCartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#e2f2c8] border border-[#c9e39e] text-[#233414] flex items-center justify-center mb-4">
            <Tractor className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#1a2610]">Keranjang Sewa Alat Kosong</h2>
          <p className="text-xs text-[#526046] max-w-sm mt-1.5 leading-relaxed">
            Pilih alat mesin pertanian yang Anda butuhkan terlebih dahulu sebelum melakukan pengajuan.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/cart?tab=sewa-alat"
              className="px-4 py-2.5 rounded-xl border border-[#cfd6c9] bg-white text-[#1a2610] font-bold text-xs hover:bg-[#EAEDE7] transition"
            >
              Buka Keranjang Saya
            </Link>
            <Link
              href="/sewa-alat"
              className="px-5 py-2.5 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs transition"
            >
              Katalog Sewa Alat
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans pb-16">
      <AppHeader activePage="sewa-alat" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-[#526046] font-medium">
          <Link href="/" className="hover:text-[#344d15] transition font-semibold">
            Beranda
          </Link>
          <span className="text-[#cfd6c9]">/</span>
          <Link href="/cart?tab=sewa-alat" className="hover:text-[#344d15] transition font-semibold">
            Keranjang Sewa
          </Link>
          <span className="text-[#cfd6c9]">/</span>
          <span className="text-[#1a2610] font-bold">Konfirmasi Pengajuan Sewa Alat</span>
        </nav>

        {/* Page Title */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#dce1d6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#e2f2c8] text-[#233414] border border-[#c9e39e] font-bold text-[10px] uppercase tracking-wider">
                Halaman Pengajuan Sewa Resmi
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-[#1a2610] tracking-tight mt-1">
              Konfirmasi Pengajuan Sewa Alat Pertanian
            </h1>
            <p className="text-xs sm:text-sm text-[#526046] mt-0.5">
              Tentukan jadwal tanggal sewa, titik koordinat lahan kebun Anda, dan instruksi operasional unit.
            </p>
          </div>

          <Link
            href="/cart?tab=sewa-alat"
            className="px-3.5 py-2 rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#f4f5f1] text-[#1a2610] font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ubah Alat di Keranjang</span>
          </Link>
        </div>

        {/* Banner Informasi Persetujuan Admin Koperasi */}
        <div className="p-4 bg-[#e2f2c8]/60 border border-[#c9e39e] rounded-2xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#233414] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1a2610] leading-relaxed">
            <span className="font-bold">Verifikasi & Approval Admin:</span> Setelah diajukan melalui sistem ini, Admin Koperasi Sinar Pagi Sejahtera akan segera memeriksa kesiapan teknis mesin, kecocokan lahan, dan jadwal kalender alat sebelum unit diserahterimakan.
          </div>
        </div>

        {/* 2-Column Responsive Layout Luas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Kolom Kiri: Detail Formulir Luas (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* 1. Jadwal Penggunaan Alat */}
            <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 space-y-3">
              <div className="flex items-center gap-2.5 border-b border-[#EAEDE7] pb-3">
                <div className="w-8 h-8 rounded-xl bg-[#e2f2c8] text-[#233414] border border-[#c9e39e] flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1a2610] text-sm sm:text-base">
                    Jadwal Mulai Penggunaan
                  </h3>
                  <p className="text-[11px] text-[#5b6950]">
                    Tentukan kapan alat pertanian mulai dibutuhkan di lahan Anda
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#1a2610] mb-1.5">
                    Mulai Tanggal Penggunaan <span className="text-[#c4242a]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={rentalStartDate}
                    onChange={(e) => setRentalStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] font-semibold text-xs text-[#1a2610] transition tabular-nums"
                  />
                </div>

                <div className="p-3 bg-[#f4f5f1] rounded-xl border border-[#dce1d6] flex flex-col justify-center text-xs">
                  <span className="text-[#5b6950] text-[10px] font-bold uppercase">Estimasi Masa Sewa</span>
                  <span className="font-bold text-[#1a2610] text-xs mt-0.5 tabular-nums">
                    Mulai {rentalStartDate} ({rentalCartItems[0]?.durasi || 1} Hari Pemakaian)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Lokasi Lahan Kebun Pertanian */}
            <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 space-y-3">
              <div className="flex items-center gap-2.5 border-b border-[#EAEDE7] pb-3">
                <div className="w-8 h-8 rounded-xl bg-[#e2f2c8] text-[#233414] border border-[#c9e39e] flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1a2610] text-sm sm:text-base">
                    Lokasi Lahan Kebun Pertanian
                  </h3>
                  <p className="text-[11px] text-[#5b6950]">
                    Titik kerja mesin pertanian untuk verifikasi akses jalan & pengurus koperasi
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <LocationMapPreview
                  value={rentalLokasiLahan}
                  onChange={setRentalLokasiLahan}
                  required={true}
                  label="Alamat Lengkap / Patokan Lahan Kebun"
                  placeholder="Contoh: Jl. 14 Februari, Teling Bawah / Desa Kolongan, Kec. Kalawat, Minahasa Utara"
                />
              </div>
            </div>

            {/* 3. Daftar Unit Alat Yang Diajukan */}
            <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAEDE7] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#233414] text-[#D4F63D] flex items-center justify-center font-bold">
                    <Tractor className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1a2610] text-sm sm:text-base">
                      Unit Mesin & Alat Pertanian
                    </h3>
                    <p className="text-[11px] text-[#5b6950] tabular-nums">
                      {totalRentalUnits} unit total ({rentalCartItems.length} macam mesin)
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#EAEDE7]">
                {rentalCartItems.map((item) => {
                  const itemTotal = calculateRentalItemTotal(item);
                  return (
                    <div key={item.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.nama}
                          className="w-16 h-16 rounded-xl object-cover border border-[#cfd6c9] shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-[#EAEDE7] text-[#233414] flex items-center justify-center shrink-0 border border-[#cfd6c9] text-2xl font-bold">
                          🚜
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {item.kategori && (
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#233414] text-[#D4F63D]">
                              {item.kategori}
                            </span>
                          )}
                          <span className="text-[10px] text-[#344d15] font-semibold">
                            Kondisi: {(item as any).kondisi || 'Sangat Baik'}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] mt-0.5">
                          {item.nama}
                        </h4>

                        <div className="text-[11px] text-[#526046] mt-0.5 tabular-nums">
                          {item.jumlahUnit} unit × {item.durasi} {item.satuanSewa || 'hari'} (Rp{' '}
                          {Number(item.hargaSewa).toLocaleString('id-ID')} / {item.satuanSewa || 'hari'})
                        </div>

                        {item.includeOperator && (
                          <div className="text-[10px] text-[#233414] font-semibold mt-0.5 flex items-center gap-1">
                            <span>✓ Termasuk Kru Operator Koperasi</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 self-end sm:self-center">
                        <div className="text-[10px] text-[#5b6950] font-medium">Subtotal Sewa</div>
                        <div className="text-xs sm:text-sm font-black text-[#233414] mt-0.5 tabular-nums">
                          Rp {itemTotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Catatan Kebutuhan Tambahan Petani */}
            <div className="bg-white rounded-2xl border border-[#dce1d6] p-4 sm:p-6 space-y-3">
              <label className="block font-bold text-[#1a2610] text-xs sm:text-sm">
                Catatan Kebutuhan Tambahan (Opsional)
              </label>
              <textarea
                rows={3}
                value={rentalCatatan}
                onChange={(e) => setRentalCatatan(e.target.value)}
                placeholder="Contoh: Memerlukan implemen bajak rotary, estimasi luas lahan 1 hektar, medan sedikit menanjak..."
                className="w-full p-3.5 text-xs bg-[#f4f5f1] border border-[#cfd6c9] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] text-[#1a2610] placeholder:text-[#5b6950] transition"
              />
            </div>
          </div>

          {/* Kolom Kanan: Ringkasan Sticky & SlideCommit (4 cols) */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white border border-[#dce1d6] rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="font-bold text-[#1a2610] text-sm sm:text-base border-b border-[#EAEDE7] pb-3 flex items-center justify-between gap-2">
                <span>Ringkasan Pengajuan Sewa</span>
                <span className="text-[10px] font-bold text-[#233414] bg-[#e2f2c8] px-2 py-0.5 rounded-full border border-[#c9e39e]">
                  Perlu Approval
                </span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-[#526046]">
                  <span>Total Unit Mesin</span>
                  <span className="font-semibold text-[#1a2610] tabular-nums">
                    {totalRentalUnits} Unit ({rentalCartItems.length} Jenis)
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Metode Pembayaran</span>
                  <span className="font-semibold text-[#344d15]">
                    Tunai Kasir Koperasi
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Lokasi Pengambilan</span>
                  <span className="font-semibold text-[#1a2610]">
                    Gudang Koperasi
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Mulai Tanggal</span>
                  <span className="font-semibold text-[#1a2610] tabular-nums">
                    {rentalStartDate}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#EAEDE7] pt-3 flex justify-between items-baseline">
                <span className="text-xs font-bold text-[#1a2610]">Total Estimasi Tagihan:</span>
                <span className="text-lg sm:text-xl font-black text-[#233414] tracking-tight tabular-nums">
                  Rp {totalRentalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              {rentalOrderError && (
                <div className="p-3 bg-[#ffedea] border border-red-200 rounded-xl text-xs text-[#831c1e] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rentalOrderError}</span>
                </div>
              )}

              <div className="pt-2">
                <SlideCommit
                  label="Geser untuk Ajukan Sewa Alat"
                  onConfirm={handleConfirmRentalOrder}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#5b6950] justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#344d15]" />
                <span>Pengajuan resmi diverifikasi staf koperasi</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
