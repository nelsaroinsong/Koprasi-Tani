'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  Upload,
  Trash2,
  Loader2,
  Tractor,
  Tag,
  CheckCircle2,
  Info,
  Layers,
  Wrench,
  DollarSign,
  Phone,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';

export interface EquipmentFormData {
  id?: string;
  nama: string;
  kategori: string;
  deskripsi?: string;
  spesifikasi?: string;
  hargaSewa: number | string;
  satuanSewa?: string;
  biayaOperator?: number | string;
  stokUnit?: number | string;
  kondisi?: string;
  imageUrl?: string;
  isTersedia?: boolean;
  kontakPj?: string;
}

interface EquipmentFormPageProps {
  initialData?: EquipmentFormData | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EquipmentFormPage({
  initialData,
  onCancel,
  onSuccess,
}: EquipmentFormPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(initialData && initialData.id);

  // Categories list
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Form states
  const [nama, setNama] = useState(initialData?.nama || '');
  const [kategori, setKategori] = useState(initialData?.kategori || '');
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || '');
  const [spesifikasi, setSpesifikasi] = useState(initialData?.spesifikasi || '');
  const [hargaSewa, setHargaSewa] = useState(initialData?.hargaSewa ? String(initialData.hargaSewa) : '');
  const [satuanSewa, setSatuanSewa] = useState(initialData?.satuanSewa || 'hari');
  const [biayaOperator, setBiayaOperator] = useState(
    initialData?.biayaOperator !== undefined && initialData.biayaOperator !== null
      ? String(initialData.biayaOperator)
      : ''
  );
  const [stokUnit, setStokUnit] = useState(initialData?.stokUnit ? String(initialData.stokUnit) : '1');
  const [kondisi, setKondisi] = useState(initialData?.kondisi || 'Sangat Baik');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [isTersedia, setIsTersedia] = useState(
    initialData?.isTersedia !== undefined ? initialData.isTersedia : true
  );
  const [kontakPj, setKontakPj] = useState(initialData?.kontakPj || '081944078924');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<'CAMERA' | 'GALLERY' | null>(null);

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const res = await fetch('/api/admin/equipment-categories');
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
          if (!kategori && data.categories.length > 0) {
            setKategori(data.categories[0].name);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, [kategori]);

  // Handle Photo Upload
  const handlePhotoUpload = async (file: File, source: 'CAMERA' | 'GALLERY') => {
    try {
      setUploadingSource(source);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/equipment', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah foto alat.');
      }

      setImageUrl(data.url);
      showToast({
        title: 'Foto Berhasil Diunggah',
        message: 'Foto fisik alat siap digunakan pada katalog.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Upload foto error:', err);
      showToast({
        title: 'Gagal Upload Foto',
        message: err.message || 'Terjadi kesalahan saat mengunggah foto.',
        type: 'error',
      });
    } finally {
      setUploadingSource(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNama = nama.trim();
    const cleanKategori = kategori.trim();
    const hargaNum = Number(hargaSewa);
    const stokNum = Number(stokUnit);

    if (!cleanNama) {
      showToast({
        title: 'Nama Alat Wajib Diisi',
        message: 'Silakan isi nama unit alat pertanian.',
        type: 'warning',
      });
      return;
    }

    if (!cleanKategori) {
      showToast({
        title: 'Kategori Wajib Dipilih',
        message: 'Silakan pilih kategori alat pertanian.',
        type: 'warning',
      });
      return;
    }

    if (isNaN(hargaNum) || hargaNum <= 0) {
      showToast({
        title: 'Tarif Sewa Tidak Valid',
        message: 'Tarif sewa harus bernilai angka lebih dari 0.',
        type: 'warning',
      });
      return;
    }

    if (isNaN(stokNum) || stokNum < 1) {
      showToast({
        title: 'Jumlah Unit Minimal 1',
        message: 'Stok unit alat minimal 1.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: initialData?.id,
        nama: cleanNama,
        kategori: cleanKategori,
        deskripsi: deskripsi.trim(),
        spesifikasi: spesifikasi.trim(),
        hargaSewa: hargaNum,
        satuanSewa,
        biayaOperator: biayaOperator ? Number(biayaOperator) : 0,
        stokUnit: stokNum,
        kondisi,
        imageUrl: imageUrl.trim(),
        isTersedia,
        kontakPj: kontakPj.trim(),
      };

      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/equipments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan data alat pertanian');
      }

      showToast({
        title: isEdit ? 'Alat Diperbarui' : 'Alat Ditambahkan',
        message: data.message || `Data unit "${cleanNama}" berhasil disimpan.`,
        type: 'success',
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan data alat.',
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
            title="Kembali ke Daftar Sewa Alat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Edit Data Alat Pertanian' : 'Tambah Unit Alat Pertanian Baru'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lengkapi informasi unit, tarif sewa harian, spesifikasi, dan dokumentasi foto alat.
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
              <span>{isEdit ? 'Simpan Perubahan' : 'Tambahkan Alat'}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Form Content */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg): Detail Informasi */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Informasi Dasar Unit */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Tractor className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-800">Informasi Unit Alat</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Unit Alat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Traktor Roda 4 Kubota L3408, Power Sprayer 4-Tak"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Alat <span className="text-red-500">*</span>
                </label>
                {isLoadingCategories ? (
                  <div className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                    Memuat kategori...
                  </div>
                ) : (
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer font-medium"
                  >
                    {categories.length === 0 && (
                      <option value="">Belum ada kategori (Kelola kategori dulu)</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kondisi Unit
                </label>
                <select
                  value={kondisi}
                  onChange={(e) => setKondisi(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer font-medium"
                >
                  <option value="Sangat Baik">Sangat Baik (Siap Pakai)</option>
                  <option value="Baik">Baik (Normal Operasional)</option>
                  <option value="Perlu Servis Ringan">Perlu Servis Ringan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarif Sewa (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Contoh: 150000"
                  value={hargaSewa}
                  onChange={(e) => setHargaSewa(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Satuan Sewa
                </label>
                <select
                  value={satuanSewa}
                  onChange={(e) => setSatuanSewa(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer font-medium"
                >
                  <option value="hari">per Hari</option>
                  <option value="jam">per Jam</option>
                  <option value="hektar">per Hektar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biaya Operator (Rp/hari)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0 jika tanpa operator"
                  value={biayaOperator}
                  onChange={(e) => setBiayaOperator(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Kosongkan/0 jika mandiri</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah Stok Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="1"
                  value={stokUnit}
                  onChange={(e) => setStokUnit(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kontak WhatsApp PJ Alat
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081944078924"
                  value={kontakPj}
                  onChange={(e) => setKontakPj(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Spesifikasi Teknis & Deskripsi */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Wrench className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-800">Spesifikasi & Deskripsi</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Spesifikasi Teknis
              </label>
              <input
                type="text"
                placeholder="Contoh: Mesin Diesel 4-Tak 34 HP 4WD, Kapasitas Tangki 20 Liter, Lebar Rotary 1.4m"
                value={spesifikasi}
                onChange={(e) => setSpesifikasi(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Lengkap & Ketentuan Sewa
              </label>
              <textarea
                rows={4}
                placeholder="Jelaskan kegunaan alat, kelengkapan unit, ketentuan bahan bakar, serta syarat peminjaman..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col on lg): Foto & Status */}
        <div className="space-y-5">
          {/* Card Foto Unit */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Dokumentasi Foto Alat</h2>
              <span className="text-[10px] text-slate-400 font-medium">Bebas ukuran</span>
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

            {/* Preview Box Fleksibel Bebas Ukuran */}
            {imageUrl ? (
              <div className="space-y-3">
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center p-2 min-h-[160px] max-h-[260px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Foto Alat"
                    className="w-full h-auto max-h-[245px] object-contain rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://picsum.photos/seed/sewa-alat-koperasi/600/600';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-red-600/90 text-white shadow-md hover:bg-red-700 transition cursor-pointer"
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
                <div className="w-full py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                    <Tractor className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Belum Ada Foto Alat</span>
                  <span className="text-[10px] text-slate-400 mt-1 max-w-[220px]">
                    Bebas unggah foto ukuran apa saja melalui kamera HP atau file galeri.
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

          {/* Card Status Unit */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800">Status Ketersediaan</h2>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
              <div>
                <div className="text-xs font-bold text-slate-900">Unit Siap Disewakan</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Tampilkan unit di katalog sewa alat publik
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
                <span>{isEdit ? 'Simpan Perubahan Alat' : 'Simpan Unit ke Inventaris'}</span>
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
