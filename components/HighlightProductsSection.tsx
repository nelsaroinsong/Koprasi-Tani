'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { Check, ShoppingBag } from 'lucide-react';

interface HighlightProductsProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function HighlightProductsSection({
  products,
  onAddToCart,
}: HighlightProductsProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Kelapa' | 'Jagung' | 'Turunan'>('Semua');

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'Semua') return true;
    if (selectedCategory === 'Turunan') {
      return p.category === 'Turunan' || p.category === 'Olahan';
    }
    return p.category === selectedCategory;
  });

  return (
    <section id="toko" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Pasar Panen Langsung
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Komoditas Siap Pasok Hari Ini
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Stok terverifikasi kualitasnya oleh tim agronomis Koperasi Sinar Pagi Sejahtera.
            </p>
          </div>

          {/* Filter Tabs */}
          <div id="product-filters" className="flex items-center gap-2">
            {(['Semua', 'Kelapa', 'Jagung', 'Turunan'] as const).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`filter-btn-${cat.toLowerCase()}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-forest-accent text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                  type="button"
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Produk Komoditas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              id={`product-card-${prod.id}`}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover-lift flex flex-col justify-between"
            >
              <div>
                {/* Visual Area */}
                <div className={`h-44 ${prod.imageBg} relative overflow-hidden flex flex-col items-center justify-center p-4`}>
                  {/* Subtle Graphic Silhouette */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    {prod.illustrationType === 'kelapa' && (
                      <div className="w-14 h-14 rounded-full bg-emerald-200/40 border border-emerald-300/60 flex items-center justify-center mb-2 shadow-inner">
                        <span className="text-2xl">🥥</span>
                      </div>
                    )}
                    {prod.illustrationType === 'jagung' && (
                      <div className="w-14 h-14 rounded-full bg-amber-200/50 border border-amber-300/60 flex items-center justify-center mb-2 shadow-inner">
                        <span className="text-2xl">🌽</span>
                      </div>
                    )}
                    {prod.illustrationType === 'kopra' && (
                      <div className="w-14 h-14 rounded-full bg-slate-200/70 border border-slate-300 flex items-center justify-center mb-2 shadow-inner">
                        <span className="text-2xl">⚪</span>
                      </div>
                    )}
                    {prod.illustrationType === 'vco' && (
                      <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300/80 flex items-center justify-center mb-2 shadow-inner">
                        <span className="text-2xl">🧴</span>
                      </div>
                    )}
                    <span className={`text-xs font-semibold ${prod.imageAccent}`}>
                      {prod.name.includes('Kelapa')
                        ? 'Komoditas Kelapa Butir'
                        : prod.name.includes('Jagung')
                        ? 'Jagung Pipil Kering 14%'
                        : prod.name.includes('Kopra')
                        ? 'Kopra Solar Dryer Putih'
                        : 'Virgin Coconut Oil Murni'}
                    </span>
                  </div>

                  {/* Pill Category Top-Left */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 shadow-sm border border-slate-200/50">
                    {prod.categoryLabel}
                  </div>

                  {/* Pill Status Top-Right */}
                  <div className="absolute top-3 right-3 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{prod.badge}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h4 className="font-bold text-slate-900 text-sm">{prod.name}</h4>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {prod.sellerTag}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                </div>
              </div>

              {/* Footer card */}
              <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between my-2">
                  <p className="text-base font-extrabold text-slate-900">
                    Rp {prod.price.toLocaleString('id-ID')}{' '}
                    <span className="text-xs font-normal text-slate-400">{prod.unit}</span>
                  </p>
                  <span className="text-[11px] font-medium text-slate-500">
                    Stok: {prod.stock.toLocaleString('id-ID')} {prod.stockUnit}
                  </span>
                </div>
                <button
                  id={`buy-btn-${prod.id}`}
                  onClick={() => onAddToCart(prod)}
                  className="w-full py-2 px-3 rounded-xl bg-forest-accent text-white font-semibold text-xs hover:bg-forest-800 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  type="button"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Beli Komoditas</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
