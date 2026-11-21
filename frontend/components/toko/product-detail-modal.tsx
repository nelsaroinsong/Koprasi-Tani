'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ShoppingBag,
  ShoppingCart,
  Minus,
  Plus,
  Tag,
  CheckCircle2,
  User,
  ShieldCheck,
  Check,
  X,
  Package,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export interface ProductDetailData {
  id: string;
  nama: string;
  kategori: string;
  hargaPerSatuan: number | string;
  satuan: string;
  stok: number | string;
  imageUrl?: string | null;
  deskripsi?: string | null;
  isTersedia?: boolean;
  petani?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}

interface ProductDetailModalProps {
  isOpen: boolean;
  product: ProductDetailData | null;
  onClose: () => void;
  onAddToCart: (product: ProductDetailData, quantity: number) => void;
}

export function ProductDetailModal({
  isOpen,
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  // Reset quantity saat modal dibuka untuk produk baru
  useEffect(() => {
    if (product) {
      setQuantity(1);
    }
  }, [product, isOpen]);

  if (!product) return null;

  const maxStock = Number(product.stok) || 1;
  const unitPrice = Number(product.hargaPerSatuan) || 0;
  const totalPrice = unitPrice * quantity;

  // Preset kelipatan cepat
  const quickPresets = [1, 2, 5, 10, 25, 50].filter(
    (val) => val <= maxStock || val === 1
  );

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  const handlePreset = (val: number) => {
    setQuantity(Math.min(maxStock, Math.max(1, val)));
  };

  const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setQuantity(1);
    } else {
      setQuantity(Math.min(maxStock, val));
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-lg w-[95vw] p-0 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-button]:hidden">
          {/* Header Image Section */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                product.imageUrl ||
                '/api/images/categories/all.jpg'
              }
              alt={product.nama}
              className="w-full h-full object-cover"
            />

            {/* Badges on Top Left */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
              <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs">
                {product.kategori}
              </span>
              <span className="bg-white/95 backdrop-blur-xs text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{product.isTersedia ? 'Aktif Dijual' : 'Nonaktif'}</span>
              </span>
            </div>

            {/* Dedicated Floating Close Button on Top Right (Bebas tabrakan) */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-md flex items-center justify-center transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Body */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Title & Price Header */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Komoditas Hasil Panen Petani Minahasa Utara</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {product.nama}
              </h2>

              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-xl sm:text-2xl font-black text-emerald-800">
                    Rp {unitPrice.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium"> /{product.satuan}</span>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  Tersedia:{' '}
                  <strong className="text-slate-800 font-bold">
                    {maxStock.toLocaleString('id-ID')} {product.satuan}
                  </strong>
                </div>
              </div>
            </div>

            {/* Farmer Info */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <Avatar className="h-9 w-9 rounded-xl border border-emerald-200 shrink-0">
                <AvatarImage src={product.petani?.avatarUrl || ''} alt={product.petani?.name || ''} />
                <AvatarFallback className="rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                  {product.petani?.name ? product.petani.name.charAt(0).toUpperCase() : 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {product.petani?.name || 'Petani Mitra Binaan'}
                </div>
                <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mitra Resmi Koperasi Sinar Pagi Sejahtera</span>
                </div>
              </div>
            </div>

            {/* Description Section with shadcn Separator */}
            <div className="space-y-1">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Deskripsi & Kualitas Komoditas
                </h4>
                <p className="text-[11px] text-slate-400">
                  Informasi mutu panen, karakteristik, dan spesifikasi fisik
                </p>
              </div>
              <Separator className="my-2 bg-slate-200" />
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line py-1">
                {product.deskripsi ||
                  'Komoditas hasil panen segar berkualitas terbaik langsung dari kebun petani binaan Minahasa Utara, dirawat dan dipanen sesuai standar mutu agribisnis koperasi.'}
              </div>
            </div>

            {/* Quantity Selector Section */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Jumlah Pesanan ({product.satuan})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tentukan jumlah yang ingin dimasukkan ke keranjang
                  </span>
                </div>

                {/* Counter Stepper */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Kurangi"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={maxStock}
                    value={quantity}
                    onChange={handleQuantityInput}
                    className="w-12 text-center text-xs font-bold text-slate-900 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={quantity >= maxStock}
                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Tambah"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Presets Buttons (1, 2, 5, 10, etc.) */}
              <div>
                <div className="text-[11px] text-slate-400 font-semibold mb-1.5">
                  Kelipatan Cepat:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickPresets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handlePreset(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        quantity === val
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      +{val} {product.satuan}
                    </button>
                  ))}

                  {/* Tombol Borong / Maksimal */}
                  <button
                    type="button"
                    onClick={() => handlePreset(maxStock)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      quantity === maxStock
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    Maks ({maxStock})
                  </button>
                </div>
              </div>

              {/* Subtotal Calculation */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Subtotal ({quantity} {product.satuan}):
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              + Masukkan ke Keranjang ({quantity} {product.satuan}) • Rp {totalPrice.toLocaleString('id-ID')}
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
