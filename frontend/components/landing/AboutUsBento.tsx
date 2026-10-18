'use client';

import React from 'react';
import { Sprout, Lightbulb, Globe, Handshake } from 'lucide-react';

export default function AboutUsBento() {
  return (
    <section id="tentang-kami" className="bg-[#f4f5f1] py-10 sm:py-16">
      <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10">
        
        {/* Top Header: Small Left Label & Big Right Heading */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-6 pb-6 sm:pb-8 border-b border-slate-200/60">
          <div className="md:w-1/4">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase leading-relaxed block">
              MENGAPA KOPERASI<br />SINAR PAGI SEJAHTERA
            </span>
          </div>
          <div className="md:w-3/4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal text-slate-900 tracking-tight leading-snug">
              Solusi Berkelanjutan untuk Masa Depan Pertanian Modern
            </h2>
          </div>
        </div>

        {/* Full-width Bento Grid Layout: Widescreen, compact height */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 lg:gap-5 items-stretch">
          
          {/* Left Column: Full-width Farmer Pruning Crop Image */}
          <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl overflow-hidden relative h-[280px] sm:h-[340px] lg:h-[370px] shadow-xs group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/farmer-pruning.jpg"
              alt="Petani Memangkas Tanaman Secara Teliti"
              className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-500"
            />
          </div>

          {/* Right Column: 2x2 Bento Cards Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
            
            {/* Card 1 (Top-Left): Deep Forest Olive Green */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#344d15] text-white flex flex-col justify-between min-h-[140px] sm:min-h-[160px] lg:min-h-[175px] shadow-xs hover:shadow-md transition-all">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sprout className="w-4.5 h-4.5 stroke-[1.75] text-white" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 leading-snug">
                  Praktik Berkelanjutan
                </h3>
                <p className="text-[11px] sm:text-xs text-white/80 leading-relaxed font-light">
                  Memprioritaskan ekosistem pertanian alami dan efisiensi sumber daya lokal Minahasa Utara.
                </p>
              </div>
            </div>

            {/* Card 2 (Top-Right): Light Warm-Gray */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#EAEDE7] text-slate-900 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] lg:min-h-[175px] shadow-xs hover:shadow-md transition-all border border-slate-200/50">
              <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center">
                <Lightbulb className="w-4.5 h-4.5 stroke-[1.75] text-slate-800" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 leading-snug">
                  Inovasi Cerdas
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-light">
                  Menerapkan teknologi digital, pencatatan realtime, dan timbangan digital 100% akurat.
                </p>
              </div>
            </div>

            {/* Card 3 (Bottom-Left): Light Warm-Gray */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#EAEDE7] text-slate-900 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] lg:min-h-[175px] shadow-xs hover:shadow-md transition-all border border-slate-200/50">
              <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center">
                <Globe className="w-4.5 h-4.5 stroke-[1.75] text-slate-800" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 leading-snug">
                  Fokus Lingkungan &amp; Sosial
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-light">
                  Menjaga kelestarian hara tanah serta membina ratusan petani lokal secara mandiri.
                </p>
              </div>
            </div>

            {/* Card 4 (Bottom-Right): Medium Olive Green */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#547318] text-white flex flex-col justify-between min-h-[140px] sm:min-h-[160px] lg:min-h-[175px] shadow-xs hover:shadow-md transition-all">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Handshake className="w-4.5 h-4.5 stroke-[1.75] text-white" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 leading-snug">
                  Solusi Praktis &amp; Nyata
                </h3>
                <p className="text-[11px] sm:text-xs text-white/80 leading-relaxed font-light">
                  Akses jual beli komoditas tanpa tengkulak serta ketersediaan sewa mesin alat siap pakai.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
