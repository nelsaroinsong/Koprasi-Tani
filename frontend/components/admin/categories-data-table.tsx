'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Package,
  Layers,
  Search,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  X,
  Check,
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

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  imageUrl?: string;
  description?: string;
  mobileBg?: string;
  isActive?: boolean;
  productCount?: number;
}

export function CategoriesDataTable() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Single Delete Target
  const [targetCategory, setTargetCategory] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
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

  // 1. Fetch Categories
  const fetchCategories = async (isManual = false) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
        try {
          localStorage.setItem('koperasi_categories_cache', JSON.stringify(data.categories));
          window.dispatchEvent(new Event('categories_updated'));
        } catch {}

        if (isManual) {
          showToast({
            title: 'Data Disinkronkan',
            message: 'Daftar kategori komoditas berhasil diperbarui.',
            type: 'info',
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
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
    fetchCategories();
  }, []);

  // 2. Filter & Pagination
  const filteredCategories = useMemo(() => {
    let result = [...categories];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [categories, searchQuery]);

  const totalPages = Math.ceil(filteredCategories.length / limit) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredCategories.slice(start, start + limit);
  }, [filteredCategories, currentPage, limit]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery]);

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
  const getCategoryThumbnail = (cat: CategoryItem) => {
    if (cat.imageUrl) return cat.imageUrl;
    const norm = cat.name.toLowerCase().trim();
    if (norm.includes('kelapa')) return '/api/images/categories/kelapa.jpg';
    if (norm.includes('jagung')) return '/api/images/categories/jagung.jpg';
    if (norm.includes('turunan')) return '/api/images/categories/turunan.jpg';
    if (norm.includes('olahan') || norm.includes('vco') || norm.includes('minyak')) return '/api/images/categories/olahan.jpg';
    return '/api/images/categories/all.jpg';
  };

  // 4. Open Form Handlers
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setEditingId(null);
    setFormData({ name: '', description: '', imageUrl: '', isActive: true });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setFormMode('EDIT');
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      isActive: cat.isActive !== false,
    });
    setIsFormOpen(true);
  };

  // Toggle status kategori Aktif / Nonaktif
  const handleToggleStatus = async (category: CategoryItem) => {
    const nextStatus = category.isActive === false ? true : false;
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, isActive: nextStatus } : c))
    );
    try {
      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, isActive: nextStatus }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status');
      showToast({
        title: nextStatus ? 'Kategori Diaktifkan' : 'Kategori Dinonaktifkan',
        message: `Kategori "${category.name}" ${
          nextStatus ? 'kini tampil di Toko' : 'kini disembunyikan dari Toko'
        }.`,
        type: nextStatus ? 'success' : 'info',
      });
      const updatedCats = categories.map((c) =>
        c.id === category.id ? { ...c, isActive: nextStatus } : c
      );
      try {
        localStorage.setItem('koperasi_categories_cache', JSON.stringify(updatedCats));
        window.dispatchEvent(new Event('categories_updated'));
      } catch {}
    } catch (err: any) {
      // Revert on error
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: !nextStatus } : c))
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
      const res = await fetch('/api/upload/product', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah gambar kategori');
      }
      const uploadedUrl = data.url || data.imageUrl;
      setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      showToast({
        title: 'Gambar Berhasil Diunggah',
        message: 'Foto kategori siap disimpan.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Upload Gambar',
        message: err.message || 'Terjadi kesalahan saat upload.',
        type: 'error',
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 5. Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();

    if (!cleanName) {
      showToast({
        title: 'Nama Wajib Diisi',
        message: 'Mohon masukkan nama kategori komoditas.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const isEdit = formMode === 'EDIT';
      const url = '/api/categories';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload: any = {
        name: cleanName,
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim() || undefined,
        isActive: formData.isActive,
      };

      if (isEdit) {
        payload.id = editingId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan kategori komoditas.');
      }

      showToast({
        title: isEdit ? 'Kategori Diperbarui' : 'Kategori Ditambahkan',
        message: `Kategori "${cleanName}" berhasil disimpan.`,
        type: 'success',
      });

      setIsFormOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi gangguan koneksi.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Delete Handlers
  const handleDeleteConfirm = async () => {
    if (!targetCategory) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/categories?id=${targetCategory.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus kategori.');
      }

      showToast({
        title: 'Kategori Dihapus',
        message: `Kategori "${targetCategory.name}" berhasil dihapus.`,
        type: 'success',
      });

      setTargetCategory(null);
      setSelectedIds((prev) => prev.filter((id) => id !== targetCategory.id));
      fetchCategories();
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
      const res = await fetch(`/api/categories?ids=${selectedIds.join(',')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus sebagian kategori.');
      }

      showToast({
        title: 'Penghapusan Massal Selesai',
        message: `${selectedIds.length} kategori komoditas berhasil dihapus.`,
        type: 'success',
      });

      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus Massal',
        message: err.message || 'Terjadi gangguan saat menghapus sebagian kategori.',
        type: 'error',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <div className="space-y-5">
      {/* 1. Header Ringkasan & Info (3 Kartu Bersih Seragam) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <Tag className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 tracking-tight leading-none">
              {categories.length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Total Kategori Komoditas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
            <Layers className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 tracking-tight leading-none">
              {categories.filter((c) => c.isActive !== false).length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Kategori Aktif di Toko</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <Package className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 tracking-tight leading-none">
              {totalProducts}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Total Produk Terdaftar</div>
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar: Search, Refresh, Tambah Kategori */}
      <div className="p-3 sm:p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kategori komoditas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchCategories(true)}
            title="Segarkan Data Kategori"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori Baru</span>
        </button>
      </div>

      {/* 3. Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-bold text-emerald-900">
              {selectedIds.length} kategori dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="py-1 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer transition text-xs"
            >
              Batal Pilih
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="py-1 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Data Table Kategori Komoditas (Clean Slate Table) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="w-12 text-center text-slate-700 font-bold text-xs py-3">No</TableHead>
                <TableHead className="w-16 text-center text-slate-700 font-bold text-xs py-3">Gambar</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3">Nama Kategori</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3">Deskripsi</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3 text-center">Status Toko</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3 text-center">Produk Terkait</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3 text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-emerald-700 animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">Memuat kategori komoditas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Tag className="w-10 h-10 text-slate-300" />
                      <h4 className="text-sm font-bold text-slate-700">Tidak ada kategori ditemukan</h4>
                      <p className="text-xs text-slate-400">
                        {searchQuery
                           ? 'Coba gunakan kata kunci pencarian yang lain.'
                           : 'Klik tombol "Tambah Kategori Baru" di atas untuk menambahkan kategori.'}
                      </p>
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
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <TableCell className="pl-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-slate-500 py-3">
                        {rowNumber}
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden mx-auto flex items-center justify-center shrink-0">
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
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-slate-900">{item.name}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs text-slate-500 line-clamp-1">
                          {item.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title={`Klik untuk ${item.isActive !== false ? 'menonaktifkan' : 'mengaktifkan'} kategori ini dari Toko`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer shadow-2xs ${
                            item.isActive !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.isActive !== false ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span>{item.isActive !== false ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {item.productCount || 0} Produk
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Kategori"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetCategory(item)}
                            title="Hapus Kategori"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
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

        {/* Table Footer with Info & Pagination Persis Gambar 3 & Gambar 4 */}
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
              total kategori komoditas
            </div>

            {/* Limit Dropdown Persis Gambar 4 */}
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

      {/* 5. Modal Tambah / Edit Kategori (Murni Teks Tanpa Emoji/Ikon) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-700" />
              <span>{formMode === 'CREATE' ? 'Tambah Kategori Komoditas' : 'Edit Kategori Komoditas'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kategori <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Kelapa, Jagung, Biji Kopi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* Foto / Gambar Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gambar / Ikon Kategori (Mode Mobile & Toko)
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
                    Disarankan rasio 1:1 persegi (PNG/JPG/WebP) untuk kartu mobile toko.
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
                placeholder="Penjelasan singkat komoditas apa saja yang termasuk dalam kategori ini..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition resize-none"
              />
            </div>

            {/* Toggle Status Aktif / Nonaktif */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Status Kategori di Toko</div>
                <div className="text-[11px] text-slate-500">
                  {formData.isActive
                    ? 'Kategori ini aktif & tampil di katalog pembeli.'
                    : 'Kategori ini disembunyikan dari etalase toko.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 ${
                  formData.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                    formData.isActive ? 'left-5.5' : 'left-0.5'
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
      <Dialog open={Boolean(targetCategory)} onOpenChange={(open) => !open && setTargetCategory(null)}>
        <DialogContent className="sm:max-w-sm p-6 bg-white rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Hapus Kategori Komoditas?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus kategori{' '}
            <strong className="text-slate-800 font-bold">"{targetCategory?.name}"</strong>? Komoditas dengan kategori ini tidak akan terhapus.
          </p>
          <DialogFooter className="gap-2 pt-3">
            <button
              type="button"
              onClick={() => setTargetCategory(null)}
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
            Tindakan ini akan menghapus {selectedIds.length} kategori komoditas sekaligus dari daftar.
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
