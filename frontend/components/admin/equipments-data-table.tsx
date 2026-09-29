'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  Tractor,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Tag,
  Wrench,
  Check,
  X,
  Upload,
  Camera,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { EquipmentItem } from '@/lib/equipments';

const KONDISI_PRESETS = ['Sangat Baik', 'Siap Pakai', 'Dalam Perawatan'];
const PAGE_SIZE = 10;

interface EquipmentCategoryItem {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
}

export default function EquipmentsDataTable() {
  const { showToast } = useToast();
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<EquipmentCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');
  const [currentPage, setCurrentPage] = useState(1);

  // Checkbox Select States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modal Form State (Tambah / Edit Alat)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formSpesifikasi, setFormSpesifikasi] = useState('');
  const [formHargaSewa, setFormHargaSewa] = useState('');
  const [formSatuanSewa, setFormSatuanSewa] = useState('hari');
  const [formBiayaOperator, setFormBiayaOperator] = useState('');
  const [formStokUnit, setFormStokUnit] = useState('1');
  const [formKondisi, setFormKondisi] = useState('Sangat Baik');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsTersedia, setFormIsTersedia] = useState(true);
  const [formKontakPj, setFormKontakPj] = useState('081944078924');

  // Photo Upload States (Kamera & Galeri)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSource, setUploadingSource] = useState<'CAMERA' | 'GALLERY' | null>(null);
  const isUploadingPhoto = Boolean(uploadingSource);

  // Delete Dialog State (Hapus Tunggal)
  const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category Management Modal State (CRUD Kategori Alat)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('🚜');
  const [catDescription, setCatDescription] = useState('');
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);
  const [catDeleteTarget, setCatDeleteTarget] = useState<EquipmentCategoryItem | null>(null);
  const [isCatDeleting, setIsCatDeleting] = useState(false);

  // Fetch Kategori Alat
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/equipment-categories');
      const data = await res.json();
      if (res.ok && Array.isArray(data.categories)) {
        setCategoriesList(data.categories);
        if (!formKategori && data.categories.length > 0) {
          setFormKategori(data.categories[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Fetch Data Alat
  const fetchEquipments = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch('/api/admin/equipments');
      const data = await res.json();
      if (res.ok && data.equipments) {
        setEquipments(data.equipments);
      } else {
        showToast({
          title: 'Gagal Memuat Data',
          message: data.error || 'Terjadi kesalahan saat memuat inventaris alat.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Kesalahan Sistem',
        message: 'Gagal terhubung ke server API sewa alat.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
    fetchCategories();
  }, []);

  // Filter Data
  const filteredEquipments = useMemo(() => {
    return equipments.filter((item) => {
      const matchKategori = selectedKategori === 'SEMUA' || item.kategori === selectedKategori;
      const matchSearch =
        !searchQuery.trim() ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchKategori && matchSearch;
    });
  }, [equipments, selectedKategori, searchQuery]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [selectedKategori, searchQuery]);

  // Pagination Calculation
  const totalPages = Math.max(1, Math.ceil(filteredEquipments.length / PAGE_SIZE));
  const paginatedEquipments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEquipments.slice(start, start + PAGE_SIZE);
  }, [filteredEquipments, currentPage]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const totalUnit = equipments.reduce((sum, item) => sum + (item.stokUnit || 1), 0);
    const unitTersedia = equipments
      .filter((i) => i.isTersedia)
      .reduce((sum, item) => sum + (item.stokUnit || 1), 0);
    const unitPerawatan = totalUnit - unitTersedia;
    return { totalUnit, unitTersedia, unitPerawatan, totalJenis: equipments.length };
  }, [equipments]);

  // Checkbox Selection Handlers
  const isAllCurrentPageSelected =
    paginatedEquipments.length > 0 &&
    paginatedEquipments.every((item) => selectedIds.includes(item.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const currentPageIds = new Set(paginatedEquipments.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...paginatedEquipments.map((i) => i.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Upload Foto (Kamera / Galeri ke Cloudflare R2)
  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    source: 'CAMERA' | 'GALLERY'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format Tidak Sesuai',
        message: 'Pilih berkas gambar yang valid (JPG, PNG, atau WebP).',
        type: 'warning',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: 'Ukuran Terlalu Besar',
        message: 'Ukuran foto maksimal 5 MB.',
        type: 'error',
      });
      return;
    }

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

      setFormImageUrl(data.url);
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

  // Buka Modal Tambah Alat
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormNama('');
    setFormKategori(categoriesList[0]?.name || 'Traktor & Pengolah Lahan');
    setFormDeskripsi('');
    setFormSpesifikasi('');
    setFormHargaSewa('');
    setFormSatuanSewa('hari');
    setFormBiayaOperator('');
    setFormStokUnit('1');
    setFormKondisi('Sangat Baik');
    setFormImageUrl('');
    setFormIsTersedia(true);
    setFormKontakPj('081944078924');
    setIsFormOpen(true);
  };

  // Buka Modal Edit Alat
  const handleOpenEdit = (item: EquipmentItem) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormKategori(item.kategori || categoriesList[0]?.name || 'Traktor & Pengolah Lahan');
    setFormDeskripsi(item.deskripsi || '');
    setFormSpesifikasi(item.spesifikasi || '');
    setFormHargaSewa(item.hargaSewa.toString());
    setFormSatuanSewa(item.satuanSewa || 'hari');
    setFormBiayaOperator(item.biayaOperator ? item.biayaOperator.toString() : '');
    setFormStokUnit((item.stokUnit || 1).toString());
    setFormKondisi(item.kondisi || 'Sangat Baik');
    setFormImageUrl(item.imageUrl || '');
    setFormIsTersedia(item.isTersedia);
    setFormKontakPj(item.kontakPj || '081944078924');
    setIsFormOpen(true);
  };

  // Submit Simpan Alat (Tambah / Edit dengan Validasi)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNama = formNama.trim();
    const cleanKategori = formKategori.trim();
    const hargaNum = Number(formHargaSewa);
    const stokNum = Number(formStokUnit);

    // Validasi Form
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
        message: 'Silakan pilih kategori alat atau kelola kategori terlebih dahulu.',
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
        message: 'Stok unit alat yang siap disewakan minimal 1 unit.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: editingItem?.id,
        nama: cleanNama,
        kategori: cleanKategori,
        deskripsi: formDeskripsi.trim(),
        spesifikasi: formSpesifikasi.trim(),
        hargaSewa: hargaNum,
        satuanSewa: formSatuanSewa,
        biayaOperator: formBiayaOperator ? Number(formBiayaOperator) : 0,
        stokUnit: stokNum,
        kondisi: formKondisi,
        imageUrl: formImageUrl.trim(),
        isTersedia: formIsTersedia,
        kontakPj: formKontakPj.trim(),
      };

      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/equipments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan alat pertanian');
      }

      showToast({
        title: editingItem ? 'Alat Diperbarui' : 'Alat Ditambahkan',
        message: data.message || `Data unit "${cleanNama}" berhasil disimpan.`,
        type: 'success',
      });

      setIsFormOpen(false);
      fetchEquipments(true);
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

  // Konfirmasi Hapus Tunggal
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/equipments?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus unit alat');
      }

      showToast({
        title: 'Alat Dihapus',
        message: `Unit "${deleteTarget.nama}" berhasil dihapus dari inventaris.`,
        type: 'success',
      });

      setDeleteTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      fetchEquipments(true);
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Menghapus',
        message: err.message || 'Terjadi gangguan saat menghapus unit alat.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Konfirmasi Hapus Banyak (Bulk Delete)
  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const res = await fetch('/api/admin/equipments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus unit terpilih');
      }

      showToast({
        title: 'Penghapusan Massal Berhasil',
        message: `${selectedIds.length} unit alat berhasil dihapus dari inventaris.`,
        type: 'success',
      });

      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      fetchEquipments(true);
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Menghapus Banyak',
        message: err.message || 'Terjadi gangguan saat menghapus beberapa unit alat.',
        type: 'error',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Quick Toggle Status Ketersediaan
  const handleToggleStatus = async (item: EquipmentItem) => {
    const nextVal = !item.isTersedia;
    try {
      setEquipments((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isTersedia: nextVal } : i))
      );

      const res = await fetch('/api/admin/equipments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isTersedia: nextVal }),
      });

      if (!res.ok) {
        throw new Error('Gagal mengubah status unit');
      }

      showToast({
        title: nextVal ? 'Unit Tersedia' : 'Unit Dinonaktifkan',
        message: `Status unit "${item.nama}" telah diubah menjadi ${
          nextVal ? 'Tersedia untuk disewa' : 'Dalam perawatan/disewa'
        }.`,
        type: 'info',
      });
    } catch (err: any) {
      setEquipments((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isTersedia: !nextVal } : i))
      );
      showToast({
        title: 'Gagal Mengubah Status',
        message: err.message || 'Terjadi kesalahan sistem.',
        type: 'error',
      });
    }
  };

  // CRUD Kategori Alat Handlers
  const handleOpenCategoryManager = () => {
    setCatEditingId(null);
    setCatName('');
    setCatEmoji('🚜');
    setCatDescription('');
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: EquipmentCategoryItem) => {
    setCatEditingId(cat.id);
    setCatName(cat.name);
    setCatEmoji(cat.emoji || '🚜');
    setCatDescription(cat.description || '');
  };

  const handleCancelEditCategory = () => {
    setCatEditingId(null);
    setCatName('');
    setCatEmoji('🚜');
    setCatDescription('');
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catName.trim();
    if (!cleanName) {
      showToast({
        title: 'Nama Kategori Wajib Diisi',
        message: 'Masukkan nama kategori alat pertanian.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsCatSubmitting(true);
      const method = catEditingId ? 'PUT' : 'POST';
      const bodyPayload = catEditingId
        ? { id: catEditingId, name: cleanName, emoji: catEmoji, description: catDescription }
        : { name: cleanName, emoji: catEmoji, description: catDescription };

      const res = await fetch('/api/admin/equipment-categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan kategori alat');
      }

      showToast({
        title: catEditingId ? 'Kategori Diperbarui' : 'Kategori Ditambahkan',
        message: data.message || `Kategori "${cleanName}" berhasil disimpan.`,
        type: 'success',
      });

      handleCancelEditCategory();
      fetchCategories();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan Kategori',
        message: err.message || 'Terjadi kendala saat menyimpan kategori.',
        type: 'error',
      });
    } finally {
      setIsCatSubmitting(false);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!catDeleteTarget) return;
    try {
      setIsCatDeleting(true);
      const res = await fetch(`/api/admin/equipment-categories?id=${catDeleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus kategori');
      }

      showToast({
        title: 'Kategori Dihapus',
        message: `Kategori "${catDeleteTarget.name}" berhasil dihapus.`,
        type: 'success',
      });

      setCatDeleteTarget(null);
      fetchCategories();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus Kategori',
        message: err.message || 'Terjadi kendala saat menghapus kategori.',
        type: 'error',
      });
    } finally {
      setIsCatDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Info Statistik (Format Seragam Seperti di Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Tractor className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalUnit}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Total Unit ({stats.totalJenis} Model)
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.unitTersedia}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Unit Siap Dipinjam / Sewa
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {stats.unitPerawatan}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Perawatan / Disewa
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-800 text-white rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] text-emerald-200 font-medium">Layanan Sewa Koperasi</div>
          <div className="text-sm font-bold flex items-center justify-between mt-1">
            <span>Subsidi Anggota</span>
            <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Bar: Search, Category Filter, Refresh, Kelola Kategori, Tambah Alat */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari traktor, kultivator, spesifikasi..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Dynamic Category Filter Dropdown */}
          <select
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white cursor-pointer"
          >
            <option value="SEMUA">Semua Kategori ({categoriesList.length})</option>
            {categoriesList.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.emoji || '⚙️'} {cat.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              fetchEquipments();
              fetchCategories();
            }}
            title="Segarkan Data"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer shrink-0 self-center sm:self-auto shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        </div>

        {/* Action Buttons: Kelola Kategori Alat & Tambah Alat */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenCategoryManager}
            className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Kelola Kategori Alat Pertanian"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kelola Kategori</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none py-2 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Alat Pertanian</span>
          </button>
        </div>
      </div>

      {/* 3. Floating Bulk Action Bar (Saat Ada Item Dipilih) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-bold text-emerald-900">
              {selectedIds.length} unit alat dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
            >
              Batal Pilihan
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.length}) Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Data Table dengan Checkbox & Pagination Max 10 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs text-slate-500 font-medium">Memuat data sewa alat...</span>
          </div>
        ) : filteredEquipments.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <Tractor className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak ada unit alat pertanian</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchQuery || selectedKategori !== 'SEMUA'
                ? 'Tidak ditemukan alat yang cocok dengan filter atau kata kunci pencarian.'
                : 'Belum ada alat pertanian yang didaftarkan. Klik tombol Tambah Alat Pertanian untuk mulai menginput inventaris.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    {/* Checkbox Select All */}
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleToggleSelectAll}
                        title="Pilih semua di halaman ini"
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Nama Alat & Spesifikasi</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Tarif Sewa Koperasi</th>
                    <th className="py-3 px-4">Stok & Kondisi</th>
                    <th className="py-3 px-4 text-center">Ketersediaan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEquipments.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Checkbox Single Select */}
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(item.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                        </td>

                        {/* Nama Alat & Spesifikasi */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.nama}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Tractor className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                {item.nama}
                              </div>
                              {item.spesifikasi && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 line-clamp-1">
                                  <Wrench className="w-3 h-3 shrink-0 text-slate-400" />
                                  <span className="truncate">{item.spesifikasi}</span>
                                </div>
                              )}
                              {item.deskripsi && (
                                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                  {item.deskripsi}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.kategori}
                          </span>
                        </td>

                        {/* Tarif Sewa */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-emerald-800 text-xs sm:text-sm">
                            Rp {item.hargaSewa.toLocaleString('id-ID')}
                            <span className="text-[10px] text-slate-500 font-normal">
                              {' '}/ {item.satuanSewa}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.biayaOperator
                              ? `+ Rp ${item.biayaOperator.toLocaleString('id-ID')} (Operator)`
                              : 'Mandiri / Bebas Operator'}
                          </div>
                        </td>

                        {/* Stok & Kondisi */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-xs">
                            {item.stokUnit || 1} Unit Tersedia
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            <span
                              className={`font-semibold ${
                                item.kondisi === 'Sangat Baik'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {item.kondisi}
                            </span>
                          </div>
                        </td>

                        {/* Ketersediaan */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            title="Klik untuk ubah ketersediaan"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shadow-2xs ${
                              item.isTersedia
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isTersedia ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                              }`}
                            />
                            <span>{item.isTersedia ? 'Tersedia' : 'Disewa / Perawatan'}</span>
                          </button>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Alat"
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              title="Hapus Alat"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Maksimal 10 Data per Halaman) */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                Menampilkan{' '}
                <strong className="text-slate-800">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * PAGE_SIZE, filteredEquipments.length)}
                </strong>{' '}
                dari <strong className="text-slate-800">{filteredEquipments.length}</strong> unit alat
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs transition shadow-2xs ${
                      currentPage === page
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition shadow-2xs"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. Modal Tambah / Edit Alat Pertanian (UI Dilebarkan ke Samping: max-w-4xl) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-emerald-600" />
              <span>{editingItem ? 'Edit Unit Alat Pertanian' : 'Tambah Alat Pertanian Baru'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs mt-3">
            {/* Grid 2 Kolom Luas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* Kolom Kiri: Informasi Pokok */}
              <div className="space-y-3.5">
                {/* Nama Alat */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Alat Pertanian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Traktor Roda 4 Kubota L4018"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* Kategori & Kondisi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kategori Alat <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium cursor-pointer"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.emoji || '⚙️'} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kondisi Unit Fisik</label>
                    <select
                      value={formKondisi}
                      onChange={(e) => setFormKondisi(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium cursor-pointer"
                    >
                      {KONDISI_PRESETS.map((kon) => (
                        <option key={kon} value={kon}>
                          {kon}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tarif Sewa & Satuan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Tarif Sewa Pokok (Rp) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formHargaSewa}
                        onChange={(e) => setFormHargaSewa(e.target.value)}
                        placeholder="Contoh: 150000"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Satuan Waktu</label>
                    <select
                      value={formSatuanSewa}
                      onChange={(e) => setFormSatuanSewa(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="hari">/ hari</option>
                      <option value="jam">/ jam</option>
                      <option value="hektar">/ hektar</option>
                      <option value="minggu">/ minggu</option>
                    </select>
                  </div>
                </div>

                {/* Biaya Operator & Stok Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Biaya Operator Opsional (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={formBiayaOperator}
                        onChange={(e) => setFormBiayaOperator(e.target.value)}
                        placeholder="Kosongkan jika mandiri"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Jumlah Stok Unit Siap Pakai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formStokUnit}
                      onChange={(e) => setFormStokUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                {/* WhatsApp PJ & Status Ketersediaan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kontak WhatsApp PJ Sewa Alat
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formKontakPj}
                        onChange={(e) => setFormKontakPj(e.target.value)}
                        placeholder="081944078924"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:pt-6">
                    <input
                      type="checkbox"
                      id="formIsTersedia"
                      checked={formIsTersedia}
                      onChange={(e) => setFormIsTersedia(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <label
                      htmlFor="formIsTersedia"
                      className="font-bold text-slate-700 cursor-pointer select-none"
                    >
                      Langsung Aktifkan untuk Disewa
                    </label>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Foto Kamera / File & Deskripsi Teknis */}
              <div className="space-y-3.5">
                {/* Metode Input Foto: Kamera Langsung & Unggah Berkas Galeri (Persis Toko Online) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Foto Unit Alat Fisik
                  </label>

                  {/* Hidden Input File Galeri */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={(e) => handlePhotoUpload(e, 'GALLERY')}
                    className="hidden"
                  />

                  {/* Hidden Input Kamera Langsung */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoUpload(e, 'CAMERA')}
                    className="hidden"
                  />

                  {formImageUrl ? (
                    /* Preview Box jika foto sudah ada */
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-white shadow-2xs relative">
                          <img
                            src={formImageUrl}
                            alt="Preview Alat"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Foto Fisik Alat Berhasil Dipasang</span>
                          </div>
                          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                            Foto siap ditampilkan di katalog sewa anggota
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-60"
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
                          onClick={() => setFormImageUrl('')}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 2 Opsi Tombol Input Foto (Persis Toko Online) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900 transition flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs disabled:opacity-60"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition">
                          {uploadingSource === 'CAMERA' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-emerald-900">
                          {uploadingSource === 'CAMERA' ? 'Menyimpan Foto...' : 'Jepret Kamera Langsung'}
                        </div>
                        <div className="text-[10px] text-emerald-700 mt-0.5">
                          Ambil foto fisik mesin di gudang
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs disabled:opacity-60"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition">
                          {uploadingSource === 'GALLERY' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          {uploadingSource === 'GALLERY' ? 'Mengunggah Berkas...' : 'Unggah dari Berkas / Galeri'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Pilih foto JPG, PNG, atau WebP
                        </div>
                      </button>
                    </div>
                  )}

                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Atau tempel URL gambar (/api/images/sewa-alat/... atau https://...)"
                    className="w-full mt-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[11px] font-mono text-slate-600"
                  />
                </div>

                {/* Spesifikasi Teknis */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Spesifikasi Teknis (Daya, Mesin, Implemen)
                  </label>
                  <input
                    type="text"
                    value={formSpesifikasi}
                    onChange={(e) => setFormSpesifikasi(e.target.value)}
                    placeholder="Contoh: Mesin Diesel 4 Silinder 40 HP, 4WD, Rotary Tiller"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Deskripsi Lengkap & Peruntukan Lahan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Deskripsi Lengkap & Peruntukan Lahan
                  </label>
                  <textarea
                    rows={3}
                    value={formDeskripsi}
                    onChange={(e) => setFormDeskripsi(e.target.value)}
                    placeholder="Jelaskan jenis lahan yang cocok, keunggulan unit, dan panduan operasional..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Inventaris'}</span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Modal CRUD Kategori Alat Pertanian */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-600" />
              <span>Kelola Kategori Alat Pertanian</span>
            </DialogTitle>
          </DialogHeader>

          {/* Form Tambah / Edit Kategori */}
          <form
            onSubmit={handleSaveCategory}
            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs mt-2"
          >
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>{catEditingId ? 'Edit Kategori Alat' : '+ Tambah Kategori Baru'}</span>
              {catEditingId && (
                <button
                  type="button"
                  onClick={handleCancelEditCategory}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1">
                <label className="block font-semibold text-slate-600 mb-1">Emoji</label>
                <input
                  type="text"
                  value={catEmoji}
                  onChange={(e) => setCatEmoji(e.target.value)}
                  placeholder="🚜"
                  maxLength={4}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-3">
                <label className="block font-semibold text-slate-600 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Contoh: Drone & Penyemprotan"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Deskripsi Ringkas</label>
              <input
                type="text"
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Peruntukan alat dalam kategori ini..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isCatSubmitting}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-60"
            >
              {isCatSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{catEditingId ? 'Perbarui Kategori' : 'Tambahkan Kategori'}</span>
            </button>
          </form>

          {/* List Kategori Terdaftar */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Daftar Kategori Aktif ({categoriesList.length})</span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {categoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg leading-none shrink-0">{cat.emoji || '⚙️'}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">{cat.name}</div>
                      {cat.description && (
                        <div className="text-[10px] text-slate-400 truncate">{cat.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      title="Edit Kategori"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatDeleteTarget(cat)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="py-1.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Dialog Konfirmasi Hapus Kategori */}
      <Dialog
        open={Boolean(catDeleteTarget)}
        onOpenChange={(open) => !open && setCatDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm p-5 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-sm font-bold text-slate-900">
            Hapus Kategori Alat?
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            Apakah Anda yakin ingin menghapus kategori{' '}
            <strong className="text-slate-800">{catDeleteTarget?.name}</strong>?
          </p>

          <DialogFooter className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCatDeleteTarget(null)}
              className="w-1/2 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteCategoryConfirm}
              disabled={isCatDeleting}
              className="w-1/2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isCatDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Dialog Konfirmasi Hapus Tunggal Alat */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm p-5 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-sm font-bold text-slate-900">
            Hapus Alat dari Inventaris?
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            Apakah Anda yakin ingin menghapus unit{' '}
            <strong className="text-slate-800 font-bold">{deleteTarget?.nama}</strong>? Alat ini tidak akan lagi tampil di katalog sewa anggota.
          </p>

          <DialogFooter className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="w-1/2 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-1/2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Dialog Konfirmasi Hapus Banyak (Bulk Delete) */}
      <Dialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => !open && setIsBulkDeleteDialogOpen(false)}
      >
        <DialogContent className="max-w-sm p-5 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-sm font-bold text-slate-900">
            Hapus {selectedIds.length} Unit Sekaligus?
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            Tindakan ini akan menghapus permanen{' '}
            <strong className="text-red-700">{selectedIds.length} unit alat</strong> yang sedang dipilih dari katalog inventaris koperasi.
          </p>

          <DialogFooter className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="w-1/2 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="w-1/2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Hapus Semua'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
