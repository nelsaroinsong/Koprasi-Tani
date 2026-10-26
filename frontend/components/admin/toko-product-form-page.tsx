'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Package,
  Check,
  Upload,
  Camera,
  Trash2,
  Search,
  ChevronsUpDown,
  X,
  FileText,
  Bookmark,
  Plus,
  Loader2,
  Tag,
  User,
  Mail,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';
import { useDebounce } from '@/hooks/use-debounce';
import defaultCategoriesData from '@/data/categories.json';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

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

  const [petaniOptions, setPetaniOptions] = useState<PetaniOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<'CAMERA' | 'GALLERY' | null>(null);

  // Form states
  const [nama, setNama] = useState(initialData?.nama || '');
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || '');
  const [kategori, setKategori] = useState(initialData?.kategori || 'Kelapa');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [petaniId, setPetaniId] = useState(initialData?.petaniId || initialData?.petani?.id || '');
  const [hargaPerSatuan, setHargaPerSatuan] = useState(
    initialData?.hargaPerSatuan ? String(initialData.hargaPerSatuan) : ''
  );
  const [satuan, setSatuan] = useState(initialData?.satuan || 'kg');
  const [stok, setStok] = useState(initialData?.stok !== undefined ? String(initialData.stok) : '100');
  const [isTersedia, setIsTersedia] = useState(
    initialData?.isTersedia !== undefined ? initialData.isTersedia : true
  );

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

  // Combobox Petani states (Server-side Debounced Search for High Performance)
  const [isPetaniOpen, setIsPetaniOpen] = useState(false);
  const [petaniSearch, setPetaniSearch] = useState('');
  const [isSearchingPetani, setIsSearchingPetani] = useState(false);
  const [searchedPetaniResults, setSearchedPetaniResults] = useState<PetaniOption[]>([]);
  const debouncedPetaniSearch = useDebounce(petaniSearch, 300);
  const petaniComboboxRef = useRef<HTMLDivElement>(null);

  // Selected Petani state (in case loaded from initialData or draft)
  const [selectedPetani, setSelectedPetani] = useState<PetaniOption | null>(() => {
    if (initialData?.petani) {
      return {
        id: initialData.petani.id,
        name: initialData.petani.name,
        email: initialData.petani.email,
        role: 'PETANI',
        avatarUrl: initialData.petani.avatarUrl,
        phone: initialData.petani.phone,
      };
    }
    return null;
  });

  // Server-side debounced search: hanya query database saat admin mengetik (skalabel untuk ratusan/ribuan petani)
  useEffect(() => {
    const q = debouncedPetaniSearch.trim();
    if (!q) {
      setSearchedPetaniResults([]);
      setIsSearchingPetani(false);
      return;
    }

    let isCancelled = false;
    async function searchPetani() {
      try {
        setIsSearchingPetani(true);
        const res = await fetch(`/api/admin/users?role=PETANI&limit=20&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!isCancelled && Array.isArray(data.users)) {
          setSearchedPetaniResults(data.users);
        }
      } catch (err) {
        console.error('Failed to search petani', err);
      } finally {
        if (!isCancelled) setIsSearchingPetani(false);
      }
    }

    searchPetani();
    return () => {
      isCancelled = true;
    };
  }, [debouncedPetaniSearch]);

  // Load petani options and check draft if in CREATE mode
  useEffect(() => {
    async function loadPetani() {
      try {
        const res = await fetch('/api/admin/users?role=PETANI');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.users)) {
            const verified = data.users.filter((u: any) => u.isVerified);
            setPetaniOptions(verified.length > 0 ? verified : data.users);
          }
        }
      } catch (err) {
        console.error('Failed to load petani options', err);
      }
    }
    loadPetani();

    // Load draft if CREATE mode and fields are empty
    if (!isEdit) {
      try {
        const savedDraft = localStorage.getItem('admin_product_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.nama) setNama(parsed.nama);
          if (parsed.deskripsi) setDeskripsi(parsed.deskripsi);
          if (parsed.kategori) setKategori(parsed.kategori);
          if (parsed.hargaPerSatuan) setHargaPerSatuan(parsed.hargaPerSatuan);
          if (parsed.satuan) setSatuan(parsed.satuan);
          if (parsed.stok) setStok(parsed.stok);
          if (Array.isArray(parsed.images) && parsed.images.length > 0) {
            setImages(parsed.images);
          }
        }
      } catch {}
    }
  }, [isEdit]);

  // Click outside to close combobox petani
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

  // Sinkronisasi data petani jika petaniId ada tapi selectedPetani belum terisi
  useEffect(() => {
    if (petaniId && !selectedPetani) {
      fetch(`/api/admin/users?role=PETANI&limit=20&q=${encodeURIComponent(petaniId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.users)) {
            const found = data.users.find((u: any) => u.id === petaniId);
            if (found) setSelectedPetani(found);
          }
        })
        .catch(() => {});
    }
  }, [petaniId, selectedPetani]);

  // Handler Upload Foto Tambahan (Bisa upload beberapa image)
  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    source: 'CAMERA' | 'GALLERY'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingSource(source);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload/product', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Gagal mengunggah foto.');
        }

        setImages((prev) => [...prev, data.url]);
      }

      showToast({
        title: 'Foto Berhasil Diunggah',
        message: `${files.length} foto komoditas berhasil ditambahkan.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Mengunggah',
        message: err.message || 'Terjadi gangguan saat mengunggah foto.',
        type: 'error',
      });
    } finally {
      setUploadingSource(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeImageIndex >= indexToRemove && activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1);
    }
  };

  const handleSaveDraft = () => {
    try {
      const draftData = {
        nama,
        deskripsi,
        kategori,
        petaniId,
        hargaPerSatuan,
        satuan,
        stok,
        isTersedia,
        images,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('admin_product_draft', JSON.stringify(draftData));
      showToast({
        title: 'Draf Disimpan',
        message: 'Draf komoditas pertanian berhasil disimpan ke perangkat.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan Draf',
        message: err.message || 'Terjadi kendala saat menyimpan draf.',
        type: 'error',
      });
    }
  };

  const handleAddCategory = () => {
    const clean = newCatInput.trim();
    if (!clean) return;
    if (!categoriesList.includes(clean)) {
      setCategoriesList((prev) => [...prev, clean]);
    }
    setKategori(clean);
    setIsAddingNewCat(false);
    setNewCatInput('');
    showToast({
      title: 'Kategori Ditambahkan',
      message: `Kategori "${clean}" siap digunakan.`,
      type: 'success',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim()) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Mohon isi nama produk/komoditas.',
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

      const primaryImageUrl = images[activeImageIndex] || images[0] || '';

      const payload = {
        nama: nama.trim(),
        kategori: kategori.trim(),
        petaniId: petaniId || undefined,
        hargaPerSatuan: hargaNum,
        satuan: satuan.trim(),
        stok: stokNum,
        imageUrl: primaryImageUrl || null,
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

      if (!isEdit) {
        localStorage.removeItem('admin_product_draft');
      }

      showToast({
        title: isEdit ? 'Produk Diperbarui' : 'Produk Berhasil Ditambahkan',
        message: data.message || `Komoditas "${nama}" berhasil disimpan ke sistem.`,
        type: 'success',
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan data.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryImage = images[activeImageIndex] || images[0] || null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-40 sm:pb-48">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handlePhotoUpload(e, 'GALLERY')}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handlePhotoUpload(e, 'CAMERA')}
        className="hidden"
      />

      {/* Top Header Bar Sesuai Gambar 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {isEdit ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola informasi komoditas, harga satuan, dan galeri foto
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Sesuai Gambar 2 */}
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Form Layout Sesuai Gambar 2 */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Kolom Kiri: Informasi Umum & Harga dan Stok (7 Kolom) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Informasi Umum (General Information) */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Informasi Umum</h3>

            {/* Nama Produk */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama Produk
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Kelapa Butir Hibrida, Jagung Pipil Kering Super"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition text-slate-800"
              />
            </div>

            {/* Deskripsi Produk */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Deskripsi Produk
              </label>
              <textarea
                rows={4}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan kualitas panen, varietas benih, keunggulan komoditas, dan cara penyimpanan..."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition text-slate-800 resize-none leading-relaxed"
              />
            </div>

            {/* Satuan & Mitra Petani Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Satuan Komoditas (Pilihan Box Style) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Satuan Penjualan
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SATUAN_OPTIONS.map((opt) => {
                    const isSelected = satuan === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSatuan(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                            : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mitra Petani (Cari Berdasarkan Email) */}
              <div ref={petaniComboboxRef} className="relative">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Mitra Petani</span>
                  <span className="text-[10.5px] font-normal text-slate-400">
                    Ketik &amp; cari email
                  </span>
                </label>

                {selectedPetani ? (
                  /* Kartu Petani Terpilih */
                  <div className="w-full text-xs p-2.5 bg-emerald-50/70 border border-emerald-200/90 rounded-lg flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 truncate">
                            {selectedPetani.email}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200/80 shrink-0">
                            <Check className="w-2.5 h-2.5" /> Terpilih
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{selectedPetani.name}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPetaniId('');
                        setSelectedPetani(null);
                        setPetaniSearch('');
                        setIsPetaniOpen(false);
                      }}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition shadow-2xs cursor-pointer shrink-0 ml-2"
                      title="Ganti atau ketik email petani lain"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  /* Field Input Ketik Email Petani */
                  <div className="relative">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={petaniSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPetaniSearch(val);
                          setIsPetaniOpen(val.trim().length > 0);
                        }}
                        onFocus={() => {
                          if (petaniSearch.trim().length > 0) {
                            setIsPetaniOpen(true);
                          }
                        }}
                        placeholder="Ketik email mitra petani..."
                        className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition text-slate-800"
                      />
                      {petaniSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setPetaniSearch('');
                            setIsPetaniOpen(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                          title="Hapus pencarian"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Popover Hasil Pencarian Email Petani - Hanya muncul setelah diketik */}
                    {isPetaniOpen && petaniSearch.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                        <div className="px-3 py-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span>Hasil Pencarian ({searchedPetaniResults.length})</span>
                          <span className="text-[10px] text-emerald-600 font-normal">
                            Email: &quot;{petaniSearch}&quot;
                          </span>
                        </div>
                        <div className="overflow-y-auto p-1 divide-y divide-slate-50 max-h-48">
                          {isSearchingPetani ? (
                            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              <span>Mencari di database...</span>
                            </div>
                          ) : searchedPetaniResults.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              Tidak ada petani dengan email cocok &quot;{petaniSearch}&quot;
                            </div>
                          ) : (
                            searchedPetaniResults.map((petani) => (
                              <button
                                key={petani.id}
                                type="button"
                                onClick={() => {
                                  setPetaniId(petani.id);
                                  setSelectedPetani(petani);
                                  setIsPetaniOpen(false);
                                  setPetaniSearch('');
                                }}
                                className="w-full text-left p-2 rounded-lg text-xs hover:bg-emerald-50/70 transition cursor-pointer flex items-center justify-between group"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="font-semibold text-slate-800 group-hover:text-emerald-900 truncate flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{petani.email}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                    <User className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{petani.name}</span>
                                  </div>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-700 bg-white group-hover:bg-emerald-100 border border-slate-200 group-hover:border-emerald-300 px-2 py-0.5 rounded-md transition shrink-0">
                                  Pilih
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Harga dan Stok (Pricing And Stock) */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Harga dan Stok</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Harga Satuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Harga Satuan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500}
                  value={hargaPerSatuan}
                  onChange={(e) => setHargaPerSatuan(e.target.value)}
                  placeholder="Contoh: 5000"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition text-slate-800 font-semibold"
                />
              </div>

              {/* Stok */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Jumlah Stok Tersedia
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stok}
                  onChange={(e) => setStok(e.target.value)}
                  placeholder="Contoh: 100"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition text-slate-800 font-semibold"
                />
              </div>
            </div>

            {/* Status Ketersediaan */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block">Status Ketersediaan Toko</span>
                <span className="text-[11px] text-slate-400">
                  {isTersedia ? 'Aktif dan dapat dipesan oleh anggota' : 'Stok habis / dinonaktifkan sementara'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTersedia(!isTersedia)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  isTersedia
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isTersedia ? 'Tersedia' : 'Nonaktif'}
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Upload Img & Category (5 Kolom) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Upload Img (Unggah Foto Produk) */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Unggah Foto</h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {images.length} Foto
              </span>
            </div>

            {/* Main Large Image Container Sesuai Gambar 2 */}
            <div className="w-full aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center group">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt="Preview Produk"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <ImageIcon className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                  <span className="text-xs font-medium text-slate-500">
                    Belum ada foto komoditas
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Klik tombol + di bawah atau jepret kamera
                  </span>
                </div>
              )}

              {/* Overlay upload buttons on main image */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(uploadingSource)}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-bold hover:bg-white shadow-xs transition flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Galeri</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(uploadingSource)}
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-bold hover:bg-white shadow-xs transition flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera</span>
                </button>
              </div>

              {uploadingSource && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Mengunggah foto...</span>
                </div>
              )}
            </div>

            {/* Thumbnails Row Sesuai Gambar 2 (+ button for multi upload) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
              {images.map((imgUrl, idx) => {
                const isActive = idx === activeImageIndex;
                return (
                  <div
                    key={idx}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition ${
                      isActive
                        ? 'border-emerald-600 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
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
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-md bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-red-600 transition"
                      title="Hapus foto ini"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {/* Add Image Button Sesuai Gambar 2 (+) */}
              <button
                type="button"
                disabled={Boolean(uploadingSource)}
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex flex-col items-center justify-center gap-0.5 shrink-0 transition cursor-pointer"
                title="Tambah foto komoditas"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] font-bold">Tambah</span>
              </button>
            </div>
          </div>

          {/* Card 2: Kategori (Category) Sesuai Gambar 2 */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Kategori</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Kategori Produk
              </label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/70 border border-transparent rounded-lg flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                      {defaultCategoriesData.find((c) => c.name.toLowerCase() === kategori.toLowerCase())?.emoji && (
                        <span>
                          {defaultCategoriesData.find((c) => c.name.toLowerCase() === kategori.toLowerCase())?.emoji}
                        </span>
                      )}
                      <span>{kategori || 'Pilih Kategori...'}</span>
                    </span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  sideOffset={6}
                  collisionPadding={16}
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] max-h-60 overflow-y-auto rounded-xl p-1 bg-white border border-slate-200 shadow-xl z-50"
                >
                  {categoriesList.map((cat) => {
                    const isSelected = cat === kategori;
                    const catEmoji = defaultCategoriesData.find(
                      (c) => c.name.toLowerCase() === cat.toLowerCase()
                    )?.emoji;

                    return (
                      <DropdownMenuItem
                        key={cat}
                        onClick={() => setKategori(cat)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-800 font-bold'
                            : 'text-slate-700 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <span className="truncate flex items-center gap-1.5">
                          {catEmoji && <span className="text-xs">{catEmoji}</span>}
                          <span>{cat}</span>
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 stroke-[2.5]" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Form Input Kategori Baru jika tombol Add Category ditekan */}
            {isAddingNewCat ? (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="Nama kategori baru..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Simpan Kategori
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(false)}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingNewCat(true)}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kategori</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
