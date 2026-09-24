'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ProductData } from './product-form-modal';

interface ProductDeleteDialogProps {
  isOpen: boolean;
  product: ProductData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductDeleteDialog({
  isOpen,
  product,
  onClose,
  onSuccess,
}: ProductDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!product) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);

      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menghapus produk.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error delete product:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="text-left mb-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                Hapus Komoditas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Tindakan ini permanen dan akan menghapus produk dari toko koperasi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1.5 my-2">
          <p>Apakah Anda yakin ingin menghapus komoditas berikut?</p>
          <div className="pt-2 border-t border-slate-200 text-slate-900 font-semibold flex flex-col">
            <span className="text-sm">{product.nama}</span>
            <span className="text-slate-500 font-normal text-[11px]">
              Kategori: {product.kategori} • Stok: {product.stok} {product.satuan}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Hapus Produk</span>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
