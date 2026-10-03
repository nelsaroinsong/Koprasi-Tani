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
import { Sprout, Users, ShoppingBag, ArrowRight, Package, ShoppingCart, HandCoins, MapPin, CheckCircle2 } from 'lucide-react';
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

  // Alamat Gudang State
  const [warehouseAddress, setWarehouseAddress] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('koperasi_warehouse_address') || DEFAULT_WAREHOUSE_ADDRESS;
    }
    return DEFAULT_WAREHOUSE_ADDRESS;
  });
  const [isEditAddressOpen, setIsEditAddressOpen] = React.useState(false);
  const [tempAddress, setTempAddress] = React.useState('');

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

  // 4. Default: Halaman Dashboard
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-800 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold mb-3 text-emerald-200">
            <Sprout className="w-3.5 h-3.5 text-emerald-300" />
            <span>Koperasi Sinar Pagi Sejahtera</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Selamat Datang di Panel Pengurus
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1.5 leading-relaxed">
            Kelola data petani, verifikasi kemitraan petani, dan pantau aktivitas pembeli hasil panen di Minahasa Utara.
          </p>
        </div>
      </div>

      {/* Info Banner Alur Masuk Fisik Barang (Gambar 2 dipindah ke Dashboard) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Package className="w-4 h-4" />
          </div>
          <div className="text-slate-700 leading-relaxed text-xs">
            <strong className="text-emerald-950 font-bold">Alur Masuk Fisik Barang:</strong> Petani membawa hasil panen ke gudang koperasi. Admin menimbang dan menginput data komoditas. Pembeli mengambil pesanan tunai di:{' '}
            <span className="font-semibold text-emerald-900 underline">{warehouseAddress}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setTempAddress(warehouseAddress);
            setIsEditAddressOpen(true);
          }}
          className="shrink-0 px-3 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs self-start sm:self-center"
          title="Ubah Alamat Pengambilan Barang"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
          <span>Ubah Alamat Gudang</span>
        </button>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Pesanan Masuk */}
        <div
          onClick={() => setActiveTab('Transaksi Koperasi', 'Pesanan Masuk')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition">
              Pesanan Masuk Koperasi
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Verifikasi pembayaran pembeli, siapkan barang di gudang, dan serahkan komoditas.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Kelola Pesanan</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Card 2: Bagi Hasil Petani */}
        <div
          onClick={() => setActiveTab('Transaksi Koperasi', 'Bagi Hasil Petani')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <HandCoins className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-800 transition">
              Bagi Hasil & Cash Petani
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Rekap uang tunai hasil panen terjual dan serahkan uang cash ke petani mitra.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
            <span>Serahkan Uang Cash</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Card 3: Toko Online */}
        <div
          onClick={() => setActiveTab('Produk dan Layanan', 'Toko Online')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition">
              Katalog Toko Online
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Kelola stok hasil panen, harga komoditas, dan produk turunan di gudang.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
            <span>Buka Data Produk</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Card 4: Petani */}
        <div
          onClick={() => setActiveTab('Pengguna', 'Petani')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Sprout className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition">
              Data Petani Koperasi
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Lihat dan verifikasi anggota petani binaan di Minahasa Utara.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Buka Data Petani</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Card 5: Pembeli */}
        <div
          onClick={() => setActiveTab('Pengguna', 'Pembeli')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-800 transition">
              Data Pembeli & Pelanggan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Kelola data pembeli komoditas agribisnis koperasi.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700">
            <span>Buka Data Pembeli</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>
      </div>

      {/* Modal Ubah Alamat Gudang */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Ubah Alamat Pengambilan Gudang</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500">
              Alamat ini akan ditampilkan kepada pembeli saat proses checkout dan instruksi pengambilan tunai hasil panen.
            </p>
            <textarea
              rows={3}
              value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              placeholder="Masukkan alamat lengkap gudang koperasi..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-medium"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <button
              type="button"
              onClick={() => setIsEditAddressOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAddress}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
            >
              Simpan Alamat
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
