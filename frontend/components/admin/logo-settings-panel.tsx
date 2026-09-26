'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Upload,
  Loader2,
  CheckCircle2,
  Eye,
  Pencil,
  Save,
  X,
  AlertTriangle,
  RotateCcw,
  ArrowLeftRight,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PartnerLogo {
  id: string;
  name: string;
  url: string;
  key?: string;
}

export function LogoSettingsPanel() {
  const { showToast } = useToast();
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Tambah Logo States
  const [newLogoName, setNewLogoName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Inline States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Delete Dialog States
  const [deleteLogoTarget, setDeleteLogoTarget] = useState<PartnerLogo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch daftar logo
  const fetchLogos = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/storage/logos');
      const data = await res.json();
      if (data.success && Array.isArray(data.logos)) {
        setLogos(data.logos);
      }
    } catch (err) {
      console.error('Error fetching partner logos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format Tidak Didukung',
        message: 'Mohon pilih file gambar (PNG, SVG, WEBP, JPG).',
        type: 'error',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewFileUrl(URL.createObjectURL(file));

    // Jika nama belum diisi, isi otomatis dari nama file
    if (!newLogoName.trim()) {
      const baseName = file.name.split('.')[0].replace(/[-_]/g, ' ').toUpperCase();
      setNewLogoName(baseName);
    }
  };

  const handleAddLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast({
        title: 'Pilih File Logo',
        message: 'Silakan pilih gambar logo mitra terlebih dahulu.',
        type: 'error',
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', newLogoName.trim() || 'MITRA');

      const res = await fetch('/api/storage/logos', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah logo');

      showToast({
        title: 'Logo Ditambahkan',
        message: `Logo ${data.logo?.name || 'mitra'} berhasil ditambahkan.`,
        type: 'success',
      });

      setLogos(data.logos);
      setSelectedFile(null);
      setPreviewFileUrl(null);
      setNewLogoName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showToast({
        title: 'Gagal Tambah Logo',
        message: err.message || 'Terjadi kesalahan sistem.',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMove = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= logos.length) return;

    const newLogos = [...logos];
    const temp = newLogos[index];
    newLogos[index] = newLogos[targetIndex];
    newLogos[targetIndex] = temp;

    setLogos(newLogos);

    // Simpan urutan baru ke backend
    try {
      await fetch('/api/storage/logos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logos: newLogos }),
      });
    } catch (err) {
      console.error('Error saving logo order:', err);
    }
  };

  const [isReordering, setIsReordering] = useState(false);

  const handleReverseOrder = async () => {
    if (logos.length < 2) return;
    const reversed = [...logos].reverse();
    setLogos(reversed);
    setIsReordering(true);

    try {
      const res = await fetch('/api/storage/logos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logos: reversed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan urutan');
      showToast({
        title: 'Urutan Diputar Balik',
        message: 'Urutan logo berhasil diputar balik secara otomatis.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error reversing logo order:', err);
      showToast({
        title: 'Gagal Membalik Urutan',
        message: err.message || 'Terjadi kesalahan sistem',
        type: 'error',
      });
      fetchLogos();
    } finally {
      setIsReordering(false);
    }
  };

  const handleStartEdit = (logo: PartnerLogo) => {
    setEditingId(logo.id);
    setEditingName(logo.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const res = await fetch('/api/storage/logos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah nama');

      setLogos(data.logos);
      setEditingId(null);
      showToast({
        title: 'Nama Diperbarui',
        message: 'Nama mitra berhasil diperbarui.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Edit',
        message: err.message,
        type: 'error',
      });
    }
  };

  const handleDeleteLogo = async () => {
    if (!deleteLogoTarget) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/storage/logos?id=${deleteLogoTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus logo');

      setLogos(data.logos);
      setDeleteLogoTarget(null);
      showToast({
        title: 'Logo Dihapus',
        message: `Logo ${deleteLogoTarget.name} telah dihapus.`,
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Hapus',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        <p className="text-xs text-slate-500 font-medium">Memuat data logo mitra...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-5 pb-12 min-w-0">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs w-full min-w-0">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pengaturan Konten Tampilan Web</span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Logo Mitra & Dukungan (Didukung Oleh)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Kelola logo lembaga, kemitraan instansi, dan universitas yang ditampilkan secara statis di bagian tengah halaman landing page.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogos}
          className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Live Preview Box (Tampilan Statis di Tengah Persis Seperti Landing Page) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold text-slate-800 truncate">
              Pratinjau Statis di Landing Page ({logos.length} Logo)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium shrink-0">
            Tampilan tetap statis & tidak bergerak
          </span>
        </div>

        {/* The Exact Row Displayed on Landing Page */}
        <div className="py-8 px-4 rounded-2xl bg-[#fafbf9] border border-slate-200/80 text-center">
          <p className="font-[family-name:var(--font-inter),sans-serif] text-base sm:text-lg text-slate-500 font-normal tracking-[-0.03em] mb-6 sm:mb-8">
            Didukung Oleh
          </p>

          {logos.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-16">
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  className="flex items-center justify-center shrink-0 grayscale opacity-60 pointer-events-none select-none transition-none"
                  title={logo.name}
                >
                  <img
                    src={logo.url}
                    alt={logo.name}
                    className="h-10 sm:h-12 max-w-[150px] w-auto object-contain filter grayscale"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-xs text-slate-400 italic">
              Belum ada logo yang ditambahkan. Gunakan formulir di bawah untuk menambahkan logo mitra.
            </div>
          )}
        </div>
      </div>

      {/* Grid: Form Tambah Logo Baru & Daftar Logo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full min-w-0">
        {/* Kolom 1: Form Tambah Logo Baru */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 w-full min-w-0 lg:col-span-1">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Plus className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800">Tambah Logo Baru</h2>
          </div>

          <form onSubmit={handleAddLogo} className="space-y-3.5">
            {/* Upload Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                File Gambar Logo *
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/60 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-2"
              >
                {previewFileUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewFileUrl}
                      alt="Preview"
                      className="h-16 max-w-[180px] object-contain mx-auto"
                    />
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Klik untuk mengganti gambar
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Pilih berkas logo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PNG, SVG, WEBP, atau JPG (Transparan disarankan)</p>
                    </div>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Nama Mitra / Instansi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Mitra / Instansi *
              </label>
              <input
                type="text"
                value={newLogoName}
                onChange={(e) => setNewLogoName(e.target.value)}
                placeholder="Contoh: ICARE, POLIMDO, KEMENTERIAN..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-semibold uppercase"
                required
              />
            </div>

            {/* Tombol Simpan */}
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunggah Logo...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan ke Daftar</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Kolom 2: Daftar Logo Aktif */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 w-full min-w-0 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-800">
                Daftar Logo Terpasang ({logos.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleReverseOrder}
                disabled={logos.length < 2 || isReordering}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-2xs transition disabled:opacity-40 cursor-pointer active:scale-95"
                title="Putar balik urutan logo (kiri jadi kanan, kanan jadi kiri)"
              >
                {isReordering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                ) : (
                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>Putar Balik Urutan</span>
              </button>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                (atau gunakan panah ← →)
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {logos.map((logo, idx) => {
              const isEditing = editingId === logo.id;

              return (
                <div
                  key={logo.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-bold text-slate-400 shrink-0">
                      {idx + 1}
                    </span>

                    {/* Thumbnail Logo */}
                    <div className="w-16 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <img
                        src={logo.url}
                        alt={logo.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    {/* Nama Logo (Bisa diedit) */}
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value.toUpperCase())}
                            className="px-2.5 py-1 text-xs font-bold bg-white border border-emerald-500 rounded-lg focus:outline-none w-full max-w-xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(logo.id)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                            title="Simpan nama"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {logo.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(logo)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Ubah nama"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        {logo.url}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Urutan Panah & Hapus */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'left')}
                      disabled={idx === 0}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition disabled:opacity-30 cursor-pointer"
                      title="Geser ke kiri / urutan lebih awal"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'right')}
                      disabled={idx === logos.length - 1}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition disabled:opacity-30 cursor-pointer"
                      title="Geser ke kanan / urutan lebih belakang"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteLogoTarget(logo)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer ml-1"
                      title="Hapus logo ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteLogoTarget)}
        onOpenChange={(open) => !open && setDeleteLogoTarget(null)}
      >
        <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-3xl shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>

            <div className="space-y-1 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">
                Hapus Logo Mitra?
              </DialogTitle>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus logo{' '}
                <strong className="text-slate-800 font-semibold">{deleteLogoTarget?.name}</strong>? Logo ini tidak akan lagi ditampilkan pada bagian &quot;Didukung oleh&quot; di landing page.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteLogoTarget(null)}
              disabled={isDeleting}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteLogo}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Logo</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
