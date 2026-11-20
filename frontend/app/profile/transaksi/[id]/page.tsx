'use client';

import { ORDER_STATUS_LABEL, RENTAL_STATUS_LABEL, rentalSummary, saleStatus } from '@/lib/transaction-labels';
import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ReceiptText,
  Tractor,
  TrendingUp,
  ArrowRight,
  Store,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface TransactionDetailData {
  id: string;
  type: 'TOKO_BELANJA' | 'SEWA_ALAT' | 'PENCAIRAN_PANEN';
  title: string;
  categoryLabel: string;
  refNumber: string;
  amount: number;
  isIncome: boolean;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  date: Date;
  dateLabel: string;
  timeLabel: string;
  itemsList: Array<{ name: string; qty: number; unit: string; price: number; subtotal: number }>;
  locationInfo?: string;
  notes?: string;
  raw: any;
}

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const targetId = decodeURIComponent(unwrappedParams.id);

  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [txData, setTxData] = useState<TransactionDetailData | null>(null);

  // Accordion open/collapse states
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  // Koperasi info for WhatsApp & pickup address
  const [adminPhone, setAdminPhone] = useState('081944078924');
  const [warehouseAddress, setWarehouseAddress] = useState(
    'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Minahasa Utara'
  );

  useEffect(() => {
    fetch('/api/koperasi/info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.telepon) setAdminPhone(data.telepon);
        if (data?.alamat) setWarehouseAddress(data.alamat);
      })
      .catch(() => {});
  }, []);

  // Fetch data & find matching transaction
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        const fetchOrdersPromise = fetch('/api/orders')
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);

        const fetchRentalsPromise = fetch('/api/equipments/rent')
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);

        const fetchPetaniPromise =
          user?.role === 'PETANI'
            ? fetch('/api/petani/dashboard')
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null)
            : Promise.resolve(null);

        const [ordersData, rentalsData, petaniData] = await Promise.all([
          fetchOrdersPromise,
          fetchRentalsPromise,
          fetchPetaniPromise,
        ]);

        let matched: TransactionDetailData | null = null;

        // 1. Search in Toko Orders
        if (ordersData?.orders && Array.isArray(ordersData.orders)) {
          const found = ordersData.orders.find(
            (o: any) =>
              `order-${o.id}` === targetId ||
              o.id === targetId ||
              o.orderNumber === targetId ||
              `#${o.orderNumber}` === targetId
          );

          if (found) {
            const d = new Date(found.createdAt || Date.now());
            const itemsList = (found.items || []).map((i: any) => ({
              name: i.namaProduk || i.product?.nama || 'Komoditas',
              qty: i.quantity || 1,
              unit: i.satuan || i.product?.satuan || 'unit',
              price: Number(i.hargaPerSatuan || 0),
              subtotal: Number(i.subtotal || 0),
            }));

            const statusLabel = ORDER_STATUS_LABEL[found.status] || found.status;

            matched = {
              id: `order-${found.id}`,
              type: 'TOKO_BELANJA',
              title: 'Koperasi Sinar Pagi Sejahtera',
              categoryLabel: 'Pesanan Toko Online',
              refNumber: `#${found.orderNumber}`,
              amount: Number(found.totalAmount || 0),
              isIncome: false,
              status: found.status,
              statusLabel,
              paymentMethod:
                found.paymentMethod === 'CASH_KOPERASI'
                  ? 'Bayar Tunai di Kasir Koperasi'
                  : 'Transfer Bank Koperasi',
              date: d,
              dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
              timeLabel: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              itemsList,
              locationInfo: 'Kantor & Gudang Koperasi',
              notes: found.catatan || undefined,
              raw: found,
            };
          }
        }

        // 2. Search in Rentals
        if (!matched && rentalsData?.rentals && Array.isArray(rentalsData.rentals)) {
          const found = rentalsData.rentals.find(
            (r: any) =>
              `rental-${r.id}` === targetId ||
              r.id === targetId ||
              r.rentalCode === targetId ||
              `#${r.rentalCode}` === targetId
          );

          if (found) {
            const d = new Date(found.createdAt || Date.now());
            const rs = rentalSummary(found);
            const statusLabel = RENTAL_STATUS_LABEL[found.status] || found.status;

            matched = {
              id: `rental-${found.id}`,
              type: 'SEWA_ALAT',
              title: rs.name,
              categoryLabel: 'Pengajuan Sewa Alat Tani',
              refNumber: rs.ref,
              amount: rs.total,
              isIncome: false,
              status: found.status,
              statusLabel,
              paymentMethod: 'Bayar Tunai di Kasir Koperasi',
              date: d,
              dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
              timeLabel: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              itemsList: (found.items || []).map((i: any) => ({
                name: `${i.nama}${i.jumlahUnit > 1 ? ` (${i.jumlahUnit} unit)` : ''}`,
                qty: Number(i.durasi) || 1,
                unit: i.satuanSewa || 'hari',
                price: Number(i.hargaSewa || 0) * (Number(i.jumlahUnit) || 1),
                subtotal: Number(i.subtotal || 0),
              })),
              locationInfo: found.lokasiLahan || 'Minahasa Utara',
              notes: found.catatan || found.notes || undefined,
              raw: found,
            };
          }
        }

        // 3. Search in Farmer Sales
        if (!matched && petaniData?.recentSales && Array.isArray(petaniData.recentSales)) {
          const found = petaniData.recentSales.find(
            (s: any) =>
              `sale-${s.id}` === targetId ||
              s.id === targetId ||
              s.orderNumber === targetId ||
              `#${s.orderNumber}` === targetId
          );

          if (found) {
            const d = new Date(found.orderDate || found.createdAt || Date.now());
            const sale = saleStatus(found);

            matched = {
              id: `sale-${found.id}`,
              type: 'PENCAIRAN_PANEN',
              title: `Hasil Panen: ${found.namaProduk}`,
              categoryLabel: 'Pencairan Dana Penjualan Panen',
              refNumber: `#${found.orderNumber}`,
              amount: Number(found.subtotal || 0),
              isIncome: true,
              status: found.payoutStatus,
              statusLabel: sale.label,
              paymentMethod: 'Pencairan Kasir Koperasi',
              date: d,
              dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
              timeLabel: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              itemsList: [
                {
                  name: found.namaProduk,
                  qty: found.quantity || 1,
                  unit: found.satuan || 'kg',
                  price: Number(found.subtotal || 0) / (found.quantity || 1),
                  subtotal: Number(found.subtotal || 0),
                },
              ],
              locationInfo: 'Kantor & Gudang Koperasi',
              raw: found,
            };
          }
        }

        setTxData(matched);
      } catch (err) {
        console.error('Error loading transaction detail:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [targetId, user?.role]);

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col font-sans pb-28 sm:pb-16">
      <AppHeader />

      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <div className="p-10 bg-white rounded-2xl border border-[#dce1d6] text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#233414] animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#526046]">Memuat rincian transaksi...</p>
          </div>
        ) : !txData ? (
          <div className="p-10 bg-white rounded-2xl border border-[#dce1d6] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAEDE7] border border-[#cfd6c9] text-[#526046] flex items-center justify-center mx-auto">
              <ReceiptText className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-[#1a2610]">Transaksi Tidak Ditemukan</h2>
            <p className="text-xs text-[#5b6950] max-w-xs mx-auto">
              Nomor transaksi ini tidak ditemukan pada akun Anda atau sudah tidak tersedia.
            </p>
            <Link
              href="/profile/transaksi"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white text-xs font-bold transition"
            >
              <span>Buka Daftar Transaksi</span>
            </Link>
          </div>
        ) : (
          /* Card Frame Rincian Transaksi */
          <div className="bg-white rounded-2xl border border-[#dce1d6] overflow-hidden flex flex-col divide-y divide-[#EAEDE7]">
            {/* Header Card dengan Tombol Kembali */}
            <div className="p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push('/profile/transaksi')}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#f4f5f1] hover:bg-[#EAEDE7] border border-[#cfd6c9] text-[#1a2610] flex items-center justify-center transition cursor-pointer shrink-0"
                  title="Kembali ke Riwayat Transaksi"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Judul & Kategori Transaksi */}
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-black text-[#1a2610] tracking-tight leading-snug truncate">
                    {txData.title}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-[#5b6950] font-semibold mt-0.5 truncate">
                    {txData.categoryLabel}
                  </p>
                </div>
              </div>

              {/* Icon Badge Top-Right */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  txData.type === 'PENCAIRAN_PANEN'
                    ? 'bg-[#e2f2c8] text-[#233414] border-[#c9e39e]'
                    : txData.type === 'SEWA_ALAT'
                    ? 'bg-[#EAEDE7] text-[#233414] border-[#cfd6c9]'
                    : 'bg-[#233414] text-[#D4F63D] border-[#344d15]'
                }`}
              >
                {txData.type === 'PENCAIRAN_PANEN' ? (
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#233414]" />
                ) : txData.type === 'SEWA_ALAT' ? (
                  <Tractor className="w-4 h-4 sm:w-5 sm:h-5 text-[#233414]" />
                ) : (
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4F63D]" />
                )}
              </div>
            </div>

            {/* 1. OVERVIEW Section */}
            <div className="p-5 sm:p-6 space-y-4">
              <button
                type="button"
                onClick={() => setIsOverviewOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-black tracking-wider text-[#526046] uppercase hover:text-[#1a2610] transition cursor-pointer"
              >
                <span>OVERVIEW</span>
                {isOverviewOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isOverviewOpen && (
                <div className="space-y-3 pt-1 text-xs sm:text-sm animate-in fade-in duration-150">
                  {/* Total Transaksi */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#526046] font-medium">Total Nominal</span>
                    <span
                      className={`font-black text-base sm:text-lg tabular-nums ${
                        txData.isIncome ? 'text-[#344d15]' : 'text-[#c4242a]'
                      }`}
                    >
                      {txData.isIncome ? '+' : '-'}Rp {txData.amount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Nomor Referensi / Ticket ID */}
                  <div className="flex justify-between items-center py-1 border-t border-[#EAEDE7]">
                    <span className="text-[#526046] font-medium">Nomor Referensi</span>
                    <span className="font-bold text-[#1a2610] font-mono text-xs tabular-nums">{txData.refNumber}</span>
                  </div>

                  {/* Status Transaksi */}
                  <div className="flex justify-between items-center py-1 border-t border-[#EAEDE7]">
                    <span className="text-[#526046] font-medium">Status</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e2f2c8] text-[#233414] border border-[#c9e39e]">
                      {txData.statusLabel}
                    </span>
                  </div>

                  {/* Metode Bayar */}
                  <div className="flex justify-between items-center py-1 border-t border-[#EAEDE7]">
                    <span className="text-[#526046] font-medium">Metode Pembayaran</span>
                    <span className="font-semibold text-[#1a2610] text-right">{txData.paymentMethod}</span>
                  </div>

                  {/* Waktu Transaksi */}
                  <div className="flex justify-between items-center py-1 border-t border-[#EAEDE7]">
                    <span className="text-[#526046] font-medium">Waktu Transaksi</span>
                    <span className="font-semibold text-[#1a2610] text-right tabular-nums">
                      {txData.dateLabel}, {txData.timeLabel} WITA
                    </span>
                  </div>

                  {/* Item / Komoditas Breakdown */}
                  {txData.itemsList.length > 0 && (
                    <div className="py-2 border-t border-[#EAEDE7] space-y-1.5">
                      <div className="text-[#526046] font-medium text-xs">Rincian Komoditas:</div>
                      <div className="p-3 bg-[#f4f5f1] rounded-xl border border-[#dce1d6] space-y-2">
                        {txData.itemsList.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-[#1a2610] font-semibold">
                              {item.name} ({item.qty} {item.unit})
                            </span>
                            <span className="text-[#233414] font-bold tabular-nums">
                              Rp {item.subtotal.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lokasi Serah Terima */}
                  {txData.locationInfo && (
                    <div className="flex justify-between items-start py-1 border-t border-[#EAEDE7] gap-3">
                      <span className="text-[#526046] font-medium shrink-0">
                        {txData.type === 'SEWA_ALAT' ? 'Lokasi Lahan' : 'Lokasi Ambil'}
                      </span>
                      <span className="font-medium text-[#1a2610] text-right text-xs">
                        {txData.type === 'SEWA_ALAT' ? txData.locationInfo : warehouseAddress}
                      </span>
                    </div>
                  )}

                  {/* Catatan Transaksi */}
                  {txData.notes && (
                    <div className="flex justify-between items-start py-1 border-t border-[#EAEDE7] gap-3">
                      <span className="text-[#526046] font-medium shrink-0">Catatan</span>
                      <span className="font-medium text-[#1a2610] text-right text-xs italic">
                        {txData.notes}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. HISTORY Section */}
            <div className="p-5 sm:p-6 space-y-4">
              <button
                type="button"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-black tracking-wider text-[#526046] uppercase hover:text-[#1a2610] transition cursor-pointer"
              >
                <span>HISTORY</span>
                {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isHistoryOpen && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                  {/* Vertical Timeline with Dots */}
                  <div className="relative pl-5 border-l-2 border-[#cfd6c9] space-y-4 ml-1.5 py-1">
                    {/* Node 1: Saat Transaksi Dibuat */}
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#344d15] ring-4 ring-white" />
                      <div className="text-[11px] font-bold text-[#5b6950] tabular-nums">
                        {txData.dateLabel}, {txData.timeLabel} WITA
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-[#1a2610] mt-0.5">
                        Transaksi Berhasil Dicatat Sistem
                      </div>
                      <div className="text-[11px] text-[#5b6950] mt-0.5">
                        Tiket referensi {txData.refNumber} resmi diterbitkan Koperasi Sinar Pagi Sejahtera.
                      </div>
                    </div>

                    {/* Node 2: Status Terkini */}
                    <div className="relative">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#233414] ring-4 ring-white animate-pulse" />
                      <div className="text-[11px] font-bold text-[#5b6950]">Status Saat Ini</div>
                      <div className="text-xs sm:text-sm font-bold text-[#233414] mt-0.5">
                        {txData.statusLabel}
                      </div>
                      <div className="text-[11px] text-[#526046] mt-0.5">
                        {txData.type === 'TOKO_BELANJA'
                          ? 'Pengambilan komoditas dan serah terima dilakukan langsung di kantor kasir koperasi.'
                          : txData.type === 'SEWA_ALAT'
                          ? 'Silakan pantau berkala jadwal unit atau hubungi admin untuk percepatan.'
                          : 'Uang cash hasil penjualan dapat dicairkan melalui loket kasir koperasi.'}
                      </div>
                    </div>
                  </div>

                  {/* Tombol Lihat Status Pesanan */}
                  <div className="pt-2">
                    <Link
                      href="/pesanan"
                      className="w-full py-2.5 px-4 rounded-xl border border-[#cfd6c9] bg-white hover:border-[#344d15] hover:bg-[#f4f5f1] text-[#1a2610] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <span>Lihat Status Pesanan di Tab Pesanan</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#344d15]" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
