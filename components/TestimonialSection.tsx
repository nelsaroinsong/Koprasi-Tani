'use client';

import React from 'react';

export default function TestimonialSection() {
  return (
    <section id="dampak-lapangan" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-forest-dark rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          {/* Background subtle elements */}
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Dampak Nyata Lapangan
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                Mendongkrak Nilai Tukar Petani di Likupang &amp; Airmadidi
              </h3>
              <p className="text-sm text-emerald-100/80 leading-relaxed">
                Koperasi Sinar Pagi Sejahtera memastikan rantai pasok pendek, kepastian harga beli panen, serta efisiensi
                biaya olah lahan hingga 40%.
              </p>

              <div className="pt-2 flex items-center gap-6">
                <div id="metric-margin">
                  <p className="text-2xl font-black text-emerald-400">+38%</p>
                  <p className="text-xs text-slate-300">Peningkatan Margin Petani</p>
                </div>
                <div id="metric-pencairan" className="border-l border-emerald-800 pl-6">
                  <p className="text-2xl font-black text-emerald-400">&lt; 24 Jam</p>
                  <p className="text-xs text-slate-300">Pencairan Hasil Timbang</p>
                </div>
              </div>
            </div>

            {/* Right Column / Testimonials Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Cerita 1 */}
              <div
                id="testimonial-lio"
                className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:bg-white/15 transition"
              >
                <p className="text-xs italic text-slate-200 leading-relaxed">
                  &ldquo;Dulu panen jagung 2 hektar butuh 5 hari tenaga manual dan biaya besar. Sekarang sewa mesin
                  pemipil mobile dari pool Kauditan tuntas 1 hari, langsung dibeli koperasi harga bagus.&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 font-bold text-xs flex items-center justify-center text-white shadow-inner">
                    LR
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Lio Runtuwene</h4>
                    <p className="text-[11px] text-emerald-300">Petani Jagung • Airmadidi</p>
                  </div>
                </div>
              </div>

              {/* Card Cerita 2 */}
              <div
                id="testimonial-maria"
                className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:bg-white/15 transition"
              >
                <p className="text-xs italic text-slate-200 leading-relaxed">
                  &ldquo;Kopra putih kami sekarang masuk grade ekspor karena pakai Bed Dryer &amp; Solar Dome koperasi.
                  Kadar air terjaga 5% tanpa jelaga asap. Untung naik hampir 40%.&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 font-bold text-xs flex items-center justify-center text-white shadow-inner">
                    MT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Maria Tumewu</h4>
                    <p className="text-[11px] text-emerald-300">Pengolah Kopra • Likupang</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
