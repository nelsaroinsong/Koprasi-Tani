'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ChevronLeft,
  Store,
  Calendar,
  Package,
  Tractor,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Star,
  MapPin,
  ExternalLink,
  FileText,
  Clock,
  Loader2,
  ArrowRight,
  Phone,
  Building2,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const targetId = decodeURIComponent(unwrappedParams.id);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isSewaType = searchParams.get('type') === 'sewa';

  const { user } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [isRental, setIsRental] = useState(isSewaType);

  // Review Modal State (Pesanan Selesai)
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Info Koperasi
  const [warehouseAddress, setWarehouseAddress] = useState(
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara'
  );
  const [adminPhone, setAdminPhone] = useState('081944078924');

  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alamat) setWarehouseAddress(data.alamat);
        if (data?.telepon) setAdminPhone(data.telepon);
      })
      .catch(() => {});
  }, []);

  // Fetch data pesanan atau sewa alat
  useEffect(() => {
    async function loadDetail() {
      try {
        setIsLoading(true);

        // Coba cari di orders toko online terlebih dahulu
        const resOrders = await fetch('/api/orders').catch(() => null);
        if (resOrders && resOrders.ok) {
          const ordersList = await resOrders.json();
          const found = Array.isArray(ordersList)
            ? ordersList.find((o: any) => o.id === targetId || o.orderNumber === targetId)
            : null;

          if (found) {
            setOrderData(found);
            setIsRental(false);
            setIsLoading(false);
            return;
          }
        }

        // Jika tidak ketemu di orders toko, cari di sewa alat
        const resRentals = await fetch('/api/equipments/rent').catch(() => null);
        if (resRentals && resRentals.ok) {
          const rentalData = await resRentals.json();
          const rentalsList = Array.isArray(rentalData)
            ? rentalData
            : rentalData.rentals || rentalData.data || [];
          const found = rentalsList.find(
            (r: any) =>
              r.id === targetId ||
              r.rentalCode === targetId ||
              r.rentalNumber === targetId
          );

          if (found) {
            setOrderData(found);
            setIsRental(true);
            setIsLoading(false);
            return;
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching detail:', err);
        setIsLoading(false);
      }
    }

    loadDetail();
  }, [targetId]);

  // Alur 4 Tahap Toko Online
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return {
          step: 1,
          label: 'Menunggu Pembayaran Kasir',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          hint: 'Silakan kunjungi kantor koperasi untuk pembayaran tunai (cash) langsung saat serah terima barang.',
        };
      case 'DIPROSES':
        return {
          step: 2,
          label: 'Sedang Disiapkan Gudang',
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
          hint: 'Komoditas pesanan Anda sedang disortir dan ditimbang oleh petugas gudang koperasi.',
        };
      case 'SIAP_DIAMBIL':
        return {
          step: 3,
          label: 'Siap Diambil di Kantor',
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
          hint: 'Pesanan sudah siap! Silakan ambil di kantor Koperasi Sinar Pagi Sejahtera.',
        };
      case 'SELESAI':
        return {
          step: 4,
          label: 'Selesai & Lunas',
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          hint: 'Pesanan telah selesai diterima dan dibayar tunai di kasir koperasi. Terima kasih!',
        };
      case 'DIBATALKAN':
        return {
          step: 0,
          label: 'Pesanan Dibatalkan',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
          hint: 'Pesanan telah dibatalkan. Hubungi admin koperasi jika ada kendala.',
        };
      default:
        return {
          step: 1,
          label: status,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          hint: 'Status pesanan sedang diproses.',
        };
    }
  };

  // Status Sewa Alat
  const getRentalStatusConfig = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PERSETUJUAN_ADMIN':
        return {
          label: 'Menunggu Persetujuan',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          hint: 'Pengajuan sewa alat Anda sedang ditinjau oleh staf koperasi & pemilik alat.',
        };
      case 'DISETUJUI':
        return {
          label: 'Pengajuan Disetujui',
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
          hint: 'Pengajuan telah disetujui! Alat sedang disiapkan untuk pengambilan/pengantaran.',
        };
      case 'SIAP_DIAMBIL':
        return {
          label: 'Siap Diambil',
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-300',
          hint: 'Unit alat sudah siap diambil di pool/gudang koperasi pertanian.',
        };
      case 'SEDANG_DISEWA':
        return {
          label: 'Sedang Disewa',
          badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300',
          hint: 'Alat sedang beroperasi di lahan kebun pertanian Anda.',
        };
      case 'SELESAI':
        return {
          label: 'Sewa Selesai',
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          hint: 'Masa sewa telah selesai dan alat telah dikembalikan dalam kondisi baik.',
        };
      case 'DITOLAK':
        return {
          label: 'Pengajuan Ditolak',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
          hint: 'Pengajuan sewa tidak dapat diproses. Silakan hubungi admin koperasi.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          hint: 'Status sewa alat sedang diproses.',
        };
    }
  };

  const handleOpenWhatsApp = () => {
    if (!orderData) return;
    const cleanPhone = adminPhone.replace(/\D/g, '').replace(/^0/, '62');
    const invoiceNum = orderData.orderNumber || orderData.rentalCode || orderData.id;
    const text = `Halo Admin Koperasi Sinar Pagi Sejahtera, saya ingin bertanya mengenai pesanan #${invoiceNum}. Mohon infonya. Terima kasih!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSubmitReview = async () => {
    if (!reviewItem) return;
    try {
      setIsSubmittingReview(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: reviewItem.productId || reviewItem.product?.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      if (!res.ok) throw new Error('Gagal mengirim ulasan');

      showToast({ message: 'Ulasan dan penilaian berhasil dikirim!', type: 'success' });
      setReviewItem(null);
      setReviewComment('');
    } catch (err: any) {
      showToast({ message: err.message || 'Gagal mengirim ulasan', type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4">
        {/* Tombol Kembali ke Halaman Pesanan */}
        <div className="flex items-center justify-between">
          <Link
            href="/pesanan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Pesanan</span>
          </Link>

          <span className="text-[11px] font-semibold text-slate-400">
            {isRental ? 'Detail Pengajuan Sewa Alat' : 'Detail Pesanan Toko Online'}
          </span>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Memuat rincian data pesanan...</span>
          </div>
        ) : !orderData ? (
          <div className="py-20 text-center bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Pesanan Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ID pesanan tidak terdaftar atau telah dihapus dari sistem. Silakan periksa kembali riwayat pesanan Anda.
            </p>
            <Link
              href="/pesanan"
              className="inline-block px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition"
            >
              Lihat Semua Pesanan
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Kartu Utama Rincian */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Header Kartu */}
              <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs sm:text-sm">
                    {isRental ? (
                      <Tractor className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Store className="w-4 h-4 text-emerald-700" />
                    )}
                    <span>Koperasi Sinar Pagi Sejahtera</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(orderData.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-[11px] text-emerald-800 font-bold">
                    #{orderData.orderNumber || orderData.rentalCode || orderData.id}
                  </span>
                </div>

                {isRental ? (
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${
                      getRentalStatusConfig(orderData.status).badgeClass
                    }`}
                  >
                    {getRentalStatusConfig(orderData.status).label}
                  </span>
                ) : (
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${
                      getStatusConfig(orderData.status).badgeClass
                    }`}
                  >
                    {getStatusConfig(orderData.status).label}
                  </span>
                )}
              </div>

              {/* Visual Stepper 4 Tahap (Khusus Toko Online) */}
              {!isRental && orderData.status !== 'DIBATALKAN' && (
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-b from-emerald-50/30 to-transparent">
                  <div className="max-w-2xl mx-auto py-1">
                    <div className="grid grid-cols-4 gap-1 text-center relative">
                      {/* Background Bar */}
                      <div className="absolute top-3 sm:top-3.5 left-[12%] right-[12%] h-1 bg-slate-200 -z-0 rounded-full" />
                      {/* Active Bar */}
                      <div
                        className="absolute top-3 sm:top-3.5 left-[12%] h-1 bg-emerald-600 -z-0 rounded-full transition-all duration-500"
                        style={{
                          width:
                            getStatusConfig(orderData.status).step === 1
                              ? '0%'
                              : getStatusConfig(orderData.status).step === 2
                              ? '38%'
                              : getStatusConfig(orderData.status).step === 3
                              ? '75%'
                              : '76%',
                        }}
                      />

                      {/* Step 1 */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 1
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step > 1 ? '✓' : '1'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-800 mt-1">Pesanan Masuk</span>
                        <span className="text-[9px] text-slate-400">Kasir Koperasi</span>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 2
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step > 2 ? '✓' : '2'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-800 mt-1">Disiapkan Gudang</span>
                        <span className="text-[9px] text-slate-400">Pengecekan Fisik</span>
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 3
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step > 3 ? '✓' : '3'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-800 mt-1">Siap Diambil</span>
                        <span className="text-[9px] text-slate-400">Ambil di Kantor</span>
                      </div>

                      {/* Step 4 */}
                      <div className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                            getStatusConfig(orderData.status).step >= 4
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {getStatusConfig(orderData.status).step >= 4 ? '✓' : '4'}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-800 mt-1">Selesai</span>
                        <span className="text-[9px] text-slate-400">Lunas & Sah</span>
                      </div>
                    </div>

                    {/* Hint Box */}
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{getStatusConfig(orderData.status).hint}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Hint Sewa Alat */}
              {isRental && (
                <div className="p-3 sm:p-4 bg-emerald-50/70 border-b border-emerald-100/80 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{getRentalStatusConfig(orderData.status).hint}</span>
                </div>
              )}

              {/* Daftar Barang / Alat */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {isRental
                    ? `Daftar Alat Disewa (${orderData.items?.length || 1} Unit)`
                    : `Rincian Komoditas (${orderData.items?.length || 1} Barang)`}
                </div>

                <div className="space-y-3">
                  {!isRental &&
                    orderData.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/60 border border-slate-200/80"
                      >
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.nama}
                            className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 text-xl font-bold shadow-2xs">
                            🌾
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                            {item.namaProduk || item.product?.nama || 'Komoditas Pertanian'}
                          </h4>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.quantity} {item.satuan || item.product?.satuan || 'unit'} × Rp{' '}
                            {Number(item.hargaPerSatuan).toLocaleString('id-ID')}
                          </div>
                          {item.petani?.name && (
                            <div className="text-xs text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                              <span>🌾 Mitra Petani:</span>
                              <strong>{item.petani.name}</strong>
                            </div>
                          )}

                          {orderData.status === 'SELESAI' && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setReviewItem(item)}
                                className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                <span>Beri Ulasan</span>
                              </button>
                              <Link
                                href={`/toko/${item.productId || item.product?.id}`}
                                className="text-xs text-emerald-700 hover:underline font-semibold"
                              >
                                Lihat Halaman Produk →
                              </Link>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-slate-400 font-medium">Subtotal</div>
                          <div className="text-sm font-black text-slate-900 mt-0.5">
                            Rp {Number(item.subtotal).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Sewa Alat Items */}
                  {isRental &&
                    orderData.items?.map((item: any, idx: number) => {
                      const itemName = item.nama || item.equipmentName || 'Alat Pertanian';
                      const itemQty = Number(item.jumlahUnit || item.quantity) || 1;
                      const itemPrice = Number(item.hargaSewa ?? item.pricePerDay) || 0;
                      const itemDuration =
                        Number(item.durasi || item.rentalDays || orderData.durationDays || orderData.durasi) || 1;
                      const itemUnit = item.satuanSewa || 'hari';
                      const itemSubtotal =
                        item.subtotal !== undefined && !isNaN(Number(item.subtotal))
                          ? Number(item.subtotal)
                          : itemPrice * itemQty * itemDuration;

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/60 border border-slate-200/80"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={itemName}
                              className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 text-xl font-bold shadow-2xs">
                              🚜
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">{itemName}</h4>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {itemQty} unit × Rp {itemPrice.toLocaleString('id-ID')} / {itemUnit}
                            </div>
                            <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                              Durasi: {itemDuration} {itemUnit} (Mulai {orderData.startDate})
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-slate-400 font-medium">Subtotal</div>
                            <div className="text-sm font-black text-slate-900 mt-0.5">
                              Rp {itemSubtotal.toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Informasi Pengambilan / Lokasi Kebun */}
              <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Info Lokasi */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <div className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isRental ? 'Lokasi Lahan Kebun Pertanian' : 'Lokasi Serah Terima & Kasir'}</span>
                  </div>
                  <div className="text-slate-800 font-medium leading-relaxed">
                    {isRental
                      ? orderData.lokasiLahan || orderData.farmLocationAddress || 'Wilayah Minahasa Utara'
                      : warehouseAddress}
                  </div>
                  {isRental && orderData.farmLocationGps && (
                    <div className="pt-1">
                      <a
                        href={`https://www.google.com/maps?q=${orderData.farmLocationGps.lat},${orderData.farmLocationGps.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Buka Koordinat GPS di Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Catatan Pembeli */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <div className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Catatan Pesanan</span>
                  </div>
                  <div className="text-slate-800 italic">
                    {orderData.catatan || orderData.notes ? (
                      <span>{orderData.catatan || orderData.notes}</span>
                    ) : (
                      <span className="text-slate-400">Tidak ada catatan khusus untuk pesanan ini.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rincian Pembayaran */}
              <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div>
                  <div className="text-xs text-slate-500">Metode Pembayaran:</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {orderData.paymentMethod === 'CASH_KOPERASI' || isRental
                      ? 'Bayar Tunai di Kasir Koperasi'
                      : 'Transfer Bank'}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-slate-500">Total Pembayaran:</div>
                  <div className="text-xl font-black text-emerald-800 tracking-tight mt-0.5">
                    Rp{' '}
                    {Number(
                      orderData.totalAmount ?? orderData.totalEstimasi ?? 0
                    ).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-100/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="text-slate-500 text-[11px]">
                  Ada pertanyaan seputar pesanan ini? Hubungi langsung staf/admin koperasi.
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-100" />
                    <span>Chat Admin WhatsApp</span>
                  </button>

                  <Link
                    href={isRental ? '/sewa-alat' : '/toko'}
                    className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-white bg-slate-50 text-slate-700 font-bold text-xs transition"
                  >
                    {isRental ? 'Sewa Alat Lain' : 'Beli Lagi'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Dialog Beri Ulasan */}
      {reviewItem && (
        <div
          onClick={() => setReviewItem(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Beri Penilaian & Ulasan</h3>
                <p className="text-xs text-slate-500">Bagikan kepuasan Anda setelah pesanan selesai diterima</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Penilaian (Bintang 1 - 5):</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-2xl transition hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-700 ml-2">{reviewRating} dari 5 Bintang</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Ulasan Anda:</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tulis ulasan mengenai kualitas komoditas, kesegaran, atau keramahan pelayanan koperasi..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleSubmitReview}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Kirim Ulasan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
