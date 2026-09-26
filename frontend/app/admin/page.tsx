'use client';

import React from 'react';
import { useAdmin } from '@/components/admin/admin-context';
import { PetaniDataTable } from '@/components/admin/petani-data-table';
import { PembeliDataTable } from '@/components/admin/pembeli-data-table';
import { TokoOnlineDataTable } from '@/components/admin/toko-data-table';
import { OrdersDataTable } from '@/components/admin/orders-data-table';
import { PayoutsDataTable } from '@/components/admin/payouts-data-table';
import { TickerSettingsPanel } from '@/components/admin/ticker-settings-panel';
import { Sprout, Users, ShoppingBag, ArrowRight, Package, ShoppingCart, HandCoins } from 'lucide-react';

export default function AdminPage() {
  const { activeTab, setActiveTab } = useAdmin();

  // 0. Tampilan Pengaturan Web: Teks Berjalan
  if (activeTab.group === 'Pengaturan Web') {
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

  // 3. Tampilan Halaman Produk dan Layanan: Toko Online / Sewa Alat
  if (activeTab.group === 'Produk dan Layanan') {
    if (activeTab.item === 'Sewa Alat') {
      return (
        <div className="flex-1 w-full min-h-[calc(100vh-8rem)] rounded-3xl border border-dashed border-emerald-200 bg-white/60 backdrop-blur-xs p-8 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100 shadow-xs">
            <Package className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Layanan Sewa Alat & Mesin Pertanian (Alsintan)
          </h2>
          <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
            Manajemen inventaris alsintan, ketersediaan traktor dan mesin panen Koperasi Sinar Pagi Sejahtera.
          </p>
        </div>
      );
    }

    // Default untuk 'Toko Online'
    return <TokoOnlineDataTable />;
  }

  // 4. Tampilan Halaman Transaksi Koperasi: Pesanan Masuk & Bagi Hasil Petani
  if (activeTab.group === 'Transaksi Koperasi') {
    if (activeTab.item === 'Bagi Hasil Petani') {
      return <PayoutsDataTable />;
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
    </div>
  );
}
