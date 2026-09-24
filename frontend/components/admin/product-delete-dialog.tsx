'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/context/toast-context';
import { AdminProductData } from './product-form-modal';

interface ProductDeleteDialogProps {
  isOpen: boolean;
  product: AdminProductData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductDeleteDialog({
  isOpen,
  product,
  onClose,
  onSuccess,
}: ProductDeleteDialogProps) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!product) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus produk komoditas');
      }

      showToast({
        title: 'Komoditas Dihapus',
        message: `Produk "${product.nama}" berhasil dihapus dari sistem koperasi.`,
        type: 'info',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus',
        message: err.message || 'Terjadi kesalahan saat menghapus data produk.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-3xl shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>

          <div className="space-y-1.5 flex-1">
            <DialogTitle className="text-base font-bold text-slate-900">
              Hapus Komoditas dari Toko?
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus komoditas{' '}
              <strong className="text-slate-800 font-semibold">{product.nama}</strong>? Produk ini tidak akan lagi muncul di katalog toko online koperasi.
            </p>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Kategori:</span>
                <span className="font-semibold text-slate-800">{product.kategori}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Harga:</span>
                <span className="font-semibold text-slate-800">
                  Rp {Number(product.hargaPerSatuan).toLocaleString('id-ID')} /{product.satuan}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Petani / Pemilik:</span>
                <span className="font-semibold text-slate-800">
                  {product.petani?.name || 'Petani Binaan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Komoditas</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
