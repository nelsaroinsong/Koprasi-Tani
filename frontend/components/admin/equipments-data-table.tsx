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
  ShieldCheck,
  Phone,
  Tag,
  Wrench,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Upload,
  ImageIcon,
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

const KATEGORI_PRESETS = [
  'Traktor & Pengolah Lahan',
  'Mesin Panen & Perontok',
  'Penyemprot & Pemupukan',
  'Pascapanen & Pengolahan',
];

const KONDISI_PRESETS = ['Sangat Baik', 'Siap Pakai', 'Dalam Perawatan'];

const IMAGE_PRESETS = [
  { label: 'Traktor Roda 4', url: 'https://picsum.photos/seed/kubota-traktor/800/600' },
  { label: 'Kultivator Tangan', url: 'https://picsum.photos/seed/quick-cakar/800/600' },
  { label: 'Mesin Perontok Jagung', url: 'https://picsum.photos/seed/corn-sheller/800/600' },
  { label: 'Drone Pertanian', url: 'https://picsum.photos/seed/agras-drone/800/600' },
  { label: 'Pencacah Kompos/Pelepah', url: 'https://picsum.photos/seed/coconut-shredder/800/600' },
  { label: 'Sprayer Tekanan Tinggi', url: 'https://picsum.photos/seed/power-sprayer/800/600' },
];

export default function EquipmentsDataTable() {
  const { showToast } = useToast();
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('SEMUA');

  // Modal Form State (Tambah / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState(KATEGORI_PRESETS[0]);
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

  // R2 Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Handle Upload Foto ke R2 (Folder sewa-alat/)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format Tidak Sesuai',
        message: 'Pilih file gambar yang valid (JPG, PNG, atau WebP).',
        type: 'warning',
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/equipment', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah foto alat ke R2.');
      }

      setFormImageUrl(data.url);
      showToast({
        title: 'Foto Berhasil Diunggah',
        message: 'Foto tersimpan di Cloudflare R2 dalam folder sewa-alat/.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Upload foto error:', err);
      showToast({
        title: 'Gagal Upload Foto',
        message: err.message || 'Terjadi kesalahan saat mengunggah foto ke R2.',
        type: 'error',
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Data
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

  // Statistik Ringkas
  const stats = useMemo(() => {
    const totalUnit = equipments.reduce((sum, item) => sum + (item.stokUnit || 1), 0);
    const unitTersedia = equipments
      .filter((i) => i.isTersedia)
      .reduce((sum, item) => sum + (item.stokUnit || 1), 0);
    const unitPerawatan = totalUnit - unitTersedia;
    return { totalUnit, unitTersedia, unitPerawatan, totalJenis: equipments.length };
  }, [equipments]);

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormNama('');
    setFormKategori(KATEGORI_PRESETS[0]);
    setFormDeskripsi('');
    setFormSpesifikasi('');
    setFormHargaSewa('');
    setFormSatuanSewa('hari');
    setFormBiayaOperator('');
    setFormStokUnit('1');
    setFormKondisi('Sangat Baik');
    setFormImageUrl(IMAGE_PRESETS[0].url);
    setFormIsTersedia(true);
    setFormKontakPj('081944078924');
    setIsFormOpen(true);
  };

  // Buka Modal Edit
  const handleOpenEdit = (item: EquipmentItem) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormKategori(item.kategori);
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

  // Submit Simpan (Tambah / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formKategori.trim() || !formHargaSewa) {
      showToast({
        title: 'Form Belum Lengkap',
        message: 'Nama alat, kategori, dan tarif sewa wajib diisi.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: editingItem?.id,
        nama: formNama.trim(),
        kategori: formKategori.trim(),
        deskripsi: formDeskripsi.trim() || null,
        spesifikasi: formSpesifikasi.trim() || null,
        hargaSewa: Number(formHargaSewa),
        satuanSewa: formSatuanSewa.trim(),
        biayaOperator: formBiayaOperator ? Number(formBiayaOperator) : null,
        stokUnit: Number(formStokUnit) || 1,
        kondisi: formKondisi,
        imageUrl: formImageUrl.trim() || null,
        isTersedia: formIsTersedia,
        kontakPj: formKontakPj.trim() || '081944078924',
      };

      const res = await fetch('/api/admin/equipments', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: editingItem ? 'Alat Diperbarui' : 'Alat Ditambahkan',
          message: data.message || 'Perubahan berhasil disimpan.',
          type: 'success',
        });
        setIsFormOpen(false);
        fetchEquipments(true);
      } else {
        showToast({
          title: 'Gagal Menyimpan',
          message: data.error || 'Terjadi kesalahan pada server.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Kesalahan Sistem',
        message: 'Gagal menyimpan data alat pertanian.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Cepat Status Ketersediaan
  const handleToggleStatus = async (item: EquipmentItem) => {
    const nextStatus = !item.isTersedia;
    // Optimistic UI update
    setEquipments((prev) =>
      prev.map((eq) => (eq.id === item.id ? { ...eq, isTersedia: nextStatus } : eq))
    );

    try {
      const res = await fetch('/api/admin/equipments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isTersedia: nextStatus }),
      });
      if (!res.ok) {
        // Rollback jika gagal
        fetchEquipments(true);
      } else {
        showToast({
          title: nextStatus ? 'Status Tersedia' : 'Status Dinonaktifkan',
          message: `Alat "${item.nama}" ${nextStatus ? 'kini dapat disewa petani.' : 'ditandai sedang tidak tersedia.'}`,
          type: 'info',
        });
      }
    } catch {
      fetchEquipments(true);
    }
  };

  // Hapus Unit Alat
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/equipments?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: 'Alat Dihapus',
          message: data.message || 'Unit alat berhasil dikeluarkan dari inventaris.',
          type: 'success',
        });
        setDeleteTarget(null);
        fetchEquipments(true);
      } else {
        showToast({
          title: 'Gagal Menghapus',
          message: data.error || 'Terjadi kesalahan sistem.',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast({
        title: 'Kesalahan Sistem',
        message: 'Gagal menghapus alat.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {stats.totalUnit}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                Total Unit ({stats.totalJenis} Model)
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 leading-none">
                {stats.unitTersedia}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                Unit Siap Dipinjam / Sewa
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 leading-none">
                {stats.unitPerawatan}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                Perawatan / Disewa
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-800 text-white rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-emerald-200 font-medium">Layanan Sewa Koperasi</div>
          <div className="text-sm font-bold flex items-center justify-between mt-1">
            <span>Subsidi Anggota</span>
            <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar (Search, Category Filter, and Add Button) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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

          {/* Category Dropdown */}
          <select
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white cursor-pointer"
          >
            <option value="SEMUA">Semua Kategori ({equipments.length})</option>
            {KATEGORI_PRESETS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchEquipments()}
            title="Muat Ulang"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer shrink-0 self-center sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add Equipment Button */}
        <button
          onClick={handleOpenAdd}
          className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Alat Pertanian</span>
        </button>
      </div>

      {/* Main Table / Grid View */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs text-slate-500 font-medium">Memuat data alsintan...</span>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama Alat & Spesifikasi</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Tarif Sewa Koperasi</th>
                  <th className="py-3 px-4">Stok & Kondisi</th>
                  <th className="py-3 px-4 text-center">Ketersediaan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
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
                            <div className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                              ⚙️ {item.spesifikasi}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.deskripsi || '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kategori */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        <span>{item.kategori}</span>
                      </span>
                    </td>

                    {/* Tarif Sewa */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-emerald-800 text-xs">
                        Rp {item.hargaSewa.toLocaleString('id-ID')}
                        <span className="text-[10px] font-normal text-slate-500">
                          {' '}/ {item.satuanSewa}
                        </span>
                      </div>
                      {item.biayaOperator ? (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          + Operator: Rp {item.biayaOperator.toLocaleString('id-ID')}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                          ✓ Mandiri / Termasuk
                        </div>
                      )}
                    </td>

                    {/* Stok & Kondisi */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {item.stokUnit} Unit Tersedia
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold mt-1 ${
                          item.kondisi === 'Sangat Baik'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : item.kondisi === 'Siap Pakai'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}
                      >
                        {item.kondisi}
                      </span>
                    </td>

                    {/* Status Toggle Switch */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border ${
                          item.isTersedia
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isTersedia ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        />
                        <span>{item.isTersedia ? 'Tersedia' : 'Nonaktif'}</span>
                      </button>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition cursor-pointer"
                          title="Edit Rincian Alat"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                          title="Hapus Alat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit Alat */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-emerald-600" />
              <span>{editingItem ? 'Edit Alat Pertanian' : 'Tambah Alat Pertanian Baru'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs mt-3">
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                >
                  {KATEGORI_PRESETS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kondisi Unit Fisik
                </label>
                <select
                  value={formKondisi}
                  onChange={(e) => setFormKondisi(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
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
                    placeholder="Kosongkan jika gratis/mandiri"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jumlah Stok Unit Siap Pakai
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

            {/* Spesifikasi Teknis */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Spesifikasi Teknis (Kapasitas, Daya, Mesin)
              </label>
              <input
                type="text"
                value={formSpesifikasi}
                onChange={(e) => setFormSpesifikasi(e.target.value)}
                placeholder="Contoh: Mesin Diesel 4 Silinder 40 HP, Penggerak 4WD, Rotary Tiller"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Deskripsi Lengkap & Peruntukan Lahan
              </label>
              <textarea
                rows={2}
                value={formDeskripsi}
                onChange={(e) => setFormDeskripsi(e.target.value)}
                placeholder="Jelaskan jenis lahan yang cocok, keunggulan alat, dan petunjuk operasional..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Foto Alat & Upload R2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700">Foto Unit Alat</label>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  📁 Cloudflare R2: sewa-alat/
                </span>
              </div>

              {/* Upload Box & Preview */}
              <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {/* Preview Thumbnail */}
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 flex items-center justify-center group shadow-inner">
                  {formImageUrl ? (
                    <Image
                      src={formImageUrl}
                      alt="Preview Alat"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                      <span className="text-[10px] leading-tight">Belum ada foto</span>
                    </div>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-1 z-10">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="text-[9px] font-bold">Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Upload Action & URL Input */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengunggah ke R2...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Pilih Foto dari Perangkat</span>
                        </>
                      )}
                    </button>
                    {formImageUrl && (
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        title="Hapus tautan foto"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition border border-slate-200 bg-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Atau tempel URL gambar (https://... / /api/images/...)"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Pilihan Cepat Preset */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Contoh Cepat:</span>
                {IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFormImageUrl(preset.url)}
                    className="px-2 py-0.5 text-[10px] rounded bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 border border-slate-200 transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kontak PJ WhatsApp & Status Ketersediaan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kontak WhatsApp PJ Alsintan
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
                <label htmlFor="formIsTersedia" className="font-bold text-slate-700 cursor-pointer select-none">
                  Langsung Aktifkan untuk Disewa
                </label>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-2 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Katalog'}</span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm p-5 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-sm font-bold text-slate-900">
            Hapus Alat dari Inventaris?
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            Apakah Anda yakin ingin menghapus alat{' '}
            <strong className="text-slate-800 font-bold">{deleteTarget?.nama}</strong>? Alat ini tidak akan lagi tampil di halaman sewa alat anggota koperasi.
          </p>

          <DialogFooter className="flex items-center justify-center gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="w-1/2 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-1/2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
