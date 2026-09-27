'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sprout, Camera, Trash2, Loader2, AlertCircle } from 'lucide-react';

export interface ProductData {
  id?: string;
  nama: string;
  deskripsi?: string | null;
  kategori: string;
  hargaPerSatuan: number | string;
  satuan: string;
  stok: number | string;
  imageUrl?: string | null;
  isTersedia?: boolean;
}

import defaultCategoriesData from '@/data/categories.json';

interface ProductFormModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  initialData?: ProductData | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SATUAN_OPTIONS = ['kg', 'butir', 'karung', 'liter', 'ikat', 'pack'];

export function ProductFormModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('koperasi_categories_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((c: any) => c.name);
          }
        }
      } catch {}
    }
    return defaultCategoriesData.map((c) => c.name);
  });

  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState(() => categoriesList[0] || 'Kelapa');
  const [hargaPerSatuan, setHargaPerSatuan] = useState('');
  const [satuan, setSatuan] = useState('kg');
  const [stok, setStok] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isTersedia, setIsTersedia] = useState(true);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData && mode === 'EDIT') {
      setNama(initialData.nama || '');
      setKategori(initialData.kategori || 'Kelapa');
      setHargaPerSatuan(String(initialData.hargaPerSatuan || ''));
      setSatuan(initialData.satuan || 'kg');
      setStok(String(initialData.stok || ''));
      setDeskripsi(initialData.deskripsi || '');
      setImageUrl(initialData.imageUrl || '');
      setIsTersedia(initialData.isTersedia ?? true);
    } else {
      setNama('');
      setKategori('Kelapa');
      setHargaPerSatuan('');
      setSatuan('kg');
      setStok('');
      setDeskripsi('');
      setImageUrl('');
      setIsTersedia(true);
    }
    setErrorMessage(null);
  }, [initialData, mode, isOpen]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Berkas harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran gambar maksimal 5 MB.');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto produk.');
      }

      setImageUrl(data.url);
    } catch (err: any) {
      console.error('Error upload foto produk:', err);
      setErrorMessage(err.message || 'Gagal mengunggah gambar produk.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNama = nama.trim();
    if (!cleanNama) {
      setErrorMessage('Nama komoditas/produk wajib diisi.');
      return;
    }

    const priceNum = parseFloat(hargaPerSatuan);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Harga satuan harus angka positif yang valid.');
      return;
    }

    const stockNum = parseInt(stok, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMessage('Jumlah stok harus berupa angka valid minimal 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = mode === 'CREATE' ? '/api/products' : `/api/products/${initialData?.id}`;
      const method = mode === 'CREATE' ? 'POST' : 'PUT';

      const payload = {
        nama: cleanNama,
        kategori,
        hargaPerSatuan: priceNum,
        satuan,
        stok: stockNum,
        deskripsi: deskripsi.trim() || null,
        imageUrl: imageUrl || null,
        isTersedia,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan komoditas.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error simpan komoditas:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="text-left mb-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </span>
            <DialogTitle className="text-base font-bold text-slate-900">
              {mode === 'CREATE' ? 'Tambah Komoditas Baru' : 'Edit Komoditas Petani'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {mode === 'CREATE'
              ? 'Lengkapi rincian komoditas hasil panen yang ingin Anda jual ke Koperasi.'
              : 'Perbarui harga, stok, atau informasi komoditas hasil panen Anda.'}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          {/* Foto Produk */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Foto Komoditas / Produk
            </label>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={nama} className="w-full h-full object-cover" />
                ) : (
                  <Sprout className="w-6 h-6 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3 h-3 text-emerald-600" />
                        <span>{imageUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                      </>
                    )}
                  </button>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2 py-1 text-[11px] font-semibold rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Format JPG, PNG, atau WebP (Maks. 5 MB)
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Nama Komoditas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Nama Komoditas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Kelapa Butir Tua Minahasa"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
            />
          </div>

          {/* Kategori & Satuan */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Satuan Jual <span className="text-red-500">*</span>
              </label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer"
              >
                {SATUAN_OPTIONS.map((sat) => (
                  <option key={sat} value={sat}>
                    Per {sat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Harga Satuan & Stok */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Harga per {satuan} (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="100"
                step="50"
                placeholder="4500"
                value={hargaPerSatuan}
                onChange={(e) => setHargaPerSatuan(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Jumlah Stok ({satuan}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="850"
                value={stok}
                onChange={(e) => setStok(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Deskripsi & Kualitas Komoditas
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan kualitas panen, asal kebun, kadar air, dll..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{mode === 'CREATE' ? 'Tambah Komoditas' : 'Simpan Perubahan'}</span>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
