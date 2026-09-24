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
  Package,
  DollarSign,
  Tag,
  Layers,
  Image as ImageIcon,
  User,
  Loader2,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';

export interface AdminProductData {
  id?: string;
  nama: string;
  kategori: string;
  hargaPerSatuan: number | string;
  satuan: string;
  stok: number | string;
  imageUrl?: string | null;
  deskripsi?: string | null;
  isTersedia?: boolean;
  petaniId?: string;
  petani?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}

export interface PetaniOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  initialData?: AdminProductData | null;
  petaniOptions: PetaniOption[];
  onClose: () => void;
  onSuccess: () => void;
}

const KATEGORI_OPTIONS = ['Kelapa', 'Jagung', 'Turunan', 'Olahan'];
const SATUAN_OPTIONS = ['kg', 'butir', 'karung', 'ikat', 'liter', 'botol'];

export function ProductFormModal({
  isOpen,
  mode,
  initialData,
  petaniOptions,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('Kelapa');
  const [customKategori, setCustomKategori] = useState('');
  const [petaniId, setPetaniId] = useState('');
  const [hargaPerSatuan, setHargaPerSatuan] = useState('');
  const [satuan, setSatuan] = useState('kg');
  const [stok, setStok] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [isTersedia, setIsTersedia] = useState(true);

  // Sync form states with initialData
  useEffect(() => {
    if (initialData && mode === 'EDIT') {
      setNama(initialData.nama || '');
      if (KATEGORI_OPTIONS.includes(initialData.kategori)) {
        setKategori(initialData.kategori);
        setCustomKategori('');
      } else {
        setKategori('LAINNYA');
        setCustomKategori(initialData.kategori || '');
      }
      setPetaniId(initialData.petaniId || initialData.petani?.id || '');
      setHargaPerSatuan(String(initialData.hargaPerSatuan || ''));
      setSatuan(initialData.satuan || 'kg');
      setStok(String(initialData.stok ?? ''));
      setImageUrl(initialData.imageUrl || '');
      setDeskripsi(initialData.deskripsi || '');
      setIsTersedia(initialData.isTersedia ?? true);
    } else {
      setNama('');
      setKategori('Kelapa');
      setCustomKategori('');
      setPetaniId(petaniOptions[0]?.id || '');
      setHargaPerSatuan('');
      setSatuan('kg');
      setStok('100');
      setImageUrl('');
      setDeskripsi('');
      setIsTersedia(true);
    }
  }, [initialData, mode, isOpen, petaniOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalKategori = kategori === 'LAINNYA' ? customKategori.trim() : kategori;

    if (!nama.trim()) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Mohon isi nama komoditas produk.',
        type: 'error',
      });
      return;
    }

    if (!finalKategori) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Mohon tentukan kategori komoditas.',
        type: 'error',
      });
      return;
    }

    const hargaNum = parseFloat(hargaPerSatuan);
    if (isNaN(hargaNum) || hargaNum <= 0) {
      showToast({
        title: 'Harga Tidak Valid',
        message: 'Harga per satuan harus berupa nominal positif yang valid.',
        type: 'error',
      });
      return;
    }

    const stokNum = parseInt(stok, 10);
    if (isNaN(stokNum) || stokNum < 0) {
      showToast({
        title: 'Stok Tidak Valid',
        message: 'Jumlah stok harus berupa angka 0 atau lebih.',
        type: 'error',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        nama: nama.trim(),
        kategori: finalKategori,
        petaniId: petaniId || undefined,
        hargaPerSatuan: hargaNum,
        satuan: satuan.trim(),
        stok: stokNum,
        imageUrl: imageUrl.trim() || null,
        deskripsi: deskripsi.trim() || null,
        isTersedia,
      };

      const url =
        mode === 'CREATE'
          ? '/api/admin/products'
          : `/api/admin/products/${initialData?.id}`;
      const method = mode === 'CREATE' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan data komoditas');
      }

      showToast({
        title: mode === 'CREATE' ? 'Komoditas Dibuat' : 'Komoditas Diperbarui',
        message:
          mode === 'CREATE'
            ? `Komoditas "${nama}" berhasil didaftarkan ke toko online.`
            : `Perubahan komoditas "${nama}" berhasil disimpan.`,
        type: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Silakan periksa kembali data Anda.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border border-slate-200 bg-white rounded-3xl shadow-xl">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Package className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {mode === 'CREATE' ? 'Input Komoditas Masuk Gudang' : 'Edit Data Komoditas Gudang'}
              </DialogTitle>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {mode === 'CREATE'
                  ? 'Catat fisik hasil panen yang disetor petani ke gudang koperasi. Komoditas otomatis tayang di toko online.'
                  : `Perbarui informasi stok dan komoditas gudang untuk ${initialData?.nama || ''}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 1. Nama Komoditas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Komoditas / Produk <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Package className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Kelapa Butir Tua Minahasa"
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
                required
              />
            </div>
          </div>

          {/* 2. Kategori & Petani Pemilik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kategori <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
                >
                  {KATEGORI_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="LAINNYA">Lainnya / Kustom</option>
                </select>
              </div>

              {kategori === 'LAINNYA' && (
                <input
                  type="text"
                  value={customKategori}
                  onChange={(e) => setCustomKategori(e.target.value)}
                  placeholder="Ketik kategori kustom..."
                  className="mt-2 w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  required
                />
              )}
            </div>

            {/* Petani Pemilik / Mitra */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Petani / Mitra Pemilik
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={petaniId}
                  onChange={(e) => setPetaniId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
                >
                  {petaniOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role === 'PETANI' ? 'Petani' : 'Pengurus'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Harga, Satuan, dan Stok */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Harga Per Satuan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Harga per Satuan (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={hargaPerSatuan}
                  onChange={(e) => setHargaPerSatuan(e.target.value)}
                  placeholder="Contoh: 4500"
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
                  required
                />
              </div>
            </div>

            {/* Satuan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Satuan Ukuran <span className="text-red-500">*</span>
              </label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs cursor-pointer"
              >
                {SATUAN_OPTIONS.map((sat) => (
                  <option key={sat} value={sat}>
                    /{sat}
                  </option>
                ))}
              </select>
            </div>

            {/* Stok Tersedia */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Stok Tersedia <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={stok}
                  onChange={(e) => setStok(e.target.value)}
                  placeholder="Contoh: 850"
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. URL Gambar Produk & Live Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              URL Foto Produk
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
                />
              </div>

              {imageUrl && (
                <div className="w-9 h-9 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 5. Deskripsi Produk */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Deskripsi Komoditas
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={3}
                placeholder="Jelaskan kualitas panen, kadar air, mutu grade, atau lokasi kebun..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* 6. Switch Status Ketersediaan */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <div className="text-xs font-bold text-slate-800">Status Ketersediaan Produk</div>
              <div className="text-[11px] text-slate-500">
                {isTersedia
                  ? 'Produk aktif dijual dan dapat dipesan oleh pelanggan koperasi.'
                  : 'Produk disembunyikan / nonaktif sementara dari toko online.'}
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isTersedia}
                onChange={(e) => setIsTersedia(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{mode === 'CREATE' ? 'Tambah Komoditas' : 'Simpan Perubahan'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
