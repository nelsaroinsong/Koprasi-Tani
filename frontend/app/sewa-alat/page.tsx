'use client';

import React from 'react';
import Link from 'next/link';
import { Tractor, ArrowLeft, Search, Filter } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import UserProfileDropdown from '@/components/UserProfileDropdown';

export default function SewaAlatPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
                <Tractor className="w-4 h-4" />
              </div>
              <div>
                <div className="leading-none font-bold text-slate-900">Sewa Alat & Mesin Tani</div>
                <div className="text-[10px] text-slate-400 font-medium">Sinar Pagi Sejahtera</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
              <Link
                href="/toko"
                className="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium text-xs transition"
              >
                Toko Online
              </Link>
              <Link
                href="/sewa-alat"
                className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-xs transition"
              >
                Sewa Alat
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <UserProfileDropdown />
            ) : (
              <Link
                href="/login"
                className="text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-full transition"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Peminjaman & Sewa Alat Pertanian (Alsintan)</h1>
            <p className="text-sm text-slate-500 mt-1">
              Fasilitas alat modern (traktor, mesin perontok jagung, drone pemupuk) bersubsidi untuk anggota koperasi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari traktor, kultivator..."
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button className="flex items-center gap-1 text-xs border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Empty Placeholder State */}
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <Tractor className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Katalog Sewa Alat Sedang Disiapkan</h2>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
            Halaman Sewa Alat sudah aktif. Daftar unit mesin dan sistem jadwal peminjaman bersubsidi akan ditampilkan di sini.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    </div>
  );
}
