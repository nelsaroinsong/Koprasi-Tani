'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import SlideCommit from '@/components/ui/SlideCommit';
import LocationMapPreview from '@/components/LocationMapPreview';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
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
  ExternalLink,
  Banknote,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { getPrimaryImage } from '@/lib/utils';
import { validateMinahasaUtaraAddress, isMinahasaUtaraAddress } from '@/lib/address-validation';
import { addDays, occupiedDays, todayWita, computePaymentDeadline } from '@/lib/rental-schedule';
import { BATAS_BATAL_HARI, DENDA_PER_HARI, DP_PERSEN, hitungDp } from '@/lib/rental-policy';
import {
  getRentalCart,
  clearRentalCart,
  calculateRentalCartTotal,
  calculateRentalItemTotal,
  type RentalCartItem,
} from '@/lib/rental-cart';

/** Pemesanan paling jauh (sama dengan batas di server) */
const MAX_BOOKING_DAYS = 90;

export default function CheckoutSewaAlatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [rentalCartItems, setRentalCartItems] = useState<RentalCartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [rentalStartDate, setRentalStartDate] = useState(() => todayWita());
  // Sisa unit per alat per tanggal (dari kalender ketersediaan server)
  const [availability, setAvailability] = useState<
    Record<string, { jedaHari: number; sisa: Record<string, number> }>
  >({});
  const [rentalLokasiLahan, setRentalLokasiLahan] = useState(user?.address || '');
  const [patokanLahan, setPatokanLahan] = useState('');
  const [rentalGpsCoords, setRentalGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rentalCatatan, setRentalCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rentalOrderError, setRentalOrderError] = useState<string | null>(null);
  const [createdRentalResult, setCreatedRentalResult] = useState<any | null>(null);

  const [adminPhone, setAdminPhone] = useState('081944078924');

  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
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

  // Muat kalender ketersediaan untuk setiap alat di keranjang (90 hari ke depan)
  const cartEquipmentIds = useMemo(
    () => [...new Set(rentalCartItems.map((it) => it.equipmentId))].sort().join(','),
    [rentalCartItems]
  );
  useEffect(() => {
    if (!cartEquipmentIds) return;
    let active = true;
    const from = todayWita();
    const to = addDays(from, MAX_BOOKING_DAYS + 14);
    Promise.all(
      cartEquipmentIds.split(',').map((id) =>
        fetch(`/api/equipments/${id}/availability?from=${from}&to=${to}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => [id, d] as const)
          .catch(() => [id, null] as const)
      )
    ).then((results) => {
      if (!active) return;
      const next: Record<string, { jedaHari: number; sisa: Record<string, number> }> = {};
      for (const [id, d] of results) {
        if (!d?.days) continue;
        next[id] = {
          jedaHari: d.jedaHari || 0,
          sisa: Object.fromEntries(d.days.map((day: any) => [day.date, day.sisa])),
        };
      }
      setAvailability(next);
    });
    return () => {
      active = false;
    };
  }, [cartEquipmentIds]);

  /** Tanggal mulai tidak bisa dipilih jika ada alat di keranjang yang unitnya kurang pada rentang pakainya (+ jeda) */
  const isStartDateUnavailable = useMemo(() => {
    return (date: string) =>
      rentalCartItems.some((it) => {
        const av = availability[it.equipmentId];
        if (!av) return false;
        const lastDay = addDays(date, occupiedDays(it.satuanSewa, it.durasi) - 1 + av.jedaHari);
        const needed = rentalCartItems
          .filter((o) => o.equipmentId === it.equipmentId)
          .reduce((sum, o) => sum + (o.jumlahUnit || 1), 0);
        for (let d = date; d <= lastDay; d = addDays(d, 1)) {
          const sisa = av.sisa[d];
          if (sisa === undefined || sisa < needed) return true;
        }
        return false;
      });
  }, [availability, rentalCartItems]);

  const selectedDateUnavailable = Boolean(rentalStartDate) && isStartDateUnavailable(rentalStartDate);

  const totalRentalUnits = useMemo(() => {
    return rentalCartItems.reduce((acc, curr) => acc + (curr.jumlahUnit || 1), 0);
  }, [rentalCartItems]);

  const isAddressValid = useMemo(() => {
    if (!rentalLokasiLahan || rentalLokasiLahan.trim().length < 4) return false;
    return isMinahasaUtaraAddress(rentalLokasiLahan);
  }, [rentalLokasiLahan]);

  const combinedLocationAddress = useMemo(() => {
    const base = rentalLokasiLahan.trim();
    const landmark = patokanLahan.trim();
    if (!landmark) return base;
    return `${base} (Patokan: ${landmark})`;
  }, [rentalLokasiLahan, patokanLahan]);

  const canSubmitRental = useMemo(() => {
    return (
      !isSubmitting &&
      rentalCartItems.length > 0 &&
      Boolean(rentalStartDate) &&
      !selectedDateUnavailable &&
      isAddressValid
    );
  }, [isSubmitting, rentalCartItems.length, rentalStartDate, selectedDateUnavailable, isAddressValid]);

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

    const addressCheck = validateMinahasaUtaraAddress(rentalLokasiLahan, true);
    if (!addressCheck.isValid) {
      throw new Error(
        addressCheck.error ||
          'Alamat lahan kebun wajib berada di wilayah Kabupaten Minahasa Utara (Minut).'
      );
    }

    try {
      setIsSubmitting(true);
      setRentalOrderError(null);

      const res = await fetch('/api/equipments/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: rentalStartDate,
          lokasiLahan: combinedLocationAddress,
          farmLocationGps: rentalGpsCoords,
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
      setCreatedRentalResult({
        ...data,
        savedLocationAddress: combinedLocationAddress,
        savedGpsCoords: rentalGpsCoords,
      });
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
    const gps = rental.farmLocationGps || rentalGpsCoords;

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
  gps
    ? `*Titik GPS Lahan:* ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}\nMaps: https://www.google.com/maps?q=${gps.lat},${gps.lng}\n`
    : ''
}*Total Biaya Estimasi:* Rp ${Number(totalAmount).toLocaleString('id-ID')}
*Status:* ⏳ Menunggu Persetujuan Admin Koperasi
*Metode Pembayaran:* Tunai di Kasir Kantor Koperasi (Kolongan)

Daftar Alat Mesin:
${itemsSummary || '-'}

${notes ? `*Catatan Kebutuhan:* ${notes}\n` : ''}
*Komitmen:* Saya siap datang ke kasir kantor koperasi untuk pembayaran tunai setelah disetujui agar unit alat resmi terkunci. Terima kasih!`;

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

  // Tampilan Sukses Pengajuan Sewa
  if (createdRentalResult) {
    const rentalDate = createdRentalResult.createdAt
      ? new Date(createdRentalResult.createdAt)
      : new Date();
    const submittedAt = rentalDate.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Makassar',
    });
    const startDateLabel = createdRentalResult.startDate
      ? new Date(`${createdRentalResult.startDate}T00:00:00Z`).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '-';
    const total = Number(createdRentalResult.totalEstimasi || 0);
    const dp = hitungDp(total);
    const sisa = Math.max(0, total - dp);
    const dpDeadline = createdRentalResult.startDate
      ? computePaymentDeadline(createdRentalResult.startDate, 'H_MINUS_1').toLocaleString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Makassar',
        })
      : null;
    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    const finalLocationText =
      createdRentalResult.savedLocationAddress ||
      rentalLokasiLahan ||
      'Minahasa Utara, Sulawesi Utara';
    const finalGps = createdRentalResult.savedGpsCoords || rentalGpsCoords;

    const steps = [
      {
        title: 'Verifikasi pengurus',
        desc: 'Admin mengecek jadwal & ketersediaan unit. Status bisa dipantau di halaman Pesanan.',
        active: true,
      },
      {
        title: `Bayar DP ${DP_PERSEN}% di kasir`,
        desc: `${rp(dp)} tunai${dpDeadline ? `, paling lambat ${dpDeadline} WITA` : ''} untuk mengunci jadwal.`,
        active: false,
      },
      {
        title: 'Lunasi sisa & ambil alat',
        desc: `${rp(sisa)} dibayar saat pengambilan pada tanggal mulai sewa.`,
        active: false,
      },
    ];

    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
        <AppHeader activePage="sewa-alat" />

        <main className="flex-1 w-full max-w-[420px] mx-auto px-4 pt-5 sm:pt-10 pb-32 lg:pb-12 space-y-3.5">
          {/* Kartu ringkasan */}
          <section className="bg-white rounded-3xl border border-[#dce1d6] overflow-hidden">
            <div className="px-5 pt-6 pb-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#eef6e2] ring-8 ring-[#f6faef] flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#344d15]" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-xl sm:text-2xl font-black text-[#1a2610] tracking-tight">
                Pengajuan Terkirim
              </h1>
              <p className="mt-1 text-[13px] text-[#526046] leading-relaxed max-w-[280px] mx-auto">
                Pengurus koperasi akan memverifikasi pengajuan sewa Anda.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                Menunggu persetujuan admin
              </span>
            </div>

            {/* Garis sobekan tiket */}
            <div className="relative flex items-center" aria-hidden="true">
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-[#f4f5f1] border border-[#dce1d6]" />
              <div className="w-full border-t-2 border-dashed border-[#e3e8dd] mx-5" />
              <div className="absolute -right-3 w-6 h-6 rounded-full bg-[#f4f5f1] border border-[#dce1d6]" />
            </div>

            <dl className="px-5 py-4 divide-y divide-[#eef1ea] text-[13px]">
              <div className="flex items-center justify-between gap-3 pb-2.5">
                <dt className="text-[#5b6950]">No. Sewa</dt>
                <dd className="font-mono font-bold text-[#1a2610] tabular-nums">#{createdRentalResult.rentalCode}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="text-[#5b6950] shrink-0">Mulai sewa</dt>
                <dd className="font-semibold text-[#1a2610] text-right">{startDateLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[#5b6950]">Diajukan</dt>
                <dd className="font-medium text-[#1a2610] tabular-nums">{submittedAt} WITA</dd>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2.5">
                <dt className="text-[#5b6950]">Estimasi biaya</dt>
                <dd className="text-base font-black text-[#1a2610] tabular-nums">{rp(total)}</dd>
              </div>
            </dl>

            {/* Lokasi */}
            <div className="mx-5 mb-5 p-3 rounded-2xl bg-[#f4f5f1] border border-[#e3e8dd] flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#233414] text-[#D4F63D] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-[#1a2610]">Lokasi lahan</span>
                  {finalGps && (
                    <a
                      href={`https://www.google.com/maps?q=${finalGps.lat},${finalGps.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-[32px] px-2 -mr-2 rounded-lg text-xs font-bold text-[#233414] hover:bg-white transition"
                    >
                      Buka Maps
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-[#526046] leading-relaxed line-clamp-2">{finalLocationText}</p>
              </div>
            </div>
          </section>

          {/* Langkah selanjutnya */}
          <section className="bg-white rounded-3xl border border-[#dce1d6] p-5">
            <h2 className="text-sm font-extrabold text-[#1a2610]">Langkah selanjutnya</h2>
            <ol className="mt-3.5">
              {steps.map((step, i) => (
                <li key={step.title} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className="absolute left-[13px] top-7 bottom-0 w-px bg-[#dce1d6]" aria-hidden="true" />
                  )}
                  <span
                    className={`relative z-10 w-[27px] h-[27px] rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      step.active ? 'bg-[#233414] text-[#D4F63D]' : 'bg-[#f0f3ec] text-[#5b6950] border border-[#dce1d6]'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13px] font-bold text-[#1a2610]">{step.title}</p>
                    <p className="text-xs text-[#526046] leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 pt-3.5 border-t border-[#eef1ea] flex items-start gap-2 text-xs text-[#526046]">
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#344d15]" aria-hidden="true" />
              <span>
                Kasir Kantor Koperasi Kolongan, 08:00–16:30 WITA. Batal paling lambat H-{BATAS_BATAL_HARI} agar DP kembali penuh.
              </span>
            </div>
          </section>

          {/* Aksi */}
          <div className="space-y-2.5 pt-1">
            <Link
              href="/pesanan"
              className="w-full min-h-[48px] rounded-2xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              Lihat Status Pesanan
              <ArrowRight className="w-4 h-4 text-[#D4F63D]" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() =>
                handleOpenRentalWhatsApp({
                  rentalNumber: createdRentalResult.rentalCode,
                  userName: user?.name,
                  userPhone: user?.phone,
                  startDate: createdRentalResult.startDate,
                  durationDays: 1,
                  farmLocationAddress: finalLocationText,
                  farmLocationGps: finalGps,
                  totalAmount: createdRentalResult.totalEstimasi,
                  notes: rentalCatatan,
                  items: createdRentalResult.rentalOrder?.items,
                })
              }
              className="w-full min-h-[48px] rounded-2xl bg-white hover:bg-[#f0f3ec] text-[#1a2610] border border-[#cfd6c9] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#344d15]" aria-hidden="true" />
              Konfirmasi via WhatsApp
            </button>
            <Link
              href="/sewa-alat"
              className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#526046] hover:text-[#233414] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Kembali ke Katalog Sewa Alat
            </Link>
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
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans">
      <div className="hidden sm:block">
        <AppHeader activePage="sewa-alat" />
      </div>

      {/* Mobile Top Bar (Fixed di top, solid white, clean & minimal) */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white px-3.5 h-14 flex items-center justify-between border-b border-[#dce1d6]">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] transition cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-extrabold text-[#1a2610] tracking-tight">
            Checkout Sewa Alat
          </h1>
          <p className="text-[10px] font-semibold text-[#526046] tabular-nums">
            {totalRentalUnits} Unit • Area Minahasa Utara
          </p>
        </div>

        <Link
          href="/cart?tab=sewa-alat"
          className="px-2.5 py-1 rounded-lg bg-[#f4f5f1] text-[11px] font-bold text-[#233414] border border-[#dce1d6]"
        >
          Ubah
        </Link>
      </div>
      {/* Spacer placeholder mode mobile agar konten tidak tertutup fixed navbar */}
      <div className="sm:hidden h-14 shrink-0 pointer-events-none" aria-hidden="true" />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3.5 sm:px-8 lg:px-12 py-3.5 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 pb-36 lg:pb-12 min-w-0">
        {/* Desktop Compact Back Link */}
        <div className="hidden sm:flex items-center justify-between pb-1">
          <Link
            href="/cart?tab=sewa-alat"
            className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#1a2610] hover:text-[#344d15] transition group"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-[#cfd6c9] flex items-center justify-center text-[#1a2610] group-hover:bg-[#EAEDE7] transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Keranjang Sewa</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#dce1d6] text-xs font-semibold text-[#526046] tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#344d15]" />
            <span>{totalRentalUnits} Unit ({rentalCartItems.length} Jenis Alat)</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start min-w-0 max-w-full">
          {/* Kolom Kiri: Daftar Alat & Formulir Jadwal/Lahan */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-5 min-w-0 max-w-full">
            {/* 1. Daftar Unit Alat Yang Diajukan */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#dce1d6] p-4 sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAEDE7]">
                <div className="flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-[#233414]" />
                  <h3 className="font-extrabold text-[#1a2610] text-xs sm:text-sm uppercase tracking-wider">
                    Unit Alat Pertanian ({rentalCartItems.length})
                  </h3>
                </div>
                <Link
                  href="/cart?tab=sewa-alat"
                  className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold text-[#233414] bg-[#f4f5f1] hover:bg-[#e8ece2] border border-[#dce1d6] transition cursor-pointer"
                >
                  Ubah Alat
                </Link>
              </div>

              <div className="divide-y divide-[#EAEDE7]">
                {rentalCartItems.map((item) => {
                  const itemTotal = calculateRentalItemTotal(item);
                  return (
                    <div key={item.id} className="py-3.5 first:pt-3.5 last:pb-0.5 flex items-center gap-3.5">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-[#f4f5f1] border border-[#dce1d6] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getPrimaryImage(
                            item.imageUrl,
                            '/api/images/categories/alat.jpg'
                          )}
                          alt={item.nama}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('/api/images/categories/')) {
                              target.src =
                                '/api/images/categories/alat.jpg';
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs sm:text-base font-bold text-[#1a2610] truncate">
                          {item.nama}
                        </h4>
                        <div className="text-[11px] sm:text-xs text-[#526046] tabular-nums">
                          {item.durasi} {item.satuanSewa || 'hari'} × Rp{' '}
                          {Number(item.hargaSewa).toLocaleString('id-ID')}
                          {item.includeOperator ? ' • +Operator' : ''}
                        </div>
                        <div className="text-xs sm:text-base font-black text-[#1a2610] tabular-nums pt-0.5">
                          Rp {itemTotal.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-center shrink-0">
                        <span className="px-2.5 py-1 rounded-lg border border-[#dce1d6] bg-[#f4f5f1] text-[11px] sm:text-xs font-bold text-[#1a2610] tabular-nums">
                          ×{item.jumlahUnit} unit
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Jadwal Penggunaan & Peta Titik Lahan Kebun */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#dce1d6] p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAEDE7] pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#233414]" />
                  <h3 className="font-extrabold text-[#1a2610] text-xs sm:text-sm uppercase tracking-wider">
                    Jadwal & Titik Lokasi Lahan
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#233414] bg-[#f4f5f1] border border-[#dce1d6] px-2 py-0.5 rounded-md">
                  Wajib Area Minut
                </span>
              </div>

              {/* Input Tanggal & Patokan dalam Grid Responsif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                <div>
                  <CustomDatePicker
                    label="Mulai Tanggal Pakai"
                    required
                    value={rentalStartDate}
                    onChange={setRentalStartDate}
                    maxDate={addDays(todayWita(), MAX_BOOKING_DAYS)}
                    isDateDisabled={isStartDateUnavailable}
                  />
                  <p
                    className={`text-[10.5px] mt-1.5 font-semibold ${
                      selectedDateUnavailable ? 'text-red-700' : 'text-[#68785b]'
                    }`}
                  >
                    {selectedDateUnavailable
                      ? 'Unit sudah penuh / sedang servis pada tanggal ini. Pilih tanggal lain.'
                      : 'Tanggal yang dicoret sudah penuh atau sedang servis.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#526046] uppercase tracking-wider mb-1.5">
                    Patokan Jalan Masuk (Opsional)
                  </label>
                  <input
                    type="text"
                    value={patokanLahan}
                    onChange={(e) => setPatokanLahan(e.target.value)}
                    placeholder="Misal: Depan Gereja / Masuk lorong 50m"
                    className="w-full px-3.5 py-2.5 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl focus:bg-white focus:outline-none focus:border-[#233414] font-semibold text-xs sm:text-sm text-[#1a2610] placeholder:text-[#7c8772] transition"
                  />
                </div>
              </div>

              {/* Peta Interaktif Grab-Style */}
              <div>
                <LocationMapPreview
                  value={rentalLokasiLahan}
                  onChange={setRentalLokasiLahan}
                  onCoordinatesChange={setRentalGpsCoords}
                  required={true}
                  label="Pilih Titik Lahan di Peta (Geser Pin atau Tap)"
                  placeholder="Contoh: Desa Kolongan, Kec. Kalawat, Kab. Minahasa Utara"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#526046] uppercase tracking-wider mb-1.5">
                  Catatan Operasional Lahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={rentalCatatan}
                  onChange={(e) => setRentalCatatan(e.target.value)}
                  placeholder="Contoh: Luas lahan sekitar 1 hektar, kondisi tanah kering..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#f4f5f1] border border-[#dce1d6] rounded-xl focus:bg-white focus:outline-none focus:border-[#233414] font-semibold text-[#1a2610] placeholder:text-[#7c8772] transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Ringkasan Sticky & SlideCommit */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#dce1d6] p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-extrabold text-[#1a2610] tracking-tight border-b border-[#EAEDE7] pb-3 uppercase">
                Ringkasan Pengajuan Sewa
              </h2>

              <div className="space-y-2.5 text-xs sm:text-[13px]">
                <div className="flex justify-between text-[#526046]">
                  <span>Total Unit Mesin</span>
                  <span className="font-bold text-[#1a2610] tabular-nums">
                    {totalRentalUnits} Unit ({rentalCartItems.length} Jenis)
                  </span>
                </div>
                <div className="flex justify-between text-[#526046]">
                  <span>Mulai Tanggal</span>
                  <span className="font-bold text-[#1a2610] tabular-nums">
                    {rentalStartDate}
                  </span>
                </div>
                {rentalGpsCoords && (
                  <div className="flex justify-between text-[#526046]">
                    <span>Koordinat Pin Lahan</span>
                    <span className="font-mono font-semibold text-[#233414] text-[11px] tabular-nums">
                      {rentalGpsCoords.lat.toFixed(5)}, {rentalGpsCoords.lng.toFixed(5)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[#526046]">
                  <span>Metode Pembayaran</span>
                  <span className="font-bold text-[#233414]">
                    Tunai Kasir Koperasi
                  </span>
                </div>
              </div>

              {/* Info Kasir Koperasi & Kunci Stok */}
              <div className="p-3 bg-[#f8faf4] border border-[#dce6d2] rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#233414]">
                  <Banknote className="w-4 h-4 text-[#344d15]" />
                  <span>Ketentuan Pembayaran Kasir</span>
                </div>
                <ul className="text-[11px] text-[#425234] leading-relaxed space-y-1 list-disc pl-4">
                  <li>
                    Semua pembayaran <strong>tunai di kasir kantor koperasi</strong>.
                  </li>
                  <li>
                    Setelah disetujui admin, bayar <strong>DP {DP_PERSEN}% (Rp {hitungDp(totalRentalAmount).toLocaleString('id-ID')})</strong>{' '}
                    paling lambat{' '}
                    <strong>
                      {rentalStartDate
                        ? computePaymentDeadline(rentalStartDate, 'H_MINUS_1').toLocaleString('id-ID', {
                            timeZone: 'Asia/Makassar',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'H-1'}{' '}
                      WITA
                    </strong>{' '}
                    untuk mengunci jadwal.
                  </li>
                  <li>
                    Sisa <strong>Rp {(totalRentalAmount - hitungDp(totalRentalAmount)).toLocaleString('id-ID')}</strong> dilunasi saat
                    mengambil alat.
                  </li>
                  <li>
                    Batal paling lambat <strong>H-{BATAS_BATAL_HARI}</strong>: DP kembali penuh. Lebih mepet: DP hangus.
                  </li>
                  <li>
                    Terlambat mengembalikan: denda <strong>Rp {DENDA_PER_HARI.toLocaleString('id-ID')}/unit/hari</strong>.
                    Kerusakan ditagihkan sesuai pengecekan saat pengembalian.
                  </li>
                </ul>
                <div className="flex items-center gap-2 text-[10px] text-[#526046] font-semibold pt-1 border-t border-[#e2ebd6]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#344d15]" />
                  <span>Lokasi: Kantor Koperasi Kolongan (08:00 – 16:30 WITA)</span>
                </div>
              </div>

              <div className="border-t border-[#EAEDE7] pt-3.5 flex justify-between items-baseline">
                <span className="text-xs sm:text-sm font-bold text-[#526046]">
                  Total Estimasi Biaya
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#1a2610] tracking-tight tabular-nums">
                  Rp {totalRentalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              {rentalOrderError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{rentalOrderError}</span>
                </div>
              )}

              {/* Alert ringkas jika lokasi kebun di luar Minut */}
              {rentalLokasiLahan && rentalLokasiLahan.trim().length >= 4 && !isAddressValid && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-red-950">Pengajuan Terkunci</div>
                    <div className="text-red-800 leading-relaxed text-[11px]">
                      Titik lahan berada di luar Kabupaten Minahasa Utara. Geser pin peta ke wilayah <strong>Minahasa Utara (Minut)</strong> untuk membuka tombol pengajuan.
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop SlideCommit */}
              <div className="hidden lg:block pt-1">
                <SlideCommit
                  label={
                    !isAddressValid
                      ? 'Terkunci: Lokasi Wajib di Minut'
                      : 'Geser untuk Ajukan Sewa Alat'
                  }
                  onConfirm={handleConfirmRentalOrder}
                  disabled={!canSubmitRental}
                  trackColor={!isAddressValid ? '#450a0a' : '#1a2610'}
                  handleColor="#ffffff"
                  successColor="#233414"
                  height={52}
                  radius={26}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#526046] justify-center pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#344d15]" />
                <span>Diverifikasi pengurus sebelum alat siap diambil</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar (Memudahkan jempol di layar HP & aman dari home indicator) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#dce1d6] px-3.5 pt-2.5 pb-[max(14px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-[10px] font-bold text-[#526046] uppercase tracking-wider block">
                Total Estimasi ({totalRentalUnits} Unit)
              </span>
              <span className="text-base font-black text-[#1a2610] tabular-nums">
                Rp {totalRentalAmount.toLocaleString('id-ID')}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                isAddressValid
                  ? 'bg-[#eef4e8] text-[#233414]'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {isAddressValid ? 'Lokasi Minut Valid' : 'Pilih Titik di Minut'}
            </span>
          </div>

          <SlideCommit
            label={
              !isAddressValid
                ? 'Terkunci: Pilih Titik di Minut'
                : 'Geser untuk Ajukan Sewa Alat'
            }
            onConfirm={handleConfirmRentalOrder}
            disabled={!canSubmitRental}
            trackColor={!isAddressValid ? '#450a0a' : '#1a2610'}
            handleColor="#ffffff"
            successColor="#233414"
            height={48}
            radius={24}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
