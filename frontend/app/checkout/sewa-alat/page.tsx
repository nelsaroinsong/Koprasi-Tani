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
import { getPrimaryImage } from '@/lib/utils';
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rental-created'));
      }

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
    <div className="min-h-screen bg-white sm:bg-[#f4f5f1] flex flex-col font-sans pb-20">
      <div className="hidden sm:block">
        <AppHeader activePage="sewa-alat" />
      </div>

      {/* Mobile Top Bar (Fixed di top, solid white, anti-tembus) */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white px-4 h-14 flex items-center justify-between border-b border-[#EAEDE7] shadow-2xs">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-extrabold text-[#1a2610] tracking-tight">
          Checkout Sewa Alat
        </h1>

        <div className="w-10" />
      </div>
      {/* Spacer placeholder mode mobile agar konten tidak tertutup fixed navbar */}
      <div className="sm:hidden h-14 shrink-0 pointer-events-none" aria-hidden="true" />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-4 sm:py-6 lg:py-8 space-y-5 sm:space-y-6">
        {/* Desktop Compact Back Link */}
        <div className="hidden sm:flex items-center justify-between pb-1">
          <Link
            href="/cart?tab=sewa-alat"
            className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#1a2610] hover:text-[#344d15] transition group"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-[#cfd6c9] flex items-center justify-center text-[#1a2610] group-hover:bg-[#EAEDE7] transition shadow-2xs">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Keranjang Sewa</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#526046] shadow-2xs tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#344d15]" />
            <span>{totalRentalUnits} Unit ({rentalCartItems.length} Jenis Alat)</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Kolom Kiri: Daftar Alat & Formulir Jadwal/Lahan */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            {/* 1. Daftar Unit Alat Yang Diajukan */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-7 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#EAEDE7]">
                <div className="flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-[#233414]" />
                  <h3 className="font-extrabold text-[#1a2610] text-xs sm:text-sm uppercase tracking-wider">
                    Unit Alat Pertanian ({rentalCartItems.length})
                  </h3>
                </div>
                <Link
                  href="/cart?tab=sewa-alat"
                  className="px-3 py-1 rounded-full text-xs font-bold text-[#344d15] bg-[#e2f2c8]/60 hover:bg-[#e2f2c8] border border-[#c9e39e] transition cursor-pointer"
                >
                  Ubah
                </Link>
              </div>

              <div className="divide-y divide-[#EAEDE7]">
                {rentalCartItems.map((item) => {
                  const itemTotal = calculateRentalItemTotal(item);
                  return (
                    <div key={item.id} className="py-4 first:pt-4 last:pb-1 flex items-center gap-4">
                      <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#EAEDE7] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getPrimaryImage(
                            item.imageUrl,
                            'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=300&q=80'
                          )}
                          alt={item.nama}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('unsplash.com')) {
                              target.src =
                                'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=300&q=80';
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 py-0.5 space-y-1">
                        <h4 className="text-sm sm:text-base font-bold text-[#1a2610] truncate">
                          {item.nama}
                        </h4>
                        <div className="text-xs text-[#5b6950] tabular-nums">
                          {item.durasi} {item.satuanSewa || 'hari'} × Rp{' '}
                          {Number(item.hargaSewa).toLocaleString('id-ID')}
                          {item.includeOperator ? ' (+Operator)' : ''}
                        </div>
                        <div className="text-sm sm:text-base font-black text-[#1a2610] tabular-nums pt-1">
                          Rp {itemTotal.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-center shrink-0">
                        <span className="px-3.5 py-1.5 rounded-full border border-[#dce1d6] bg-[#f4f5f1] text-xs font-bold text-[#1a2610] tabular-nums shadow-2xs">
                          ×{item.jumlahUnit} unit
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Jadwal Penggunaan & Lokasi Lahan */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-7 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#EAEDE7] pb-3">
                <Calendar className="w-4 h-4 text-[#233414]" />
                <h3 className="font-extrabold text-[#1a2610] text-xs sm:text-sm uppercase tracking-wider">
                  Jadwal & Lokasi Lahan Kebun
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a2610] mb-1.5">
                  Mulai Tanggal Penggunaan <span className="text-[#c4242a]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={rentalStartDate}
                  onChange={(e) => setRentalStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9f6] border border-[#cfd6c9] rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] font-semibold text-xs sm:text-sm text-[#1a2610] transition tabular-nums"
                />
              </div>

              <div>
                <LocationMapPreview
                  value={rentalLokasiLahan}
                  onChange={setRentalLokasiLahan}
                  required={true}
                  label="Alamat Lengkap / Patokan Lahan Kebun"
                  placeholder="Contoh: Desa Kolongan, Kec. Kalawat, Minahasa Utara"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1a2610] text-xs sm:text-sm mb-1.5">
                  Catatan Operasional (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={rentalCatatan}
                  onChange={(e) => setRentalCatatan(e.target.value)}
                  placeholder="Contoh: Luas lahan sekitar 1 hektar..."
                  className="w-full p-3.5 text-xs sm:text-sm bg-[#fafafa] border border-[#cfd6c9] rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] text-[#1a2610] placeholder:text-[#5b6950] transition"
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Ringkasan Sticky & SlideCommit */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEDE7] sm:border-[#dce1d6] p-5 sm:p-7 space-y-5 shadow-2xs">
              <h2 className="text-base sm:text-lg font-bold text-[#1a2610] tracking-tight border-b border-[#EAEDE7] pb-3">
                Ringkasan Sewa Alat
              </h2>

              <div className="space-y-3 text-xs sm:text-[13px]">
                <div className="flex justify-between text-[#526046]">
                  <span>Total Unit Mesin</span>
                  <span className="font-semibold text-[#1a2610] tabular-nums">
                    {totalRentalUnits} Unit ({rentalCartItems.length} Jenis)
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Mulai Tanggal</span>
                  <span className="font-semibold text-[#1a2610] tabular-nums">
                    {rentalStartDate}
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Pembayaran</span>
                  <span className="font-semibold text-[#344d15]">
                    Tunai Kasir Koperasi
                  </span>
                </div>
              </div>

              <div className="border-t border-[#EAEDE7] pt-4 flex justify-between items-baseline">
                <span className="text-sm sm:text-base font-bold text-[#1a2610]">Total Estimasi Biaya:</span>
                <span className="text-2xl sm:text-3xl font-black text-[#1a2610] tracking-tight tabular-nums">
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
                  trackColor="#1a2610"
                  handleColor="#ffffff"
                  successColor="#233414"
                  height={54}
                  radius={27}
                  className="w-full shadow-sm"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#526046] justify-center pt-1">
                <ShieldCheck className="w-4 h-4 text-[#344d15]" />
                <span>Pengajuan resmi diverifikasi staf koperasi</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
