'use client';

import React from 'react';
import { useAdmin } from '@/components/admin/admin-context';
import { PetaniDataTable } from '@/components/admin/petani-data-table';
import { PembeliDataTable } from '@/components/admin/pembeli-data-table';
import { TokoOnlineDataTable } from '@/components/admin/toko-data-table';
import { OrdersDataTable } from '@/components/admin/orders-data-table';
import { PayoutsDataTable } from '@/components/admin/payouts-data-table';
import { TickerSettingsPanel } from '@/components/admin/ticker-settings-panel';
import { LogoSettingsPanel } from '@/components/admin/logo-settings-panel';
import { CategoriesDataTable } from '@/components/admin/categories-data-table';
import { EquipmentCategoriesDataTable } from '@/components/admin/equipment-categories-data-table';
import { EquipmentFormPage } from '@/components/admin/equipment-form-page';
import { TokoProductFormPage } from '@/components/admin/toko-product-form-page';
import EquipmentsDataTable from '@/components/admin/equipments-data-table';
import { EquipmentRentalsTable } from '@/components/admin/equipment-rentals-table';
import {
  Sprout,
  Users,
  ShoppingBag,
  ArrowRight,
  Package,
  ShoppingCart,
  HandCoins,
  MapPin,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Tractor,
  Sparkles,
  Laptop,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { AdminProfileModal } from '@/components/admin/admin-profile-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const DEFAULT_WAREHOUSE_ADDRESS =
  'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara';

export default function AdminPage() {
  const { activeTab, setActiveTab } = useAdmin();
  const { data: session } = useSession();

  // Alamat Gudang State
  const [warehouseAddress, setWarehouseAddress] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('koperasi_warehouse_address') || DEFAULT_WAREHOUSE_ADDRESS;
    }
    return DEFAULT_WAREHOUSE_ADDRESS;
  });
  const [isEditAddressOpen, setIsEditAddressOpen] = React.useState(false);
  const [tempAddress, setTempAddress] = React.useState('');
  const [isCopied, setIsCopied] = React.useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);

  const handleCopyAddress = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(warehouseAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSaveAddress = () => {
    const clean = tempAddress.trim();
    if (!clean) return;
    setWarehouseAddress(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('koperasi_warehouse_address', clean);
      window.dispatchEvent(new Event('storage'));
    }
    setIsEditAddressOpen(false);
  };

  const adminUser = {
    name: session?.user?.name || 'Administrator Koperasi',
    email: session?.user?.email || 'admin@sinarpagisejahtera.co.id',
    avatar: (session?.user as any)?.avatarUrl || session?.user?.image || '',
    phone: (session?.user as any)?.phone || '',
  };

  // 0. Tampilan Pengaturan Web: Teks Berjalan & Logo Mitra
  if (activeTab.group === 'Pengaturan Web') {
    if (activeTab.item === 'Logo Mitra') {
      return <LogoSettingsPanel />;
    }
    return <TickerSettingsPanel />;
  }

  // 1. Tampilan Halaman Pengguna: Petani
  if (activeTab.group === 'Pengguna' && activeTab.item === 'Petani') {
    return <PetaniDataTable />;
  }

  // 2. Tampilan Halaman Pengguna: Pembeli
  if (activeTab.group === 'Pengguna' && activeTab.item === 'Pembeli') {
    return <PembeliDataTable />;
  }

  // 3. Tampilan Halaman Produk dan Layanan: Toko Online / Kategori / Sewa Alat
  if (activeTab.group === 'Produk dan Layanan') {
    if (activeTab.item === 'Kategori Komoditas' || activeTab.item === 'Kategori') {
      return <CategoriesDataTable />;
    }

    if (activeTab.item === 'Kategori Sewa Alat' || activeTab.item === 'Kategori Alat') {
      return <EquipmentCategoriesDataTable />;
    }

    if (activeTab.item === 'Tambah Alat') {
      return (
        <EquipmentFormPage
          initialData={activeTab.payload}
          onCancel={() => setActiveTab('Produk dan Layanan', 'Sewa Alat')}
          onSuccess={() => setActiveTab('Produk dan Layanan', 'Sewa Alat')}
        />
      );
    }

    if (activeTab.item === 'Tambah Komoditas') {
      return (
        <TokoProductFormPage
          initialData={activeTab.payload}
          onCancel={() => setActiveTab('Produk dan Layanan', 'Toko Online')}
          onSuccess={() => setActiveTab('Produk dan Layanan', 'Toko Online')}
        />
      );
    }

    if (activeTab.item === 'Sewa Alat') {
      return <EquipmentsDataTable />;
    }

    // Default untuk 'Toko Online'
    return <TokoOnlineDataTable />;
  }

  // 4. Tampilan Halaman Transaksi Koperasi: Pesanan Masuk, Sewa Alat, & Bagi Hasil Petani
  if (activeTab.group === 'Transaksi Koperasi') {
    if (activeTab.item === 'Bagi Hasil Petani') {
      return <PayoutsDataTable />;
    }
    if (activeTab.item === 'Pengajuan Sewa Alat' || activeTab.item === 'Sewa Alat') {
      return <EquipmentRentalsTable />;
    }
    // Default untuk 'Pesanan Masuk'
    return <OrdersDataTable />;
  }

  // 4. Default: Halaman Dashboard Utama (Editorial Taste Canvas matching Reference Image 1)
  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto pb-12">
      {/* 1. Header Landscape Banner (Sunrise Gradient evoking "Sinar Pagi" matching Image 1) */}
      <div className="relative w-full">
        <div className="h-36 sm:h-44 w-full rounded-3xl overflow-hidden relative shadow-sm bg-gradient-to-r from-[#ea580c] via-[#db2777] to-[#15803d]">
          {/* Subtle noise/radial lighting mesh */}
          <div className="absolute inset-0 bg-radial from-white/20 via-transparent to-black/25 mix-blend-overlay pointer-events-none" />
          <div className="absolute top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white">
              <Sprout className="w-3.5 h-3.5 text-[#D4F63D]" />
              <span>Minahasa Utara • Agribisnis Terpadu</span>
            </span>
          </div>
        </div>

        {/* 2. Overlapping Administrator Identity Card (Exact Style from Reference Image 1) */}
        <div className="-mt-12 sm:-mt-14 relative z-10 mx-2 sm:mx-6 bg-white border border-[#dce1d6] rounded-3xl p-4 sm:p-6 shadow-[0_8px_30px_rgba(26,38,16,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Big Rounded Avatar with White Ring matching Image 1 */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#233414] border-4 border-white shadow-md flex items-center justify-center p-2.5 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/koperasi-logo-lime.png"
                alt="Logo Koperasi Sinar Pagi Sejahtera"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-[#1a2610] tracking-tight truncate">
                  {adminUser.name}
                </h1>
                {/* Verified Blue Badge Checkmark matching Image 1 */}
                <span
                  className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[#0284c7] text-white shrink-0 shadow-2xs"
                  title="Administrator Terverifikasi"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#526046] mt-0.5 truncate font-normal">
                {adminUser.email}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#708063]">
                <span className="font-semibold text-[#344d15]">Panel Pengurus Koperasi</span>
                <span>•</span>
                <span>Kantor Pusat Kalawat</span>
              </div>
            </div>
          </div>

          {/* Action Buttons on Right matching Image 1 */}
          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#eaede7] w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setTempAddress(warehouseAddress);
                setIsEditAddressOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl border border-[#dce1d6] bg-white hover:bg-[#EAEDE7] text-[#1a2610] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#344d15]" />
              <span>Ubah Alamat Gudang</span>
            </button>
            <button
              type="button"
              onClick={() => window.open('/toko', '_blank')}
              className="px-4 py-2 rounded-xl bg-[#233414] hover:bg-[#344d15] text-[#D4F63D] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span>Buka Toko Publik</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation / Segmented Tabs (Matching Image 1: My details, Profile, Team 16, etc.) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#dce1d6] px-1 text-xs">
        {[
          { label: 'Ringkasan Utama', action: () => setActiveTab('Dashboard', ''), active: true },
          { label: 'Pesanan Masuk', badge: '12', action: () => setActiveTab('Transaksi Koperasi', 'Pesanan Masuk') },
          { label: 'Bagi Hasil Petani', badge: 'Tunai', action: () => setActiveTab('Transaksi Koperasi', 'Bagi Hasil Petani') },
          { label: 'Katalog Komoditas', badge: '24', action: () => setActiveTab('Produk dan Layanan', 'Toko Online') },
          { label: 'Sewa Alsintan', badge: '8', action: () => setActiveTab('Produk dan Layanan', 'Sewa Alat') },
          { label: 'Petani Mitra', badge: 'Produsen', action: () => setActiveTab('Pengguna', 'Petani') },
          { label: 'Pembeli & Pelanggan', action: () => setActiveTab('Pengguna', 'Pembeli') },
          { label: 'Pengaturan Web', action: () => setActiveTab('Pengaturan Web', 'Teks Berjalan') },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={tab.action}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              tab.active
                ? 'bg-[#233414] text-white shadow-2xs'
                : 'text-[#526046] hover:bg-[#EAEDE7] hover:text-[#1a2610]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  tab.active ? 'bg-white/20 text-[#D4F63D]' : 'bg-[#EAEDE7] text-[#526046]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Pending Approval & Action Request Strip (Exact Match to Image 1's Pending Approval Requests) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#dce1d6] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-[#1a2610] tracking-tight">
            Pengajuan & Tindakan Operasional Tertunda
          </h2>
          <p className="text-[11px] sm:text-xs text-[#526046] mt-0.5 leading-relaxed">
            Silakan tinjau pesanan masuk kasir dan verifikasi pasokan panen fisik yang disetor petani ke gudang koperasi.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('Pengguna', 'Petani')}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#f4f5f1] border border-[#dce1d6] text-[#233414] text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            Verifikasi Petani
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Transaksi Koperasi', 'Pesanan Masuk')}
            className="px-3.5 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            <span>Tinjau Pesanan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. Horizontal Split Section Rows (The Core 2-Column Setting Layout from Image 1) */}
      <div className="bg-white border border-[#dce1d6] rounded-3xl p-5 sm:p-8 space-y-7 divide-y divide-[#eaede7]">
        {/* ROW 1: Gudang Fisik & Titik Ambil Tunai */}
        <div className="pt-0 first:pt-0 flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-8">
          <div className="w-full lg:w-1/3 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#1a2610] tracking-tight">
              Gudang Fisik & Titik Ambil Tunai
            </h3>
            <p className="text-[11px] sm:text-xs text-[#526046] mt-1 leading-relaxed">
              Petani membawa hasil panen ke gudang koperasi untuk ditimbang dan di-QC. Pembeli mengambil pesanan tunai di kantor/gudang resmi.
            </p>
          </div>

          <div className="w-full lg:w-2/3">
            <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#344d15] shrink-0 mt-0.5" />
                <span className="text-[#1a2610] font-medium leading-relaxed truncate-2">
                  {warehouseAddress}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="px-2.5 py-1.5 rounded-lg border border-[#dce1d6] bg-white hover:bg-[#EAEDE7] text-[#526046] text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                  title="Salin Alamat Lengkap"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempAddress(warehouseAddress);
                    setIsEditAddressOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#233414] hover:bg-[#344d15] text-[#D4F63D] text-xs font-semibold transition cursor-pointer"
                >
                  Ubah Alamat
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Operasional Transaksi & Arus Kas */}
        <div className="pt-7 flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-8">
          <div className="w-full lg:w-1/3 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#1a2610] tracking-tight">
              Operasional Transaksi & Kasir
            </h3>
            <p className="text-[11px] sm:text-xs text-[#526046] mt-1 leading-relaxed">
              Verifikasi pelunasan tunai pesanan pembeli di kasir gudang dan penyerahan uang tunai bagi hasil ke petani mitra binaan.
            </p>
          </div>

          <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card: Pesanan Masuk */}
            <div
              onClick={() => setActiveTab('Transaksi Koperasi', 'Pesanan Masuk')}
              className="p-4 sm:p-5 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] hover:border-[#233414] hover:bg-white transition cursor-pointer group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#dce1d6] text-[#233414] flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#526046] bg-white border border-[#dce1d6] px-2 py-0.5 rounded-full">
                    Kasir & Gudang
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#233414]">
                  Pesanan Masuk Koperasi
                </h4>
                <p className="text-[11px] text-[#526046] mt-1 leading-relaxed">
                  Verifikasi pembayaran pembeli, siapkan barang di gudang, dan serahkan komoditas.
                </p>
              </div>
              <div className="mt-3.5 pt-2.5 border-t border-[#eaede7] flex items-center justify-between text-xs font-semibold text-[#233414]">
                <span>Kelola Pesanan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>

            {/* Card: Bagi Hasil Petani */}
            <div
              onClick={() => setActiveTab('Transaksi Koperasi', 'Bagi Hasil Petani')}
              className="p-4 sm:p-5 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] hover:border-[#233414] hover:bg-white transition cursor-pointer group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#dce1d6] text-[#233414] flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <HandCoins className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#344d15] bg-[#eef1e8] px-2 py-0.5 rounded-full">
                    Pencairan Tunai
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#233414]">
                  Bagi Hasil & Cash Petani
                </h4>
                <p className="text-[11px] text-[#526046] mt-1 leading-relaxed">
                  Rekap uang tunai hasil panen terjual dan serahkan uang cash ke petani mitra.
                </p>
              </div>
              <div className="mt-3.5 pt-2.5 border-t border-[#eaede7] flex items-center justify-between text-xs font-semibold text-[#233414]">
                <span>Serahkan Uang Cash</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Katalog Komoditas & Alsintan Modern */}
        <div className="pt-7 flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-8">
          <div className="w-full lg:w-1/3 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#1a2610] tracking-tight">
              Katalog Panen & Sewa Alsintan
            </h3>
            <p className="text-[11px] sm:text-xs text-[#526046] mt-1 leading-relaxed">
              Etalase produk komoditas online dan manajemen sewa armada alat mesin pertanian (alsintan).
            </p>
          </div>

          <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card: Toko Online */}
            <div
              onClick={() => setActiveTab('Produk dan Layanan', 'Toko Online')}
              className="p-4 sm:p-5 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] hover:border-[#233414] hover:bg-white transition cursor-pointer group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#dce1d6] text-[#233414] flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#526046] bg-white border border-[#dce1d6] px-2 py-0.5 rounded-full">
                    Katalog Publik
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#233414]">
                  Katalog Toko Online
                </h4>
                <p className="text-[11px] text-[#526046] mt-1 leading-relaxed">
                  Kelola stok hasil panen, harga komoditas kelapa, jagung, dan produk turunan di gudang.
                </p>
              </div>
              <div className="mt-3.5 pt-2.5 border-t border-[#eaede7] flex items-center justify-between text-xs font-semibold text-[#233414]">
                <span>Buka Data Produk</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>

            {/* Card: Sewa Alsintan */}
            <div
              onClick={() => setActiveTab('Produk dan Layanan', 'Sewa Alat')}
              className="p-4 sm:p-5 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] hover:border-[#233414] hover:bg-white transition cursor-pointer group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#dce1d6] text-[#233414] flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <Tractor className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#344d15] bg-[#eef1e8] px-2 py-0.5 rounded-full">
                    Armada Alsintan
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#233414]">
                  Sewa Alat Mesin Pertanian
                </h4>
                <p className="text-[11px] text-[#526046] mt-1 leading-relaxed">
                  Monitoring unit traktor roda 4, kultivator, drone pertanian, dan mesin panen.
                </p>
              </div>
              <div className="mt-3.5 pt-2.5 border-t border-[#eaede7] flex items-center justify-between text-xs font-semibold text-[#233414]">
                <span>Kelola Sewa Alat</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Basis Data Anggota Koperasi */}
        <div className="pt-7 flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-8">
          <div className="w-full lg:w-1/3 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#1a2610] tracking-tight">
              Keanggotaan & Mitra Binaan
            </h3>
            <p className="text-[11px] sm:text-xs text-[#526046] mt-1 leading-relaxed">
              Basis data petani binaan produsen komoditas dan pelanggan pembeli agribisnis Minahasa Utara.
            </p>
          </div>

          <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card: Petani */}
            <div
              onClick={() => setActiveTab('Pengguna', 'Petani')}
              className="p-4 sm:p-5 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] hover:border-[#233414] hover:bg-white transition cursor-pointer group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#dce1d6] text-[#233414] flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#344d15] bg-[#eef1e8] px-2 py-0.5 rounded-full">
                    Produsen
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#233414]">
                  Data Petani Mitra
                </h4>
                <p className="text-[11px] text-[#526046] mt-1 leading-relaxed">
                  Lihat dan verifikasi profil anggota petani binaan di Minahasa Utara.
                </p>
              </div>
              <div className="mt-3.5 pt-2.5 border-t border-[#eaede7] flex items-center justify-between text-xs font-semibold text-[#233414]">
                <span>Buka Data Petani</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>

            {/* Card: Pembeli */}
            <div
              onClick={() => setActiveTab('Pengguna', 'Pembeli')}
              className="p-4 sm:p-5 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] hover:border-[#233414] hover:bg-white transition cursor-pointer group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#dce1d6] text-[#233414] flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#526046] bg-white border border-[#dce1d6] px-2 py-0.5 rounded-full">
                    Konsumen
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#233414]">
                  Data Pembeli & Pelanggan
                </h4>
                <p className="text-[11px] text-[#526046] mt-1 leading-relaxed">
                  Kelola data pembeli komoditas agribisnis dan riwayat pemesanan.
                </p>
              </div>
              <div className="mt-3.5 pt-2.5 border-t border-[#eaede7] flex items-center justify-between text-xs font-semibold text-[#233414]">
                <span>Buka Data Pembeli</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>
        </div>

        {/* ROW 5: Sesi Administrator & Keamanan (Matching Devices in Image 1) */}
        <div className="pt-7 flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-8">
          <div className="w-full lg:w-1/3 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#1a2610] tracking-tight">
              Sesi & Keamanan Administrator
            </h3>
            <p className="text-[11px] sm:text-xs text-[#526046] mt-1 leading-relaxed">
              Status perangkat aktif dan autentikasi resmi pengurus Koperasi Sinar Pagi Sejahtera.
            </p>
          </div>

          <div className="w-full lg:w-2/3">
            <div className="p-4 rounded-2xl bg-[#fafbf9] border border-[#dce1d6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#dce1d6] text-[#233414] flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4 text-[#344d15]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1a2610]">Sesi Administrator Aktif</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Aktif Sekarang
                    </span>
                  </div>
                  <p className="text-[11px] text-[#526046] mt-0.5">
                    Minahasa Utara • Terotentikasi via NextAuth Admin Guard
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#dce1d6] bg-white hover:bg-[#EAEDE7] text-[#1a2610] text-xs font-semibold transition cursor-pointer"
                >
                  Edit Profil
                </button>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/admin-koperasi-sinar-pagi-sejahtera' })}
                  className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition cursor-pointer"
                >
                  Keluar Sesi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ubah Alamat Gudang */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl border-[#dce1d6] bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1a2610] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#344d15]" />
              <span>Ubah Alamat Pengambilan Gudang</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <p className="text-xs text-[#526046] leading-relaxed">
              Alamat ini akan ditampilkan kepada pembeli saat proses checkout dan instruksi pengambilan tunai hasil panen di kantor koperasi.
            </p>
            <textarea
              rows={3}
              value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              placeholder="Masukkan alamat lengkap gudang koperasi..."
              className="w-full p-3 text-xs bg-[#fafbf9] border border-[#cfd6c9] rounded-xl focus:bg-white focus:outline-none focus:border-[#233414] focus:ring-2 focus:ring-[#233414]/15 leading-relaxed font-medium text-[#1a2610]"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <button
              type="button"
              onClick={() => setIsEditAddressOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#dce1d6] text-xs font-semibold text-[#526046] hover:bg-[#f4f5f1] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAddress}
              className="px-4 py-2 rounded-xl bg-[#233414] hover:bg-[#344d15] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
            >
              Simpan Alamat
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Profil Administrator */}
      <AdminProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={adminUser}
        onUserUpdated={() => {}}
      />
    </div>
  );
}
