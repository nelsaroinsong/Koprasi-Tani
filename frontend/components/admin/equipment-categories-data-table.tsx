'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Tractor,
  Layers,
  Search,
  RefreshCw,
  X,
  Store,
  ExternalLink,
  EyeOff,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/context/toast-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

export interface EquipmentCategoryItem {
  id: string;
  name: string;
  slug?: string;
  emoji?: string;
  imageUrl?: string;
  description?: string;
  isActive?: boolean;
  equipmentCount?: number;
}

export function EquipmentCategoriesDataTable() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<EquipmentCategoryItem[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Selected for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Single Delete Target
  const [deleteTarget, setDeleteTarget] = useState<EquipmentCategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State (Tambah / Edit Kategori)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Categories & Equipments
  const fetchData = async (isManual = false) => {
    try {
      setIsLoading(true);
      const [catRes, eqRes] = await Promise.all([
        fetch('/api/admin/equipment-categories'),
        fetch('/api/admin/equipments'),
      ]);

      const catData = await catRes.json();
      const eqData = await eqRes.json();

      const eqList = Array.isArray(eqData.equipments) ? eqData.equipments : [];
      setEquipments(eqList);

      // Hitung jumlah alat per kategori
      const countMap: Record<string, number> = {};
      eqList.forEach((item: any) => {
        const catKey = (item.kategori || '').toLowerCase().trim();
        if (catKey) {
          countMap[catKey] = (countMap[catKey] || 0) + 1;
        }
      });

      const rawCategories: EquipmentCategoryItem[] = Array.isArray(catData.categories)
        ? catData.categories
        : [];

      const mapped = rawCategories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.name.toLowerCase().trim().replace(/\s+/g, '-'),
        emoji: c.emoji || '🚜',
        imageUrl: c.imageUrl || '',
        description: c.description || '',
        isActive: c.isActive !== false,
        equipmentCount: countMap[c.name.toLowerCase().trim()] || 0,
      }));

      setCategories(mapped);

      try {
        localStorage.setItem('koperasi_equipment_categories_cache', JSON.stringify(mapped));
        window.dispatchEvent(new Event('equipment_categories_updated'));
      } catch {}

      if (isManual) {
        showToast({
          title: 'Data Disinkronkan',
          message: 'Daftar kategori sewa alat berhasil diperbarui.',
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Gagal Memuat Kategori',
        message: err.message || 'Terjadi gangguan koneksi.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeCount = useMemo(
    () => categories.filter((c) => c.isActive !== false).length,
    [categories]
  );
  const inactiveCount = useMemo(
    () => categories.filter((c) => c.isActive === false).length,
    [categories]
  );

  const STATUS_TABS = [
    { key: 'ALL' as const, label: 'Semua Kategori', count: categories.length },
    { key: 'ACTIVE' as const, label: 'Aktif di Sewa Alat', count: activeCount, dot: 'bg-emerald-500' },
    { key: 'INACTIVE' as const, label: 'Nonaktif', count: inactiveCount, dot: 'bg-slate-400' },
  ];

  // 2. Filter & Pagination
  const filteredCategories = useMemo(() => {
    let result = [...categories];
    if (statusFilter === 'ACTIVE') {
      result = result.filter((c) => c.isActive !== false);
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter((c) => c.isActive === false);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [categories, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredCategories.length / limit) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredCategories.slice(start, start + limit);
  }, [filteredCategories, currentPage, limit]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, statusFilter]);

  // 3. Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedCategories.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const isAllSelected =
    paginatedCategories.length > 0 &&
    paginatedCategories.every((c) => selectedIds.includes(c.id));

  // Helper thumbnail
  const getCategoryThumbnail = (cat: EquipmentCategoryItem) => {
    if (cat.imageUrl) return cat.imageUrl;
    const norm = cat.name.toLowerCase().trim();
    if (norm.includes('kelapa')) return '/api/images/categories/kelapa.jpg';
    if (norm.includes('jagung')) return '/api/images/categories/jagung.jpg';
    if (norm.includes('turunan')) return '/api/images/categories/turunan.jpg';
    if (norm.includes('olahan')) return '/api/images/categories/olahan.jpg';
    return '/api/images/categories/alat.jpg';
  };

  // 4. Open Form Handlers
  const handleOpenAdd = () => {
    setFormMode('CREATE');
    setEditingId(null);
    setFormData({ name: '', description: '', imageUrl: '', isActive: true });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: EquipmentCategoryItem) => {
    setFormMode('EDIT');
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      isActive: item.isActive !== false,
    });
    setIsFormOpen(true);
  };

  // Toggle status kategori Aktif / Nonaktif
  const handleToggleStatus = async (item: EquipmentCategoryItem) => {
    const nextStatus = item.isActive === false ? true : false;
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, isActive: nextStatus } : c))
    );
    try {
      const res = await fetch('/api/admin/equipment-categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isActive: nextStatus }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status');
      showToast({
        title: nextStatus ? 'Kategori Diaktifkan' : 'Kategori Dinonaktifkan',
        message: `Kategori "${item.name}" ${
          nextStatus ? 'kini tampil di Sewa Alat' : 'kini disembunyikan dari Sewa Alat'
        }.`,
        type: nextStatus ? 'success' : 'info',
      });
      try {
        const updatedCats = categories.map((c) =>
          c.id === item.id ? { ...c, isActive: nextStatus } : c
        );
        localStorage.setItem('koperasi_equipment_categories_cache', JSON.stringify(updatedCats));
        window.dispatchEvent(new Event('equipment_categories_updated'));
      } catch {}
    } catch (err: any) {
      // Revert on error
      setCategories((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isActive: !nextStatus } : c))
      );
      showToast({
        title: 'Gagal Mengubah Status',
        message: err.message || 'Terjadi gangguan saat menyimpan status.',
        type: 'error',
      });
    }
  };

  // Upload image handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload/equipment', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto kategori alat');
      }
      const uploadedUrl = data.url || data.imageUrl;
      setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      showToast({
        title: 'Foto Berhasil Diunggah',
        message: 'Foto kategori alat siap disimpan.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Upload Foto',
        message: err.message || 'Terjadi kesalahan saat upload.',
        type: 'error',
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 5. Submit Tambah / Edit Kategori
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();

    if (!cleanName) {
      showToast({
        title: 'Nama Kategori Wajib Diisi',
        message: 'Silakan isi nama kategori alat pertanian.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const isEdit = formMode === 'EDIT';
      const method = isEdit ? 'PUT' : 'POST';
      const payload: any = {
        name: cleanName,
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim() || undefined,
        isActive: formData.isActive,
      };

      if (isEdit) {
        payload.id = editingId;
      }

      const res = await fetch('/api/admin/equipment-categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan kategori sewa alat');
      }

      showToast({
        title: isEdit ? 'Kategori Diperbarui' : 'Kategori Ditambahkan',
        message: data.message || `Kategori "${cleanName}" berhasil disimpan.`,
        type: 'success',
      });

      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi gangguan saat menyimpan data.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Delete Handlers
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/equipment-categories?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus kategori');
      }

      showToast({
        title: 'Kategori Dihapus',
        message: `Kategori "${deleteTarget.name}" berhasil dihapus.`,
        type: 'success',
      });

      setDeleteTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      fetchData();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus',
        message: err.message || 'Terjadi kesalahan sistem.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const res = await fetch(
        `/api/admin/equipment-categories?ids=${selectedIds.join(',')}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus sebagian kategori.');
      }

      showToast({
        title: 'Penghapusan Massal Selesai',
        message: `${selectedIds.length} kategori sewa alat berhasil dihapus.`,
        type: 'success',
      });

      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      fetchData();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus Massal',
        message: err.message || 'Terjadi kendala saat menghapus sebagian kategori.',
        type: 'error',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Stat Cards: 3 Kartu Ringkasan di Atas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Kategori Alat */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Total Kategori Sewa Alat</span>
            <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Tag className="w-3.5 h-3.5 text-slate-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {categories.length}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Total ragam kategori alat terdaftar
          </p>
        </div>

        {/* Card 2: Kategori Aktif di Sewa Alat */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Kategori Aktif di Sewa Alat</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {activeCount}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Tampil di navigasi & etalase sewa alat
          </p>
        </div>

        {/* Card 3: Nonaktif / Disembunyikan */}
        <div className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-500">Kategori Dinonaktifkan</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
            </span>
          </div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums tracking-tight">
            {inactiveCount}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            Disembunyikan dari katalog sewa alat
          </p>
        </div>
      </div>

      {/* 2. Kravio Outer Double-Container Shell */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        {/* Header: Judul + Counter + Link Publik Sewa Alat */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Tractor className="w-4 h-4 text-slate-600 stroke-[1.8]" />
            <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">
              Kategori Sewa Alat
            </h2>
            <span className="h-5 px-1.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 tabular-nums flex items-center">
              {filteredCategories.length}
            </span>
          </div>

          <a
            href="/sewa-alat"
            target="_blank"
            rel="noopener noreferrer"
            className="h-6 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md flex items-center gap-1 shadow-2xs hover:bg-slate-50 transition"
            title="Buka etalase sewa alat publik di tab baru"
          >
            <Store className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">Lihat Etalase Sewa Alat</span>
            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
          </a>
        </div>

        {/* Status Filter Tabs (Pill Style) */}
        <div className="px-3 py-2 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10.5px] tabular-nums ${
                      isActive ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar: Search, Refresh, Tambah Kategori */}
        <div className="px-3 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            {/* Search Box */}
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kategori sewa alat..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[#E5E7EB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0"
              title="Segarkan data kategori alat"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-800' : ''}`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kategori Alat</span>
          </button>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mx-3 mb-2 px-3 py-2 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-xs shadow-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">
                {selectedIds.length} kategori dipilih
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Inner White Table Box */}
        <div className="bg-white rounded-xl border border-[#ECEEF2] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#FAFBFD] border-b border-[#F1F3F5]">
                <TableRow className="border-[#F1F3F5] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-3.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Pilih semua di halaman ini"
                      className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center py-3.5 text-[11.5px] font-semibold text-slate-500 whitespace-nowrap">
                    No
                  </TableHead>
                  <TableHead className="w-16 text-center py-3.5 text-[11.5px] font-semibold text-slate-600 whitespace-nowrap">
                    Ikon
                  </TableHead>
                  <TableHead className="py-3.5 text-[11.5px] font-semibold text-slate-600 whitespace-nowrap min-w-[160px]">
                    Nama Kategori
                  </TableHead>
                  <TableHead className="py-3.5 text-[11.5px] font-semibold text-slate-600 whitespace-nowrap min-w-[200px]">
                    Deskripsi
                  </TableHead>
                  <TableHead className="py-3.5 text-center text-[11.5px] font-semibold text-slate-600 whitespace-nowrap min-w-[150px]">
                    Status di Sewa Alat
                  </TableHead>
                  <TableHead className="py-3.5 text-center text-[11.5px] font-semibold text-slate-600 whitespace-nowrap min-w-[120px]">
                    Jumlah Unit
                  </TableHead>
                  <TableHead className="w-24 py-3.5 text-right pr-4 text-[11.5px] font-semibold text-slate-600 whitespace-nowrap">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">
                          Memuat kategori alat...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Tag className="w-6 h-6 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">
                          {searchQuery || statusFilter !== 'ALL'
                            ? 'Tidak ada kategori yang cocok dengan filter'
                            : 'Belum ada kategori sewa alat terdaftar'}
                        </span>
                        <span className="text-[11.5px] text-slate-400 max-w-sm">
                          {searchQuery || statusFilter !== 'ALL'
                            ? 'Coba sesuaikan kata kunci pencarian atau ganti tab filter.'
                            : 'Klik tombol "Tambah Kategori Alat" untuk menambahkan kategori.'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCategories.map((item, index) => {
                    const isChecked = selectedIds.includes(item.id);
                    const rowNumber = (currentPage - 1) * limit + index + 1;

                    return (
                      <TableRow
                        key={item.id}
                        className={`border-b border-[#F1F3F5] hover:bg-slate-50/70 transition-colors ${
                          isChecked ? 'bg-slate-50/90' : ''
                        }`}
                      >
                        <TableCell className="w-10 text-center py-3.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold text-slate-400 tabular-nums py-3.5">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden mx-auto flex items-center justify-center shrink-0 shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getCategoryThumbnail(item)}
                              alt={item.name}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="font-semibold text-xs text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-400">/{item.slug}</div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-xs text-slate-500 line-clamp-1">
                            {item.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <div className="inline-flex items-center justify-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={item.isActive !== false}
                              onClick={() => handleToggleStatus(item)}
                              title={`Klik untuk ${
                                item.isActive !== false ? 'menonaktifkan' : 'mengaktifkan'
                              } kategori ini di etalase sewa alat`}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                                item.isActive !== false
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-300 hover:bg-slate-400'
                              }`}
                            >
                              <span className="sr-only">Toggle status kategori</span>
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  item.isActive !== false ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[11.5px] font-medium select-none w-14 text-left ${
                                item.isActive !== false
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.isActive !== false ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs">
                            {item.equipmentCount || 0} unit
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Kategori"
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shadow-2xs"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              title="Hapus Kategori"
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer with Info & Pagination */}
          <div className="px-4 py-3 border-t border-[#F1F3F5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
            <div className="flex items-center gap-3">
              <div>
                Menampilkan{' '}
                <strong className="text-slate-800 font-semibold">
                  {filteredCategories.length > 0 ? (currentPage - 1) * limit + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-800 font-semibold">
                  {Math.min(currentPage * limit, filteredCategories.length)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-800 font-semibold">
                  {filteredCategories.length}
                </strong>{' '}
                total kategori sewa alat
              </div>

              {/* Limit Dropdown */}
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-400">Limit:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Sebelumnya
              </button>
              <span className="px-2 text-slate-600 font-semibold tabular-nums">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer shadow-2xs"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Modal Tambah / Edit Kategori */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-700" />
              <span>{formMode === 'CREATE' ? 'Tambah Kategori Sewa Alat' : 'Edit Kategori Sewa Alat'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kategori <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Traktor Roda 4, Mesin Perontok Padi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* Foto / Gambar Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gambar / Ikon Kategori (Mode Mobile & Etalase)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative group">
                  {formData.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.imageUrl}
                        alt="Preview Kategori"
                        className="w-full h-full object-contain p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Hapus Foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs disabled:opacity-60"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{formData.imageUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                        </>
                      )}
                    </button>
                    {formData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="py-1.5 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium cursor-pointer transition"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Disarankan rasio 1:1 persegi (PNG/JPG/WebP) untuk kartu navigasi sewa alat.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Ringkas (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Penjelasan fungsi alat yang termasuk dalam kategori ini..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition resize-none"
              />
            </div>

            {/* Toggle Status Aktif / Nonaktif */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Status Kategori di Sewa Alat</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {formData.isActive
                    ? 'Kategori ini aktif & tampil di etalase sewa alat.'
                    : 'Kategori ini disembunyikan dari etalase sewa alat.'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.isActive}
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                  formData.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span className="sr-only">Toggle status di sewa alat</span>
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    formData.isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-60 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{formMode === 'CREATE' ? 'Simpan Kategori' : 'Simpan Perubahan'}</span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog Konfirmasi Hapus Tunggal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm p-6 bg-white rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Hapus Kategori Alat?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus kategori{' '}
            <strong className="text-slate-800 font-bold">"{deleteTarget?.name}"</strong>? Unit alat dengan kategori ini tidak akan terhapus.
          </p>
          <DialogFooter className="gap-2 pt-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Hapus Kategori</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Dialog Konfirmasi Hapus Massal */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm p-6 bg-white rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Hapus {selectedIds.length} Kategori Terpilih?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tindakan ini akan menghapus {selectedIds.length} kategori sewa alat sekaligus dari daftar.
          </p>
          <DialogFooter className="gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Hapus Semua</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
