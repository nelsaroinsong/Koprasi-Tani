'use client';

import React from 'react';
import { ShoppingBag, Tractor, Lightbulb, ShieldCheck, ArrowRight } from 'lucide-react';

interface CorePillarsProps {
  onOpenToko: () => void;
  onOpenAlsintan: () => void;
  onOpenAi: () => void;
  onOpenKur: () => void;
}

export default function CorePillarsSection({
  onOpenToko,
  onOpenAlsintan,
  onOpenAi,
  onOpenKur,
}: CorePillarsProps) {
  return (
    <section id="pilar-koperasi" className="py-16 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
            Pilar Layanan Koperasi
          </span>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            Solusi Menyeluruh dari Kebun ke Pembeli
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Didesain khusus untuk memberdayakan petani kelapa &amp; jagung di Minahasa Utara secara digital dan
            berkelanjutan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pilar 1: Toko Pasar Komoditas */}
          <div
            id="pilar-toko"
            className="p-6 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 card-hover-lift group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100/80 text-forest-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-forest-accent transition-colors">
                Toko Pasar Komoditas
              </h4>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Jual langsung hasil panen jagung pipil, kelapa butir, kopra putih, dan minyak VCO tanpa tengkulak dengan
                timbangan terstandar.
              </p>
            </div>
            <button
              onClick={onOpenToko}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-accent mt-4 group-hover:translate-x-1 transition-transform cursor-pointer text-left"
              type="button"
            >
              <span>Buka Katalog Produk →</span>
            </button>
          </div>

          {/* Pilar 2: Sewa Alsintan Modern */}
          <div
            id="pilar-alsintan"
            className="p-6 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 card-hover-lift group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100/80 text-forest-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Tractor className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-forest-accent transition-colors">
                Sewa Alsintan Bersubsidi
              </h4>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Akses alat traktor, pemipil jagung, bed dryer pascapanen, dan drone semprot berlisensi dengan antrean
                jadwal transparan.
              </p>
            </div>
            <button
              onClick={onOpenAlsintan}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-accent mt-4 group-hover:translate-x-1 transition-transform cursor-pointer text-left"
              type="button"
            >
              <span>Lihat Pool Alat →</span>
            </button>
          </div>

          {/* Pilar 3: Edukasi AI & Cuaca Presisi */}
          <div
            id="pilar-ai"
            className="p-6 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 card-hover-lift group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100/80 text-forest-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-forest-accent transition-colors">
                Edukasi AI &amp; Hama
              </h4>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Deteksi penyakit busuk pucuk kelapa dan ulat grayak jagung via kamera HP serta rekomendasi pemupukan
                organik presisi.
              </p>
            </div>
            <button
              onClick={onOpenAi}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-accent mt-4 group-hover:translate-x-1 transition-transform cursor-pointer text-left"
              type="button"
            >
              <span>Konsultasi AI →</span>
            </button>
          </div>

          {/* Pilar 4: Akses KUR & Transparansi Koperasi */}
          <div
            id="pilar-kur"
            className="p-6 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 card-hover-lift group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100/80 text-forest-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-forest-accent transition-colors">
                Kelayakan KUR &amp; Jurnal
              </h4>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                Catatan transaksi panen otomatis menjadi credit scoring resmi untuk pengajuan KUR perbankan mitra tanpa
                jaminan fisik rumit.
              </p>
            </div>
            <button
              onClick={onOpenKur}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-accent mt-4 group-hover:translate-x-1 transition-transform cursor-pointer text-left"
              type="button"
            >
              <span>Cek Skor Kredit →</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
