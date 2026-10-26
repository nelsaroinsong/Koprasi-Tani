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
  Phone,
  Image as ImageIcon,
  ChevronsUpDown,
  Wrench,
  Lock,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';
import { validateIndonesianPhone } from '@/lib/phone-validation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

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
  const [categories, setCategories] = useState<{ id: string; name: string; emoji?: string }[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Admin Profile Phone State
  const [adminPhone, setAdminPhone] = useState('');
  const [adminName, setAdminName] = useState('');

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
  const [kontakPj, setKontakPj] = useState(initialData?.kontakPj || '');

  // Fetch admin profile to auto-populate admin phone
  useEffect(() => {
    async function loadAdminProfile() {
      try {
        const res = await fetch('/api/admin/profile');
        const data = await res.json();
        if (data.success && data.user?.phone) {
          setAdminPhone(data.user.phone);
          setAdminName(data.user.name || 'Admin');
          // Nomor PJ terkunci otomatis mengikuti nomor akun admin
          setKontakPj(data.user.phone);
        }
      } catch (err) {
        console.error('Gagal memuat profil admin:', err);
      }
    }
    loadAdminProfile();
  }, []);

  // Multiple Images state
  const [images, setImages] = useState<string[]>(() => {
    if (initialData?.imageUrl) {
      return initialData.imageUrl.includes(',')
        ? initialData.imageUrl.split(',').map((s) => s.trim()).filter(Boolean)
        : [initialData.imageUrl];
    }
    return [];
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<'CAMERA' | 'GALLERY' | null>(null);

  // Fetch categories from API
  useEffect(() => {
    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const res = await fetch('/api/admin/equipment-categories');
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          const activeOnly = data.categories.filter((c: any) => c.isActive !== false);
          setCategories(activeOnly);
          if (!kategori && activeOnly.length > 0) {
            setKategori(activeOnly[0].name);
          }
        }
      } catch (err) {
        console.error('Gagal memuat kategori alat:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, [kategori]);

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
        message: 'Draf data alat berhasil disimpan di peramban.',
        type: 'success',
      });
    }
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

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format Tidak Didukung',
        message: 'Berkas harus berupa gambar (JPG, PNG, atau WebP).',
        type: 'warning',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: 'Ukuran Terlalu Besar',
        message: 'Ukuran file foto alat maksimal 5 MB.',
        type: 'warning',
      });
      return;
    }

    try {
      setUploadingSource(source);
      const formData = new FormData();
      formData.append('file', file);

      // Endpoint upload khusus alat pertanian ke Cloudflare R2
      const res = await fetch('/api/upload/equipment', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto alat.');
      }

      handleAddImage(data.url);
      showToast({
        title: 'Unggah Berhasil',
        message: `Foto ${source === 'CAMERA' ? 'kamera' : 'galeri'} berhasil ditambahkan.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Mengunggah',
        message: err.message || 'Terjadi kesalahan saat memproses gambar.',
        type: 'error',
      });
    } finally {
      setUploadingSource(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanNama = nama.trim();
    const cleanKategori = kategori.trim();
    const hargaNum = parseFloat(hargaSewa);
    const stokNum = parseInt(stokUnit, 10);

    if (!cleanNama) {
      showToast({
        title: 'Nama Alat Kosong',
        message: 'Silakan isi nama alat pertanian terlebih dahulu.',
        type: 'warning',
      });
      return;
    }

    if (!cleanKategori) {
      showToast({
        title: 'Kategori Belum Dipilih',
        message: 'Silakan pilih kategori alat pertanian.',
        type: 'warning',
      });
      return;
    }

    if (isNaN(hargaNum) || hargaNum <= 0) {
      showToast({
        title: 'Tarif Sewa Tidak Valid',
        message: 'Tarif sewa pokok harus berupa angka lebih dari Rp 0.',
        type: 'warning',
      });
      return;
    }

    if (isNaN(stokNum) || stokNum < 1) {
      showToast({
        title: 'Stok Unit Tidak Valid',
        message: 'Jumlah unit alat pertanian minimal 1 unit.',
        type: 'warning',
      });
      return;
    }

    const primaryImageUrl = images.join(',');
    const finalKontakPj = adminPhone || kontakPj || '081944078924';

    try {
      setIsSubmitting(true);
      const payload: any = {
        nama: cleanNama,
        kategori: cleanKategori,
        deskripsi: deskripsi.trim() || null,
        spesifikasi: spesifikasi.trim() || null,
        hargaSewa: hargaNum,
        satuanSewa,
        biayaOperator: biayaOperator ? parseFloat(biayaOperator) : 0,
        stokUnit: stokNum,
        kondisi,
        imageUrl: primaryImageUrl || null,
        isTersedia,
        kontakPj: finalKontakPj,
      };

      if (isEdit && initialData?.id) {
        payload.id = initialData.id;
      }

      const res = await fetch('/api/admin/equipments', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan alat');
      }

      if (!isEdit && typeof window !== 'undefined') {
        localStorage.removeItem('admin_equipment_draft');
      }

      showToast({
        title: isEdit ? 'Alat Diperbarui' : 'Alat Berhasil Ditambahkan',
        message: data.message || `Data unit "${cleanNama}" berhasil disimpan ke inventaris.`,
        type: 'success',
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan alat.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentActiveImage = images[activeImageIndex] || images[0] || '';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24">
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

      {/* Top Header Bar Selaras Toko Produk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
            title="Kembali ke Inventaris Sewa Alat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Tractor className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {isEdit ? 'Ubah Data Alat Pertanian' : 'Tambah Alat Pertanian Baru'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola informasi mesin traktor, tarif sewa, spesifikasi, dan ketersediaan unit
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-400" />
            <span>Simpan Draf</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Alat'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Form Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Kolom Kiri: Informasi Umum & Harga dan Stok (7 Kolom) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Informasi Umum */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Informasi Umum</span>
            </h3>

            {/* Nama Alat */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama Alat Pertanian <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Traktor Roda 4 Quick Kubota 24HP"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800 font-semibold"
              />
            </div>

            {/* Deskripsi Lengkap */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Deskripsi Lengkap
              </label>
              <textarea
                rows={4}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan kegunaan alat, kelengkapan bajak/rotari, kapasitas olah lahan, atau petunjuk operasional..."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800 resize-none leading-relaxed"
              />
            </div>

            {/* Spesifikasi Teknis */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Spesifikasi Teknis & Kapasitas
              </label>
              <div className="relative">
                <Wrench className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={spesifikasi}
                  onChange={(e) => setSpesifikasi(e.target.value)}
                  placeholder="Contoh: Diesel 24 HP, Solar 15L, Kedalaman 30cm, 4WD"
                  className="w-full text-xs pl-8 pr-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800"
                />
              </div>
            </div>

            {/* Satuan Waktu Sewa & Kondisi Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Satuan Sewa */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Satuan Waktu Sewa
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SATUAN_SEWA_OPTIONS.map((sat) => {
                    const isSelected = satuanSewa === sat;
                    return (
                      <button
                        key={sat}
                        type="button"
                        onClick={() => setSatuanSewa(sat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white font-bold'
                            : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        /{sat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kondisi Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Kondisi Unit Fisik
                </label>
                <select
                  value={kondisi}
                  onChange={(e) => setKondisi(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800 font-medium cursor-pointer"
                >
                  {KONDISI_OPTIONS.map((kon) => (
                    <option key={kon} value={kon}>
                      {kon}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nomor WhatsApp PJ Sewa (Terkunci Sesuai Akun Admin, Tidak Bisa Diubah) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nomor WhatsApp Penanggung Jawab (PJ)
                </label>

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Sesuai Akun Admin (Terkunci)</span>
                </span>
              </div>

              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={adminPhone || kontakPj || '081944078924'}
                  title="Nomor PJ terkunci sesuai nomor WhatsApp akun admin dan tidak dapat diubah"
                  className="w-full text-xs pl-8 pr-9 py-2.5 bg-slate-100/90 border border-slate-200/80 rounded-lg text-slate-700 font-medium cursor-not-allowed select-all focus:outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
                Nomor ini tidak bisa diubah karena otomatis terhubung dengan nomor WhatsApp akun Admin koperasi Anda ({adminPhone || kontakPj || '081944078924'}). Petani atau penyewa akan langsung menghubungi nomor ini saat pengajuan sewa disetujui.
              </p>
            </div>
          </div>

          {/* Card 2: Harga dan Stok */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800">Harga dan Stok</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarif Pokok */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tarif Sewa Pokok (Rp) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hargaSewa}
                    onChange={(e) => setHargaSewa(e.target.value)}
                    placeholder="150000"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Biaya Operator */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Biaya Operator Opsional (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={biayaOperator}
                    onChange={(e) => setBiayaOperator(e.target.value)}
                    placeholder="Kosongkan jika mandiri"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Jumlah Stok Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Jumlah Stok Unit Siap Pakai <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={stokUnit}
                onChange={(e) => setStokUnit(e.target.value)}
                placeholder="1"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800 font-semibold"
              />
            </div>

            {/* Status Ketersediaan (Taste-Skills Switch Toggle) */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block">Status Ketersediaan Sewa</span>
                <span className="text-[11px] text-slate-400">
                  {isTersedia
                    ? 'Unit siap pakai dan dapat diajukan sewa oleh petani'
                    : 'Unit sedang dalam perawatan / dinonaktifkan sementara'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isTersedia}
                onClick={() => setIsTersedia(!isTersedia)}
                title={`Klik untuk ${isTersedia ? 'menonaktifkan' : 'mengaktifkan'} unit ini`}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                  isTersedia ? 'bg-slate-900' : 'bg-slate-200 hover:bg-slate-300'
                }`}
              >
                <span className="sr-only">Toggle status ketersediaan unit</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isTersedia ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Foto Alat & Kategori (5 Kolom) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 3: Unggah Foto Alat */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Foto Alat Pertanian</h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {images.length} Foto
              </span>
            </div>

            {/* Main Large Image Container */}
            <div className="w-full aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center group">
              {currentActiveImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentActiveImage}
                    alt="Preview Alat"
                    className="w-full h-full object-cover"
                  />
                  {/* Delete Button on active preview */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(activeImageIndex)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white shadow-sm transition cursor-pointer"
                    title="Hapus foto aktif ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <ImageIcon className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                  <span className="text-xs font-medium text-slate-500">
                    Belum ada foto alat pertanian
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Gunakan kamera atau pilih file foto dari galeri
                  </span>
                </div>
              )}

              {/* Hover Overlay Buttons */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(uploadingSource)}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-bold hover:bg-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Galeri</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(uploadingSource)}
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-bold hover:bg-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera</span>
                </button>
              </div>

              {uploadingSource && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Mengunggah foto...</span>
                </div>
              )}
            </div>

            {/* Thumbnails Row + Dashed Add Button */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
              {images.map((imgUrl, idx) => {
                const isActive = idx === activeImageIndex;
                return (
                  <div
                    key={idx}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition ${
                      isActive
                        ? 'border-slate-900 ring-2 ring-slate-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-md bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition"
                      title="Hapus foto ini"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {/* Dashed Add Image Button */}
              <button
                type="button"
                disabled={Boolean(uploadingSource)}
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-800 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex flex-col items-center justify-center gap-0.5 shrink-0 transition cursor-pointer"
                title="Tambah foto dari galeri"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] font-bold">Tambah</span>
              </button>
            </div>
          </div>

          {/* Card 4: Kategori Alat (Tanpa Tombol Tambah Kategori, Dropdown Rapi & Modern) */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800">Kategori Alat</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Kategori Alat Pertanian
              </label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/70 border border-transparent rounded-lg flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 truncate flex items-center gap-2">
                      {categories.find((c) => c.name.toLowerCase() === kategori.toLowerCase())?.emoji ? (
                        <span className="text-sm leading-none shrink-0">
                          {categories.find((c) => c.name.toLowerCase() === kategori.toLowerCase())?.emoji}
                        </span>
                      ) : (
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>{kategori || 'Pilih Kategori Alat...'}</span>
                    </span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  collisionPadding={16}
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] max-h-60 overflow-y-auto rounded-xl p-1 bg-white border border-slate-200 shadow-xl z-50 text-xs"
                >
                  {isLoadingCategories ? (
                    <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      <span>Memuat kategori...</span>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Belum ada data kategori alat
                    </div>
                  ) : (
                    categories.map((cat) => {
                      const isSelected = cat.name.toLowerCase() === kategori.toLowerCase();
                      return (
                        <DropdownMenuItem
                          key={cat.id || cat.name}
                          onClick={() => setKategori(cat.name)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 text-slate-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <span className="truncate flex items-center gap-2">
                            {cat.emoji ? (
                              <span className="text-sm leading-none shrink-0">{cat.emoji}</span>
                            ) : (
                              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{cat.name}</span>
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 stroke-[2.5]" />
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-[10.5px] text-slate-400 mt-1.5">
                Kategori menentukan pengelompokan filter alat pada halaman etalase publik sewa alat.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
