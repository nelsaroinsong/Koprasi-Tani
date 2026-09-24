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
  Tag,
  Layers,
  Image as ImageIcon,
  User,
  Loader2,
  FileText,
  CheckCircle2,
  Upload,
  Camera,
  Trash2,
  Search,
  ChevronsUpDown,
  Check,
  X,
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
  const [uploadingSource, setUploadingSource] = useState<'CAMERA' | 'GALLERY' | null>(null);
  const isUploadingPhoto = Boolean(uploadingSource);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

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

  // Combobox Petani states & search
  const [isPetaniOpen, setIsPetaniOpen] = useState(false);
  const [petaniSearch, setPetaniSearch] = useState('');
  const petaniComboboxRef = React.useRef<HTMLDivElement>(null);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        petaniComboboxRef.current &&
        !petaniComboboxRef.current.contains(e.target as Node)
      ) {
        setIsPetaniOpen(false);
      }
    };
    if (isPetaniOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPetaniOpen]);

  // High-performance search & memoized filtering for 1,000+ farmers
  const filteredPetani = React.useMemo(() => {
    if (!petaniSearch.trim()) return petaniOptions;
    const q = petaniSearch.toLowerCase().trim();
    return petaniOptions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.role && p.role.toLowerCase().includes(q))
    );
  }, [petaniOptions, petaniSearch]);

  const selectedPetani = React.useMemo(() => {
    return petaniOptions.find((p) => p.id === petaniId);
  }, [petaniOptions, petaniId]);

  // Upload handler langsung ke /api/upload/product (Cloudflare R2)
  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    source: 'CAMERA' | 'GALLERY'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format Salah',
        message: 'Berkas harus berupa gambar (JPG, PNG, atau WebP).',
        type: 'error',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: 'Ukuran Terlalu Besar',
        message: 'Ukuran gambar maksimal 5 MB.',
        type: 'error',
      });
      return;
    }

    try {
      setUploadingSource(source);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/product', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto produk.');
      }

      setImageUrl(data.url);
      showToast({
        title: 'Foto Berhasil Diunggah',
        message: 'Gambar komoditas berhasil disimpan ke cloud storage koperasi.',
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Unggah',
        message: err.message || 'Terjadi gangguan saat mengunggah foto.',
        type: 'error',
      });
    } finally {
      setUploadingSource(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

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
      <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto p-0 border border-slate-200 bg-white rounded-3xl shadow-2xl">
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

            {/* Petani Pemilik / Mitra (Searchable & Optimized Combobox) */}
            <div ref={petaniComboboxRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Petani / Mitra Pemilik
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPetaniOpen(!isPetaniOpen)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs flex items-center justify-between text-left cursor-pointer transition hover:bg-slate-50/50"
                >
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <span className="truncate">
                    {selectedPetani ? (
                      <span className="text-slate-800 font-semibold">
                        {selectedPetani.name}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          ({selectedPetani.role === 'PETANI' ? 'Petani' : 'Pengurus'})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Pilih petani penyetor...</span>
                    )}
                  </span>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                </button>

                {/* Dropdown Menu */}
                {isPetaniOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={petaniSearch}
                          onChange={(e) => setPetaniSearch(e.target.value)}
                          placeholder="Cari nama atau email petani..."
                          autoFocus
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                        />
                        {petaniSearch && (
                          <button
                            type="button"
                            onClick={() => setPetaniSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List of Farmers - Optimized Windowing max 40 items in DOM */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
                      {filteredPetani.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Tidak ditemukan petani dengan kata kunci &quot;{petaniSearch}&quot;
                        </div>
                      ) : (
                        filteredPetani.slice(0, 40).map((p) => {
                          const isSelected = p.id === petaniId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setPetaniId(p.id);
                                setIsPetaniOpen(false);
                              }}
                              className={`w-full px-2.5 py-2 text-left text-xs rounded-lg flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="truncate font-medium">{p.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {p.email} • {p.role === 'PETANI' ? 'Petani' : 'Pengurus'}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Windowing info indicator if items > 40 */}
                    {filteredPetani.length > 40 && (
                      <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center font-medium">
                        Menampilkan 40 dari {filteredPetani.length} petani. Ketik nama untuk mencari spesifik.
                      </div>
                    )}
                  </div>
                )}
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-slate-500 select-none">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={hargaPerSatuan}
                  onChange={(e) => setHargaPerSatuan(e.target.value)}
                  placeholder="Contoh: 4500"
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs font-medium"
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

          {/* 4. Foto Komoditas (Hanya pada mode CREATE, pada mode EDIT gunakan icon Kamera Cepat di tabel) */}
          {mode === 'CREATE' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Foto Komoditas Panen
              </label>

              {/* Hidden File Inputs */}
              {/* 1. File input with capture="environment" for immediate camera snap on mobile/tablet */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, 'CAMERA')}
                className="hidden"
              />
              {/* 2. Standard file input for choosing from gallery/files */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, 'GALLERY')}
                className="hidden"
              />

              {/* Preview Box & Upload Button */}
              {imageUrl ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-white shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Foto Fisik Panen Berhasil Dipasang</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        Foto siap digunakan pada katalog toko koperasi
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-60"
                    >
                      {uploadingSource === 'CAMERA' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingSource === 'CAMERA' ? 'Menyimpan...' : 'Jepret Ulang'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
                    >
                      {uploadingSource === 'GALLERY' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      <span>{uploadingSource === 'GALLERY' ? 'Mengunggah...' : 'Galeri'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => setImageUrl('')}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opsi 1: Jepret Langsung dengan Kamera HP / Tablet */}
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900 transition flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs disabled:opacity-60"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition">
                      {uploadingSource === 'CAMERA' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-xs font-extrabold text-emerald-900">
                      {uploadingSource === 'CAMERA' ? 'Sedang Mengunggah Kamera...' : 'Jepret Kamera Langsung'}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      Nyalakan kamera HP & foto fisik tumpukan panen
                    </div>
                  </button>

                  {/* Opsi 2: Unggah dari Galeri / Berkas Komputer */}
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 transition flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs disabled:opacity-60"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                      {uploadingSource === 'GALLERY' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {uploadingSource === 'GALLERY' ? 'Sedang Mengunggah Berkas...' : 'Pilih dari Galeri / Berkas'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Pilih file foto dari memori laptop atau HP
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

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
