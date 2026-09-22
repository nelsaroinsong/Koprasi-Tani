'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Sprout, CheckCircle2, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function OnboardingPage() {
  const { user, selectRole, isLoading } = useAuth();
  const [selected, setSelected] = useState<'PEMBELI' | 'PETANI'>('PEMBELI');
  const [kelompokTani, setKelompokTani] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login?callbackUrl=/onboarding');
      } else if (user.role) {
        // Jika akun sudah pernah terdaftar dan memiliki peran, langsung arahkan ke Toko Online
        router.replace('/toko');
      }
    }
  }, [user, isLoading, router]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await selectRole(selected, selected === 'PETANI' ? kelompokTani : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
            Langkah Terakhir Pendaftaran
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Pilih Peran Akun Anda
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Halo {user?.name || 'Sobat Tani'}, sesuaikan peran Anda di Koperasi Sinar Pagi Sejahtera agar mendapatkan akses fitur yang tepat.
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Option 1: Pembeli */}
          <div
            onClick={() => setSelected('PEMBELI')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer bg-white relative flex flex-col justify-between ${
              selected === 'PEMBELI'
                ? 'border-emerald-600 shadow-md ring-1 ring-emerald-600'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {selected === 'PEMBELI' && (
              <div className="absolute top-4 right-4 text-emerald-600">
                <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
              </div>
            )}

            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Sebagai Pembeli</h3>
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Langsung Aktif
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Untuk masyarakat umum, pelaku usaha, atau konsumen yang ingin membeli komoditas segar langsung dari koperasi.
              </p>

              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Beli kelapa & jagung langsung dari petani
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Transaksi instan tanpa verifikasi admin
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Pengiriman & faktur pembelian resmi
                </li>
              </ul>
            </div>
          </div>

          {/* Option 2: Petani */}
          <div
            onClick={() => setSelected('PETANI')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer bg-white relative flex flex-col justify-between ${
              selected === 'PETANI'
                ? 'border-emerald-600 shadow-md ring-1 ring-emerald-600'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {selected === 'PETANI' && (
              <div className="absolute top-4 right-4 text-emerald-600">
                <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
              </div>
            )}

            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <Sprout className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Sebagai Petani</h3>
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1 mb-3">
                <Clock className="w-3.5 h-3.5" />
                Diverifikasi Admin Koperasi
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Khusus anggota/petani binaan Koperasi Sinar Pagi Sejahtera di wilayah Minahasa Utara.
              </p>

              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Jual hasil panen ke etalase koperasi
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Tarif subsidi sewa alsintan (traktor dll)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Akses permodalan & pembinaan kelompok
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dropdown Kelompok Tani jika memilih Petani */}
        {selected === 'PETANI' && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6 transition-all">
            <label className="block text-xs font-semibold text-amber-900 mb-1.5">
              Pilih Kelompok Tani Binaan di Minahasa Utara
            </label>
            <div className="relative">
              <select
                value={kelompokTani}
                onChange={(e) => setKelompokTani(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-medium cursor-pointer shadow-xs"
              >
                <option value="">-- Pilih Kelompok Tani --</option>
                <option value="poktan-sinar-maju">Poktan Sinar Maju (Desa Watutumou, Kalawat)</option>
                <option value="poktan-esa-genang">Poktan Esa Genang (Desa Kauditan I, Kauditan)</option>
                <option value="poktan-mapalus-tani">Poktan Mapalus Tani (Desa Airmadidi Atas)</option>
                <option value="poktan-makmur-bersama">Poktan Makmur Bersama (Desa Dimembe)</option>
                <option value="poktan-klabat-lestari">Poktan Klabat Lestari (Desa Sukur)</option>
                <option value="poktan-tunas-kelapa">Poktan Tunas Kelapa (Desa Kema II, Kema)</option>
                <option value="mandiri">Petani Mandiri / Belum Tergabung Kelompok</option>
              </select>
            </div>
            <p className="text-[11px] text-amber-700 mt-1.5">
              * Pengurus Koperasi Sinar Pagi Sejahtera akan memverifikasi keanggotaan Anda dengan ketua kelompok tani terkait.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          <span>{isSubmitting ? 'Menyimpan...' : 'Lanjutkan ke Toko Online'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
