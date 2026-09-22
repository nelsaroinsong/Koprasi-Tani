'use client';

import React from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { ArrowRight, Search, Filter, ShoppingBag } from 'lucide-react';

export default function TokoOnlinePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App Header with Mobile Hamburger Menu */}
      <AppHeader activePage="toko" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Katalog Komoditas & Hasil Tani</h1>
            <p className="text-sm text-slate-500 mt-1">
              Beli komoditas langsung dari petani binaan Koperasi Sinar Pagi Sejahtera, Minahasa Utara.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kelapa, jagung..."
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button className="flex items-center gap-1 text-xs border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Empty Placeholder State */}
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Katalog Produk Sedang Disiapkan</h2>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
            Halaman Toko Online sudah aktif. Data produk komoditas dan hasil tani akan dihubungkan ke sistem setelah alur otentikasi login selesai.
          </p>
          <Link
            href="/sewa-alat"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <span>Jelajahi Layanan Sewa Alat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
