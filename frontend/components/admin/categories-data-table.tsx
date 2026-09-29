'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
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
  description?: string;
  mobileBg?: string;
  productCount?: number;
}

const PAGE_SIZE = 10;

export function CategoriesDataTable() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Selected for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Single Delete Target
  const [targetCategory, setTargetCategory] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State (Tambah / Edit Kategori Tanpa Ikon/Emoji)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const totalPages = Math.ceil(filteredCategories.length / PAGE_SIZE) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCategories.slice(start, start + PAGE_SIZE);
  }, [filteredCategories, currentPage]);

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

  // 4. Open Form Handlers (Tanpa Icon/Emoji)
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setFormMode('EDIT');
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      description: cat.description || '',
    });
    setIsFormOpen(true);
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
      const url = isEdit ? `/api/categories/${editingId}` : '/api/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name: cleanName,
        description: formData.description.trim(),
        emoji: '🌾',
      };

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
      const res = await fetch(`/api/categories/${targetCategory.id}`, {
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
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/categories/${id}`, { method: 'DELETE' })
        )
      );

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
              {categories.filter((c) => (c.productCount || 0) > 0).length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Kategori Aktif Terpakai</div>
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
                <TableHead className="w-14 text-center text-slate-700 font-bold text-xs py-3">No</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3">Nama Kategori</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3">Deskripsi</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3 text-center">Produk Terkait</TableHead>
                <TableHead className="text-slate-700 font-bold text-xs py-3 text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-emerald-700 animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">Memuat kategori komoditas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
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
                  const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;

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
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-slate-900">{item.name}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs text-slate-500 line-clamp-1">
                          {item.description || '-'}
                        </span>
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

        {/* Table Footer with Pagination */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Menampilkan{' '}
            <strong className="text-slate-800">
              {filteredCategories.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
            </strong>{' '}
            -{' '}
            <strong className="text-slate-800">
              {Math.min(currentPage * PAGE_SIZE, filteredCategories.length)}
            </strong>{' '}
            dari <strong className="text-slate-800">{filteredCategories.length}</strong> kategori
          </div>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === currentPage}
                      onClick={() => setCurrentPage(p)}
                      disabled={isLoading}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isLoading}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
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
