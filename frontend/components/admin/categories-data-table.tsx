'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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

  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Manajemen Toko Online</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Kategori Komoditas Hasil Panen
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola tombol kategori, ikon emoji, dan pengelompokan produk di Toko Online Koperasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-accent hover:bg-forest-800 text-white font-semibold text-xs shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori Baru</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Kategori Aktif
            </div>
            <div className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
              {categories.length} Kategori
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Komoditas Terdaftar
            </div>
            <div className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
              {totalProducts} Produk
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs flex items-center gap-3.5 sm:col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Toko Online Live
            </div>
            <div className="text-xs font-semibold text-emerald-900 mt-0.5">
              Perubahan langsung tampil di halaman Toko
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Bar (Sama seperti yang dilihat pembeli di Toko Online) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-bold text-slate-800">
              Pratinjau Tombol Kategori di Toko Online
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Gunakan tombol panah di bawah untuk mengatur urutan tombol
          </span>
        </div>

        {/* Desktop Pills Preview */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
          <div className="px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-emerald-700 text-white shadow-2xs flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
            <span>Kategori</span>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-white text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-2"
            >
              <span className="text-sm leading-none">{cat.emoji}</span>
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daftar Kategori (Tabel & Reorder) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800">
              Daftar Kategori ({categories.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Urutan menentukan posisi tombol di toko
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-emerald-700 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat data kategori...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 italic">
            Belum ada kategori yang dibuat. Klik tombol Tambah Kategori Baru di atas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                {/* Kolom Kiri: Emoji, Nama & Deskripsi */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="w-6 text-center text-xs font-bold text-slate-400 shrink-0">
                    {idx + 1}
                  </span>

                  {/* Icon Circle */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-2xs ${
                      cat.mobileBg || COLOR_PRESETS[0].class
                    }`}
                  >
                    <span>{cat.emoji}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900">
                        {cat.name}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {cat.productCount || 0} Produk Terkait
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {cat.description || 'Tidak ada deskripsi tambahan.'}
                    </p>
                  </div>
                </div>

                {/* Kolom Kanan: Actions Reorder & Edit / Hapus */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  {/* Reorder Buttons */}
                  <div className="flex items-center mr-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-30 cursor-pointer"
                      title="Geser ke kiri / urutan lebih awal"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-200" />
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-30 cursor-pointer"
                      title="Geser ke kanan / urutan selanjutnya"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer shadow-2xs border border-slate-200 bg-white"
                    title="Edit kategori"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(cat)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer shadow-2xs border border-rose-200 bg-white"
                    title="Hapus kategori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

            {/* Pilihan Emoji Ikon */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ikon Emoji Kategori
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  maxLength={4}
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-14 text-center text-lg py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <span className="text-[11px] text-slate-400">Pilih dari tombol di bawah atau ketik emoji bebas:</span>
              </div>

              {/* Emoji Quick Picker */}
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {COMMON_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setFormData({ ...formData, emoji: em })}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition cursor-pointer ${
                      formData.emoji === em
                        ? 'bg-emerald-600 text-white shadow-xs scale-105'
                        : 'bg-white hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Warna / Gradient Mobile */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tema Warna Tombol Mobile
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = formData.mobileBg === preset.class;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, mobileBg: preset.class })}
                      className={`p-2 rounded-xl text-left border text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full shrink-0 ${preset.class}`} />
                      <span className="truncate text-[11px] text-slate-700">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Singkat (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Penjelasan singkat komoditas apa saja yang termasuk dalam kategori ini..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
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
    </div>
  );
}
