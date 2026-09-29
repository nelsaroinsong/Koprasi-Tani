'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  LayoutGrid,
  Eye,
  Info,
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
  emoji: string;
  description?: string;
  mobileBg?: string;
  productCount?: number;
}

const PAGE_SIZE = 10;

const COMMON_EMOJIS = ['🥥', '🌽', '📦', '🥫', '🌾', '☕', '🥔', '🌶️', '🍌', '🍍', '🥜', '🥬', '🍯', '🌿'];

const COLOR_PRESETS = [
  {
    id: 'amber',
    label: 'Coklat Kelapa',
    class: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border border-amber-300/60',
  },
  {
    id: 'yellow',
    label: 'Kuning Jagung',
    class: 'bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-900 border border-yellow-300/60',
  },
  {
    id: 'sky',
    label: 'Biru Turunan',
    class: 'bg-gradient-to-br from-sky-100 to-blue-200 text-blue-900 border border-sky-300/60',
  },
  {
    id: 'purple',
    label: 'Ungu Olahan',
    class: 'bg-gradient-to-br from-purple-100 to-fuchsia-200 text-purple-900 border border-purple-300/60',
  },
  {
    id: 'emerald',
    label: 'Hijau Daun',
    class: 'bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-900 border border-emerald-300/60',
  },
  {
    id: 'rose',
    label: 'Merah Buah',
    class: 'bg-gradient-to-br from-rose-100 to-pink-200 text-rose-900 border border-rose-300/60',
  },
];

export function CategoriesDataTable() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Checkbox Select & Bulk Delete States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    emoji: '🌾',
    description: '',
    mobileBg: COLOR_PRESETS[0].class,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch daftar kategori dari backend
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/categories', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
        try {
          localStorage.setItem('koperasi_categories_cache', JSON.stringify(data.categories));
          window.dispatchEvent(new Event('categories_updated'));
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setEditingId(null);
    setFormData({
      name: '',
      emoji: '🌾',
      description: '',
      mobileBg: COLOR_PRESETS[4].class,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setFormMode('EDIT');
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      emoji: cat.emoji || '🌾',
      description: cat.description || '',
      mobileBg: cat.mobileBg || COLOR_PRESETS[0].class,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (cat: CategoryItem) => {
    setTargetCategory(cat);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast({
        title: 'Nama Wajib Diisi',
        message: 'Mohon masukkan nama kategori.',
        type: 'error',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (formMode === 'CREATE') {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menambah kategori');

        setCategories(data.categories);
        showToast({
          title: 'Kategori Ditambahkan',
          message: `Kategori "${formData.name}" berhasil dibuat.`,
          type: 'success',
        });
      } else {
        const res = await fetch('/api/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            ...formData,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui kategori');

        setCategories(data.categories);
        showToast({
          title: 'Kategori Diperbarui',
          message: `Perubahan kategori "${formData.name}" berhasil disimpan.`,
          type: 'success',
        });
      }

      setIsFormOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (force: boolean = false) => {
    if (!targetCategory) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/categories?id=${targetCategory.id}${force ? '&force=true' : ''}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.hasProducts && !force) {
          const confirmForce = window.confirm(
            `${data.error}\n\nApakah Anda tetap ingin menghapus kategori ini secara paksa?`
          );
          if (confirmForce) {
            handleDelete(true);
            return;
          }
        }
        throw new Error(data.error || 'Gagal menghapus kategori');
      }

      setCategories(data.categories);
      setIsDeleteDialogOpen(false);
      setTargetCategory(null);
      showToast({
        title: 'Kategori Dihapus',
        message: `Kategori "${targetCategory.name}" telah dihapus.`,
        type: 'info',
      });
      fetchCategories();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus',
        message: err.message || 'Terjadi kesalahan.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    setCategories(newCategories);

    try {
      localStorage.setItem('koperasi_categories_cache', JSON.stringify(newCategories));
      window.dispatchEvent(new Event('categories_updated'));

      await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: newCategories }),
      });
    } catch (err) {
      console.error('Error saving category reorder:', err);
    }
  };

  // Filter & Pagination Logic
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCategories.slice(start, start + PAGE_SIZE);
  }, [filteredCategories, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Bulk Selection Helpers
  const isAllCurrentPageSelected =
    paginatedCategories.length > 0 &&
    paginatedCategories.every((c) => selectedIds.includes(c.id));

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedCategories.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newSet = new Set(selectedIds);
      paginatedCategories.forEach((c) => newSet.add(c.id));
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Konfirmasi Hapus Massal Kategori
  const handleBulkDeleteConfirm = async (force: boolean = false) => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const res = await fetch(
        `/api/categories?ids=${selectedIds.join(',')}${force ? '&force=true' : ''}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.hasProducts && !force) {
          const proceed = window.confirm(
            `${data.error}\n\nApakah Anda tetap ingin menghapus kategori terpilih ini secara paksa?`
          );
          if (proceed) {
            handleBulkDeleteConfirm(true);
            return;
          }
        }
        throw new Error(data.error || 'Gagal menghapus kategori terpilih');
      }

      showToast({
        title: 'Penghapusan Massal Berhasil',
        message: `${selectedIds.length} kategori berhasil dihapus.`,
        type: 'success',
      });

      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menghapus Banyak',
        message: err.message || 'Terjadi gangguan saat menghapus kategori.',
        type: 'error',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <div className="w-full space-y-4 pb-12">
      {/* 1. Stat Cards: Sesuai Desain Halaman Sewa Alat & Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {categories.length}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Total Kategori Aktif
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalProducts}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Komoditas Terdaftar
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {categories.length > 0 ? 'Sinkron' : 'Kosong'}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Live di Toko Online
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-800 text-white rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] text-emerald-200 font-medium">Layanan Toko Koperasi</div>
          <div className="text-sm font-bold flex items-center justify-between mt-1">
            <span>Kategori Komoditas</span>
            <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar: Search, Refresh, Tambah Kategori */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kategori komoditas..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={fetchCategories}
            disabled={isLoading}
            title="Segarkan Data Kategori"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        </div>

        {/* Action Button: Tambah Kategori */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none py-2 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
      </div>

      {/* 3. Floating Bulk Action Bar (Saat Ada Kategori Dipilih) */}
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

      {/* 4. Live Preview Bar di Toko Online */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-800">
              Pratinjau Tombol Kategori di Toko Online
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Gunakan tombol panah di tabel untuk mengatur urutan
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
            <span>Kategori</span>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-white text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1.5"
            >
              <span className="text-sm leading-none">{cat.emoji}</span>
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Main Data Table dengan Checkbox & Pagination Max 10 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-emerald-50/70 border-b border-emerald-100">
            <TableRow className="hover:bg-transparent border-emerald-100">
              <TableHead className="w-10 text-center py-3.5">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  onChange={toggleSelectAllCurrentPage}
                  aria-label="Pilih semua di halaman ini"
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
              </TableHead>
              <TableHead className="w-12 text-center text-emerald-950 font-bold text-xs py-3.5">
                No
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs min-w-[200px]">
                Kategori
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs">
                Deskripsi
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs text-center">
                Produk Terkait
              </TableHead>
              <TableHead className="text-emerald-950 font-bold text-xs text-center">
                Urutan Posisi
              </TableHead>
              <TableHead className="text-right text-emerald-950 font-bold text-xs pr-4">
                Aksi & Pengelolaan
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat daftar kategori komoditas...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Tag className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800">
                      {searchQuery ? 'Tidak ada kategori yang cocok dengan pencarian' : 'Belum ada kategori yang dibuat'}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {searchQuery
                        ? 'Coba ganti kata kunci pencarian kategori.'
                        : 'Klik tombol Tambah Kategori Baru di atas untuk mulai membuat.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCategories.map((cat, idx) => {
                const globalIndex = categories.findIndex((c) => c.id === cat.id);
                const rowNumber = (currentPage - 1) * PAGE_SIZE + (idx + 1);

                return (
                  <TableRow
                    key={cat.id}
                    className="hover:bg-emerald-50/30 transition-colors border-slate-100"
                  >
                    {/* Checkbox Select Row */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cat.id)}
                        onChange={() => toggleSelectRow(cat.id)}
                        aria-label={`Pilih ${cat.name}`}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                    </TableCell>

                    {/* No */}
                    <TableCell className="text-center font-medium text-xs text-slate-400">
                      {rowNumber}
                    </TableCell>

                    {/* Kategori: Name */}
                    <TableCell>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {cat.name}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          slug: {cat.slug}
                        </span>
                      </div>
                    </TableCell>

                    {/* Deskripsi */}
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {cat.description || <span className="text-slate-400 italic">Tidak ada deskripsi</span>}
                    </TableCell>

                    {/* Jumlah Komoditas */}
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {cat.productCount || 0} Produk
                      </span>
                    </TableCell>

                    {/* Urutan Posisi Up / Down */}
                    <TableCell className="text-center">
                      <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <button
                          type="button"
                          disabled={globalIndex <= 0}
                          onClick={() => handleMove(globalIndex, 'up')}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-30 cursor-pointer"
                          title="Geser urutan lebih awal"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200" />
                        <button
                          type="button"
                          disabled={globalIndex >= categories.length - 1}
                          onClick={() => handleMove(globalIndex, 'down')}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-30 cursor-pointer"
                          title="Geser urutan selanjutnya"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>

                    {/* Aksi: Edit & Hapus */}
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 transition cursor-pointer"
                          title="Edit kategori"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDelete(cat)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Hapus kategori"
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

        {/* Table Footer with Info & Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Menampilkan{' '}
            <strong className="text-slate-800">
              {filteredCategories.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
            </strong>
            -
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

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === currentPage}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                    >
                      {pageNum}
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


      {/* Modal Form Tambah / Edit Kategori */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-700" />
              <span>{formMode === 'CREATE' ? 'Tambah Kategori Komoditas' : 'Edit Kategori Komoditas'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Nama Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kategori <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Biji Kopi, Rempah-rempah"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Singkat (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Penjelasan singkat komoditas apa saja yang termasuk dalam kategori ini..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-forest-accent hover:bg-forest-800 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
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

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm p-6 bg-white rounded-3xl">
          <DialogHeader>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Hapus Kategori &ldquo;{targetCategory?.name}&rdquo;?
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-500 leading-relaxed">
            Kategori ini akan dihapus dari daftar tombol Toko Online.
            {targetCategory?.productCount && targetCategory.productCount > 0 ? (
              <span className="block mt-1.5 font-bold text-rose-600">
                Peringatan: Terdapat {targetCategory.productCount} komoditas yang saat ini terhubung dengan kategori ini.
              </span>
            ) : null}
          </p>

          <DialogFooter className="pt-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDelete(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <span>Ya, Hapus</span>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Massal */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <span>Konfirmasi Hapus Massal Kategori</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 leading-relaxed">
            Anda akan menghapus <strong className="text-red-600 font-bold">{selectedIds.length} kategori</strong> yang dipilih dari Toko Online Koperasi.
            <p className="mt-2 text-slate-500">
              Pastikan tidak ada komoditas aktif yang masih membutuhkan kategori ini, atau sistem akan meminta konfirmasi penghapusan paksa.
            </p>
          </div>

          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={() => handleBulkDeleteConfirm(false)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isBulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Hapus {selectedIds.length} Kategori</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

