'use client';

import React from 'react';
import { CartItem } from '@/lib/types';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div id="cart-drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div
        id="cart-drawer-panel"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between transform transition-all duration-300"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest-accent flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Keranjang Komoditas</h3>
              <p className="text-xs text-slate-500">Koperasi Sinar Pagi Sejahtera</p>
            </div>
          </div>
          <button
            id="close-cart-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-slate-700 font-semibold text-sm">Keranjang Anda masih kosong</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Pilih komoditas kelapa, jagung, atau turunan berkualitas dari kebun petani mitra Minahasa Utara.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.product.id}
                id={`cart-item-${item.product.id}`}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition flex items-center gap-4"
              >
                <div className={`w-16 h-16 rounded-xl ${item.product.imageBg} flex items-center justify-center text-2xl shrink-0 border border-slate-200`}>
                  {item.product.illustrationType === 'kelapa' && '🥥'}
                  {item.product.illustrationType === 'jagung' && '🌽'}
                  {item.product.illustrationType === 'kopra' && '⚪'}
                  {item.product.illustrationType === 'vco' && '🧴'}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                  <p className="text-xs font-extrabold text-forest-accent mt-0.5">
                    Rp {item.product.price.toLocaleString('id-ID')}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">{item.product.unit}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-slate-800 w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-900">
                    Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
                  </p>
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-slate-400 hover:text-rose-600 mt-2 p-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-white space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal Komoditas</span>
                <span className="font-semibold text-slate-800">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Biaya Timbang &amp; Muat Pool</span>
                <span className="text-emerald-700 font-semibold">GRATIS (Anggota)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Total Estimasi</span>
                <span className="text-forest-accent text-base">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button
              id="btn-checkout-cart"
              onClick={onCheckout}
              className="w-full py-3.5 px-4 rounded-xl bg-forest-accent text-white font-bold text-sm hover:bg-forest-800 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Lanjutkan Transaksi Pembelian</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[11px] text-center text-slate-400">
              🔒 Timbangan tersertifikasi Tera Metrologi Minahasa Utara &amp; bayar kontan di tempat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
