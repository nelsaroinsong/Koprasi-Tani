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
  Check,
  Plus,
  Bookmark,
  DollarSign,
  Phone,
  Image as ImageIcon,
  ChevronsUpDown,
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

const SATUAN_SEWA_OPTIONS = ['hari', 'jam', 'minggu', 'hektar'];
const KONDISI_OPTIONS = ['Sangat Baik', 'Baik / Prima', 'Perlu Servis Rutin', 'Standar'];

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
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Form states
  const [nama, setNama] = useState(initialData?.nama || '');
  const [kategori, setKategori] = useState(initialData?.kategori || '');
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || '');
  const [spesifikasi, setSpesifikasi] = useState(initialData?.spesifikasi || '');
  const [hargaSewa, setHargaSewa] = useState(
    initialData?.hargaSewa ? String(initialData.hargaSewa) : ''
  );
  const [satuanSewa, setSatuanSewa] = useState(initialData?.satuanSewa || 'hari');
  const [biayaOperator, setBiayaOperator] = useState(
    initialData?.biayaOperator !== undefined && initialData.biayaOperator !== null
      ? String(initialData.biayaOperator)
      : ''
  );
  const [stokUnit, setStokUnit] = useState(
    initialData?.stokUnit ? String(initialData.stokUnit) : '1'
  );
  const [kondisi, setKondisi] = useState(initialData?.kondisi || 'Sangat Baik');
  const [isTersedia, setIsTersedia] = useState(
    initialData?.isTersedia !== undefined ? initialData.isTersedia : true
  );
  const [kontakPj, setKontakPj] = useState(initialData?.kontakPj || '081944078924');

  // Multiple Images state
  const [images, setImages] = useState<string[]>(() => {
    if (initialData?.imageUrl) {
      return initialData.imageUrl.includes(',')
        ? initialData.imageUrl.split(',').map((s) => s.trim())
        : [initialData.imageUrl];
    }
    return [];
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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

  // Custom Category Dropdown states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close category dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen]);

  // Load draft if adding new
  useEffect(() => {
    if (!isEdit && typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem('admin_equipment_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.nama) setNama(parsed.nama);
          if (parsed.kategori) setKategori(parsed.kategori);
          if (parsed.deskripsi) setDeskripsi(parsed.deskripsi);
          if (parsed.spesifikasi) setSpesifikasi(parsed.spesifikasi);
          if (parsed.hargaSewa) setHargaSewa(parsed.hargaSewa);
          if (parsed.satuanSewa) setSatuanSewa(parsed.satuanSewa);
          if (parsed.biayaOperator) setBiayaOperator(parsed.biayaOperator);
          if (parsed.stokUnit) setStokUnit(parsed.stokUnit);
          if (parsed.kondisi) setKondisi(parsed.kondisi);
          if (parsed.kontakPj) setKontakPj(parsed.kontakPj);
          if (Array.isArray(parsed.images) && parsed.images.length > 0) {
            setImages(parsed.images);
          }
        }
      } catch {}
    }
  }, [isEdit]);

  const handleSaveDraft = () => {
    if (typeof window !== 'undefined') {
      const draftData = {
        nama,
        kategori,
        deskripsi,
        spesifikasi,
        hargaSewa,
        satuanSewa,
        biayaOperator,
        stokUnit,
        kondisi,
        kontakPj,
        images,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('admin_equipment_draft', JSON.stringify(draftData));
      showToast({
        title: 'Draf Disimpan',
        message: 'Draf data alat berhasil disimpan secara lokal di peramban.',
        type: 'success',
      });
    }
  };

  const handleAddNewCategory = () => {
    if (!newCatInput.trim()) return;
    const trimmed = newCatInput.trim();
    if (!categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategories((prev) => [...prev, { id: `cat-${Date.now()}`, name: trimmed }]);
    }
    setKategori(trimmed);
    setNewCatInput('');
    setIsAddingNewCat(false);
    showToast({
      title: 'Kategori Ditambahkan',
      message: `Kategori "${trimmed}" siap digunakan.`,
      type: 'success',
    });
  };

  const handleAddImage = (url: string) => {
    if (!url) return;
    setImages((prev) => {
      const updated = [...prev, url];
      setActiveImageIndex(updated.length - 1);
      return updated;
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (activeImageIndex >= updated.length) {
        setActiveImageIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, source: 'CAMERA' | 'GALLERY') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSource(source);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'equipments');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengunggah gambar');
      }

      handleAddImage(data.url);
      showToast({
        title: 'Unggah Berhasil',
        message: `Foto ${source === 'CAMERA' ? 'kamera' : 'galeri'} berhasil ditambahkan.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Unggah',
        message: err.message || 'Terjadi kesalahan saat memproses gambar.',
        type: 'error',
      });
    } finally {
      setUploadingSource(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim()) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Nama alat wajib diisi.',
        type: 'error',
      });
      return;
    }

    if (!hargaSewa || Number(hargaSewa) <= 0) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Tarif sewa pokok harus lebih dari Rp 0.',
        type: 'error',
      });
      return;
    }

    const primaryImageUrl = images.join(',');

    try {
      setIsSubmitting(true);
      const payload = {
        nama: nama.trim(),
        kategori,
        deskripsi: deskripsi.trim(),
        spesifikasi: spesifikasi.trim(),
        hargaSewa: Number(hargaSewa),
        satuanSewa,
        biayaOperator: biayaOperator ? Number(biayaOperator) : 0,
        stokUnit: Number(stokUnit) || 1,
        kondisi,
        imageUrl: primaryImageUrl,
        isTersedia,
        kontakPj: kontakPj.trim(),
      };

      const url = isEdit
        ? `/api/admin/equipments/${initialData?.id}`
        : '/api/admin/equipments';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan alat');
      }

      if (!isEdit && typeof window !== 'undefined') {
        localStorage.removeItem('admin_equipment_draft');
      }

      showToast({
        title: 'Berhasil',
        message: isEdit ? 'Data alat berhasil diperbarui.' : 'Alat baru berhasil ditambahkan.',
        type: 'success',
      });

      onSuccess();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan pada server.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentActiveImage = images[activeImageIndex] || images[0] || '';

  return (
    <div className="w-full max-w-6xl mx-auto pb-16 pt-2 px-3 sm:px-6">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e, 'GALLERY')}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => handleFileUpload(e, 'CAMERA')}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Top Bar matching Gambar 2 style */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Tractor className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isEdit ? 'Ubah Data Alat' : 'Tambah Alat Baru'}
            </h1>
          </div>
        </div>

        {/* Action Buttons top right */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition cursor-pointer shadow-xs"
          >
            <Bookmark className="w-4 h-4 text-slate-500" />
            <span>Simpan Draf</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Alat'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout matching Gambar 2 */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KOLOM KIRI: Informasi Umum & Harga & Stok (Col-span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Informasi Umum */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Informasi Umum</h2>

            {/* Nama Alat */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Alat Pertanian <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Traktor Roda 4 Quick Kubota 24HP"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm transition"
              />
            </div>

            {/* Deskripsi Alat */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Deskripsi Lengkap
              </label>
              <textarea
                rows={4}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan kegunaan alat, kelengkapan bajak/rotari, kapasitas olah lahan, atau petunjuk operasional..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm transition resize-none"
              />
            </div>

            {/* Spesifikasi Teknis */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Spesifikasi Teknis Alat
              </label>
              <input
                type="text"
                value={spesifikasi}
                onChange={(e) => setSpesifikasi(e.target.value)}
                placeholder="Contoh: Diesel 24 HP, Solar 15L, Kedalaman 30cm, 4WD"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm transition"
              />
            </div>

            {/* Satuan Sewa & Kondisi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Satuan Waktu Sewa
                </label>
                <div className="flex flex-wrap gap-2">
                  {SATUAN_SEWA_OPTIONS.map((sat) => {
                    const isSelected = satuanSewa === sat;
                    return (
                      <button
                        key={sat}
                        type="button"
                        onClick={() => setSatuanSewa(sat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                        }`}
                      >
                        /{sat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kondisi Unit Fisik
                </label>
                <select
                  value={kondisi}
                  onChange={(e) => setKondisi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm transition font-medium cursor-pointer"
                >
                  {KONDISI_OPTIONS.map((kon) => (
                    <option key={kon} value={kon}>
                      {kon}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* WhatsApp PJ */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor WhatsApp Penanggung Jawab (PJ)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={kontakPj}
                  onChange={(e) => setKontakPj(e.target.value)}
                  placeholder="Contoh: 081944078924"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm transition font-medium"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Harga dan Stok */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Harga dan Stok</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarif Pokok */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tarif Sewa Pokok (Rp) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hargaSewa}
                    onChange={(e) => setHargaSewa(e.target.value)}
                    placeholder="150000"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm font-semibold transition"
                  />
                </div>
              </div>

              {/* Biaya Operator */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Biaya Operator Opsional (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={biayaOperator}
                    onChange={(e) => setBiayaOperator(e.target.value)}
                    placeholder="Kosongkan jika mandiri"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Stok Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jumlah Stok Unit Siap Pakai <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stokUnit}
                  onChange={(e) => setStokUnit(e.target.value)}
                  placeholder="1"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-sm font-semibold transition"
                />
              </div>

              {/* Status Siap Disewakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status Ketersediaan
                </label>
                <label className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-100 border border-transparent cursor-pointer hover:bg-slate-200/70 transition">
                  <input
                    type="checkbox"
                    checked={isTersedia}
                    onChange={(e) => setIsTersedia(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {isTersedia ? 'Tersedia & Siap Disewa' : 'Sedang Tidak Tersedia'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Upload Foto & Kategori (Col-span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Unggah Foto (Upload Img) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Foto Alat</h2>
              <span className="text-xs text-slate-400 font-medium">
                {images.length} Foto Ditambahkan
              </span>
            </div>

            {/* Main Big Image Preview */}
            <div className="w-full aspect-square bg-slate-100 rounded-xl border border-slate-200/80 overflow-hidden relative flex items-center justify-center p-3">
              {currentActiveImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentActiveImage}
                    alt="Preview Alat"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://picsum.photos/seed/sewa-alat-koperasi/600/600';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(activeImageIndex)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-700 text-white shadow-md transition cursor-pointer"
                    title="Hapus foto ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-16 h-16 rounded-xl bg-slate-200/70 text-slate-400 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-medium text-slate-500">Belum ada foto alat</p>
                  <p className="text-[11px] text-slate-400">
                    Klik tombol + di bawah atau upload dari kamera & galeri
                  </p>
                </div>
              )}
            </div>

            {/* Thumbnail Row + Add Button */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
                {images.map((img, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                        isActive
                          ? 'border-emerald-500 ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}

                {/* Dashed Add Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={Boolean(uploadingSource)}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 text-slate-400 hover:text-emerald-600 flex flex-col items-center justify-center transition cursor-pointer shrink-0"
                  title="Tambah foto dari galeri"
                >
                  {uploadingSource === 'GALLERY' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  ) : (
                    <Plus className="w-5 h-5 text-emerald-500" />
                  )}
                </button>
              </div>

              {/* Quick Camera & Gallery Upload Bar */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={Boolean(uploadingSource)}
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  {uploadingSource === 'CAMERA' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Jepret Kamera</span>
                </button>

                <button
                  type="button"
                  disabled={Boolean(uploadingSource)}
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  {uploadingSource === 'GALLERY' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Pilih Galeri</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Kategori */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Kategori Alat</h2>

            <div ref={categoryDropdownRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Alat Pertanian
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/70 border border-transparent rounded-lg flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
              >
                <span className="font-semibold text-slate-800 truncate">
                  {kategori || 'Pilih Kategori Alat...'}
                </span>
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {/* Custom Popover Kategori Alat (Tanpa Search, Sesuai Gambar 2) */}
              {isCategoryOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto p-1 space-y-0.5 animate-in fade-in zoom-in-95">
                  {isLoadingCategories ? (
                    <div className="p-2 text-center text-xs text-slate-400">Memuat kategori...</div>
                  ) : (
                    categories.map((c) => {
                      const isSelected = c.name === kategori;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setKategori(c.name);
                            setIsCategoryOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Tambah Kategori Baru */}
            {isAddingNewCat ? (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="Ketik nama kategori baru..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-100 border border-emerald-500 focus:bg-white focus:outline-none text-slate-800 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCat(false);
                      setNewCatInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingNewCat(true)}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-200/70 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kategori</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
