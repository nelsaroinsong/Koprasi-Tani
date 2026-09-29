'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Camera,
  Upload,
  Trash2,
  Loader2,
  ShoppingBag,
  Tag,
  User,
  Search,
  Check,
  ChevronsUpDown,
  FileText,
  DollarSign,
  Package,
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

interface TokoProductFormPageProps {
  initialData?: AdminProductData | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const SATUAN_OPTIONS = ['kg', 'butir', 'karung', 'ikat', 'liter', 'botol'];

export function TokoProductFormPage({
  initialData,
  onCancel,
  onSuccess,
}: TokoProductFormPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(initialData && initialData.id);

  // Categories & Petani states
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [petaniOptions, setPetaniOptions] = useState<PetaniOption[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Form states
  const [nama, setNama] = useState(initialData?.nama || '');
  const [kategori, setKategori] = useState(initialData?.kategori || '');
  const [customKategori, setCustomKategori] = useState('');
  const [petaniId, setPetaniId] = useState(initialData?.petaniId || initialData?.petani?.id || '');
  const [hargaPerSatuan, setHargaPerSatuan] = useState(
    initialData?.hargaPerSatuan ? String(initialData.hargaPerSatuan) : ''
  );
  const [satuan, setSatuan] = useState(initialData?.satuan || 'kg');
  const [stok, setStok] = useState(initialData?.stok !== undefined ? String(initialData.stok) : '100');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || '');
  const [isTersedia, setIsTersedia] = useState(
    initialData?.isTersedia !== undefined ? initialData.isTersedia : true
  );

  // Combobox Petani states
  const [isPetaniOpen, setIsPetaniOpen] = useState(false);
  const [petaniSearch, setPetaniSearch] = useState('');
  const petaniComboboxRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<'CAMERA' | 'GALLERY' | null>(null);

  // Load categories and verified petani
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingInitial(true);
        const [catRes, userRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/admin/users?role=PETANI'),
        ]);

        const catData = await catRes.json();
        const userData = await userRes.json();

        if (catData.categories && Array.isArray(catData.categories)) {
          const names = catData.categories.map((c: any) => c.name);
          setCategoriesList(names);
          if (!kategori && names.length > 0) {
            setKategori(names[0]);
          }
        }

        if (userData.users && Array.isArray(userData.users)) {
          const verified = userData.users.filter(
            (u: any) => u.role === 'PETANI' && u.isVerified
          );
          setPetaniOptions(verified.length > 0 ? verified : userData.users);
          if (!petaniId && verified.length > 0) {
            setPetaniId(verified[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    loadData();
  }, [kategori, petaniId]);

  // Click outside to close combobox
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        petaniComboboxRef.current &&
        !petaniComboboxRef.current.contains(e.target as Node)
      ) {
        setIsPetaniOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPetani = useMemo(() => {
    return petaniOptions.find((p) => p.id === petaniId);
  }, [petaniOptions, petaniId]);

  const filteredPetaniOptions = useMemo(() => {
    const q = petaniSearch.toLowerCase().trim();
    if (!q) return petaniOptions;
    return petaniOptions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [petaniOptions, petaniSearch]);

  // Photo Upload Handler
  const handlePhotoUpload = async (file: File, source: 'CAMERA' | 'GALLERY') => {
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
        throw new Error(data.error || 'Gagal mengunggah foto komoditas.');
      }

      setImageUrl(data.url);
      showToast({
        title: 'Foto Berhasil Diunggah',
        message: 'Gambar komoditas berhasil disimpan.',
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalKategori = kategori === 'LAINNYA' ? customKategori.trim() : kategori;

    if (!nama.trim()) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Mohon isi nama komoditas produk.',
        type: 'warning',
      });
      return;
    }

    if (!finalKategori) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Mohon pilih kategori komoditas.',
        type: 'warning',
      });
      return;
    }

    const hargaNum = parseFloat(hargaPerSatuan);
    if (isNaN(hargaNum) || hargaNum <= 0) {
      showToast({
        title: 'Harga Tidak Valid',
        message: 'Harga per satuan harus berupa angka lebih dari 0.',
        type: 'warning',
      });
      return;
    }

    const stokNum = parseInt(stok, 10);
    if (isNaN(stokNum) || stokNum < 0) {
      showToast({
        title: 'Stok Tidak Valid',
        message: 'Jumlah stok harus bernilai minimal 0.',
        type: 'warning',
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

      const url = isEdit
        ? `/api/admin/products/${initialData?.id}`
        : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan data komoditas.');
      }

      showToast({
        title: isEdit ? 'Komoditas Diperbarui' : 'Komoditas Ditambahkan',
        message: data.message || `Komoditas "${nama}" berhasil disimpan ke sistem.`,
        type: 'success',
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan komoditas.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* 1. Header Toolbar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
            title="Kembali ke Toko Online"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Edit Data Komoditas Masuk Gudang' : 'Input Komoditas Masuk Gudang'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Catat komoditas pertanian hasil panen petani binaan yang disetor ke gudang koperasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="py-2 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{isEdit ? 'Simpan Perubahan' : 'Simpan Komoditas'}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Form Content */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg): Data Komoditas */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Detail Komoditas & Petani */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-800">Detail Komoditas Pertanian</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Komoditas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Kelapa Butir Grade A, Jagung Pipil Kering Super"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Komoditas <span className="text-red-500">*</span>
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer font-medium"
                >
                  {categoriesList.map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
                    </option>
                  ))}
                  <option value="LAINNYA">+ Ketik Kategori Lainnya</option>
                </select>

                {kategori === 'LAINNYA' && (
                  <input
                    type="text"
                    required
                    placeholder="Ketik kategori baru..."
                    value={customKategori}
                    onChange={(e) => setCustomKategori(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 mt-2 bg-emerald-50/50 border border-emerald-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                )}
              </div>

              {/* Combobox Petani Penyetor */}
              <div ref={petaniComboboxRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Petani Penyetor Panen
                </label>
                <button
                  type="button"
                  onClick={() => setIsPetaniOpen(!isPetaniOpen)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-emerald-600 hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-slate-800">
                      {selectedPetani ? selectedPetani.name : 'Pilih Petani Binaan...'}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>

                {/* Combobox Popover */}
                {isPetaniOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50">
                      <Search className="w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama petani..."
                        value={petaniSearch}
                        onChange={(e) => setPetaniSearch(e.target.value)}
                        className="w-full text-[11px] bg-transparent focus:outline-none text-slate-800"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto p-1 space-y-0.5">
                      {filteredPetaniOptions.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-slate-400">
                          Tidak ada petani ditemukan
                        </div>
                      ) : (
                        filteredPetaniOptions.map((petani) => {
                          const isSelected = petani.id === petaniId;
                          return (
                            <button
                              key={petani.id}
                              type="button"
                              onClick={() => {
                                setPetaniId(petani.id);
                                setIsPetaniOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="truncate">
                                <div>{petani.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{petani.email}</div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Satuan (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Contoh: 8500"
                  value={hargaPerSatuan}
                  onChange={(e) => setHargaPerSatuan(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Satuan Takaran <span className="text-red-500">*</span>
                </label>
                <select
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer font-medium"
                >
                  {SATUAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      /{opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stok Masuk Gudang <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="100"
                  value={stok}
                  onChange={(e) => setStok(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Deskripsi Komoditas */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-800">Deskripsi & Kualitas Panen</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan Komoditas
              </label>
              <textarea
                rows={4}
                placeholder="Jelaskan kualitas buah/biji, kadar air, masa petik, dan spesifikasi kemasan..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col on lg): Foto & Status */}
        <div className="space-y-5">
          {/* Card Foto Komoditas */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Foto Fisik Komoditas</h2>
              <span className="text-[10px] text-slate-400 font-medium">Rasio 1:1</span>
            </div>

            {/* Hidden Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file, 'GALLERY');
              }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file, 'CAMERA');
              }}
            />

            {/* Preview Box 1:1 Aspect Ratio */}
            {imageUrl ? (
              <div className="space-y-3">
                <div
                  className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Foto Komoditas"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544378730-8b5104b18790?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-red-600 text-white shadow-md hover:bg-red-700 transition cursor-pointer"
                    title="Hapus Foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={Boolean(uploadingSource)}
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-60"
                  >
                    {uploadingSource === 'CAMERA' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>Jepret Kamera</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(uploadingSource)}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                  >
                    {uploadingSource === 'GALLERY' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Galeri File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-4 text-center"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Belum Ada Foto Komoditas</span>
                  <span className="text-[10px] text-slate-400 mt-1 max-w-[180px]">
                    Ambil foto timbangan komoditas langsung dari kamera gudang atau pilih file galeri.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={Boolean(uploadingSource)}
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-60"
                  >
                    {uploadingSource === 'CAMERA' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <span>Buka Kamera</span>
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(uploadingSource)}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-2xs"
                  >
                    {uploadingSource === 'GALLERY' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>Pilih Galeri</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input URL Alternatif */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Atau tempel Link URL Foto:
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Card Status Publik */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800">Status Penjualan</h2>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
              <div>
                <div className="text-xs font-bold text-slate-900">Aktif di Katalog Toko</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Pembeli dapat melihat dan memesan komoditas ini
                </div>
              </div>
              <input
                type="checkbox"
                checked={isTersedia}
                onChange={(e) => setIsTersedia(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Bottom Action Card */}
          <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{isEdit ? 'Simpan Perubahan Komoditas' : 'Simpan Komoditas ke Gudang'}</span>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Batal & Kembali
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
