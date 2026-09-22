'use client';

import React from 'react';
import { AlsintanItem } from '@/lib/types';
import { MapPin, Calendar, Check, ArrowRight } from 'lucide-react';

interface HighlightAlsintanProps {
  alsintanList: AlsintanItem[];
  onSewaItem: (item: AlsintanItem) => void;
  onViewAll: () => void;
}

export default function HighlightAlsintanSection({
  alsintanList,
  onSewaItem,
  onViewAll,
}: HighlightAlsintanProps) {
  return (
    <section id="sewa-alat" className="py-16 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Modernisasi Kebun Minut
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Sewa Alat &amp; Alsintan Pool Koperasi
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tarif bersubsidi, jadwal transparan, dan opsi pendampingan operator handal.
            </p>
          </div>

          <button
            id="btn-lihat-semua-alsintan"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-accent hover:underline cursor-pointer"
            type="button"
          >
            <span>Lihat Semua 35+ Unit Alat →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alsintanList.map((item) => (
            <div
              key={item.id}
              id={`alsintan-card-${item.id}`}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover-lift flex flex-col justify-between"
            >
              <div>
                {/* Visual Header */}
                <div className={`h-48 ${item.imageBg} relative flex flex-col items-center justify-center p-4`}>
                  <div className="flex flex-col items-center justify-center text-center">
                    {item.illustrationType === 'traktor' && (
                      <div className="w-16 h-16 rounded-2xl bg-white/80 border border-slate-300 flex items-center justify-center mb-2 shadow-sm">
                        <span className="text-3xl">🚜</span>
                      </div>
                    )}
                    {item.illustrationType === 'pemipil' && (
                      <div className="w-16 h-16 rounded-2xl bg-white/80 border border-amber-300 flex items-center justify-center mb-2 shadow-sm">
                        <span className="text-3xl">⚙️</span>
                      </div>
                    )}
                    {item.illustrationType === 'drone' && (
                      <div className="w-16 h-16 rounded-2xl bg-white/80 border border-emerald-300 flex items-center justify-center mb-2 shadow-sm">
                        <span className="text-3xl">🛸</span>
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-400">{item.name}</span>
                  </div>

                  {/* Tag Kategori Top-Left */}
                  <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 shadow-sm border border-slate-200/60">
                    {item.category}
                  </div>

                  {/* Status Badge Top-Right */}
                  <div className="absolute top-3 right-3 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{item.statusBadge}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5">
                  <h4 className="font-bold text-slate-900 text-base">{item.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span>📍 {item.location} • {item.operatorNote}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Action & Pricing */}
              <div className="p-5 pt-0 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between my-2">
                  <p className="text-base font-extrabold text-slate-900">
                    Rp {item.price.toLocaleString('id-ID')}{' '}
                    <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </p>
                  {item.bookingNote ? (
                    <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
                      {item.bookingNote}
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                      Stok: {item.stock} Unit
                    </span>
                  )}
                </div>

                <button
                  id={`btn-sewa-${item.id}`}
                  onClick={() => onSewaItem(item)}
                  className="w-full py-2.5 px-3 rounded-xl bg-forest-accent text-white font-semibold text-xs hover:bg-forest-800 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  type="button"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>+ Sewa Sekarang</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
