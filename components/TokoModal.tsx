'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { X, ShoppingBag, Store, Filter } from 'lucide-react';

interface TokoModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function TokoModal({
  isOpen,
  onClose,
  products,
  onAddToCart,
}: TokoModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Kelapa' | 'Jagung' | 'Turunan'>('Semua');

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'Semua') return true;
    if (selectedCategory === 'Turunan') {
      return p.category === 'Turunan' || p.category === 'Olahan';
    }
    return p.category === selectedCategory;
  });

  return (
    <div
      id="toko-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="toko-modal-card"
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Modal */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-accent text-white flex items-center justify-center shadow-sm">
              <Store className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">Toko Online Komoditas Tani</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-forest-700">
                  Pasar Panen Langsung
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Beli komoditas langsung dari petani Minahasa Utara dengan timbangan terverifikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Kategori Komoditas:
          </span>
          <div className="flex items-center gap-2">
            {(['Semua', 'Kelapa', 'Jagung', 'Turunan'] as const).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-forest-accent text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  type="button"
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Produk */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover-lift flex flex-col justify-between"
              >
                <div>
                  {/* Visual Area */}
                  <div className={`h-36 ${prod.imageBg} relative overflow-hidden flex flex-col items-center justify-center p-3`}>
                    <div className="relative z-10 flex flex-col items-center justify-center text-center">
                      {prod.illustrationType === 'kelapa' && (
                        <div className="w-12 h-12 rounded-full bg-emerald-200/40 border border-emerald-300/60 flex items-center justify-center mb-1 shadow-inner">
                          <span className="text-xl">🥥</span>
                        </div>
                      )}
                      {prod.illustrationType === 'jagung' && (
                        <div className="w-12 h-12 rounded-full bg-amber-200/50 border border-amber-300/60 flex items-center justify-center mb-1 shadow-inner">
                          <span className="text-xl">🌽</span>
                        </div>
                      )}
                      {prod.illustrationType === 'kopra' && (
                        <div className="w-12 h-12 rounded-full bg-slate-200/70 border border-slate-300 flex items-center justify-center mb-1 shadow-inner">
                          <span className="text-xl">⚪</span>
                        </div>
                      )}
                      {prod.illustrationType === 'vco' && (
                        <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300/80 flex items-center justify-center mb-1 shadow-inner">
                          <span className="text-xl">🧴</span>
                        </div>
                      )}
                      <span className={`text-[11px] font-semibold ${prod.imageAccent}`}>
                        {prod.categoryLabel}
                      </span>
                    </div>

                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-700 shadow-sm border border-slate-200/50">
                      {prod.categoryLabel}
                    </div>

                    <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{prod.badge}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3.5">
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{prod.name}</h4>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                      {prod.sellerTag}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>
                </div>

                {/* Footer card */}
                <div className="p-3.5 pt-0 border-t border-slate-100 mt-1">
                  <div className="flex items-center justify-between my-2">
                    <p className="text-sm font-extrabold text-slate-900">
                      Rp {prod.price.toLocaleString('id-ID')}{' '}
                      <span className="text-[10px] font-normal text-slate-400">{prod.unit}</span>
                    </p>
                    <span className="text-[10px] font-medium text-slate-500">
                      Stok: {prod.stock.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onAddToCart(prod);
                    }}
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
      </div>
    </div>
  );
}
