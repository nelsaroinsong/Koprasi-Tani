'use client';

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  Upload,
  Trash2,
  Loader2,
  ShoppingBag,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/context/toast-context';
import { validateIndonesianPhone } from '@/lib/phone-validation';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

export interface PembeliFormData {
  id?: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

interface PembeliFormPageProps {
  initialData?: PembeliFormData | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PembeliFormPage({
  initialData,
  onCancel,
  onSuccess,
}: PembeliFormPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(initialData && initialData.id);

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Photo Upload via /api/upload/profile
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format berkas tidak didukung. Harap pilih gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran gambar maksimal 5 MB.');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', file);
      if (email.trim()) {
        formData.append('email', email.trim());
      }

      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto profil.');
      }

      setAvatarUrl(data.url);
      showToast({
        title: 'Foto Terunggah',
        message: 'Foto profil pembeli berhasil diperbarui.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error saat upload foto:', err);
      setErrorMessage(err.message || 'Gagal mengunggah foto profil.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
  };

  // Validasi Input Form
  const validateForm = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMessage('Nama lengkap pembeli wajib diisi.');
      return false;
    }
    if (cleanName.length < 3) {
      setErrorMessage('Nama pembeli minimal 3 karakter.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Format alamat email tidak valid.');
      return false;
    }

    if (cleanPhone) {
      const phoneValidation = validateIndonesianPhone(cleanPhone, false);
      if (!phoneValidation.isValid) {
        setErrorMessage(phoneValidation.error || 'Nomor WhatsApp tidak valid.');
        return false;
      }
    }

    return true;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const endpoint = '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';
      const phoneVal = phone.trim() ? validateIndonesianPhone(phone.trim(), false).cleanPhone : null;
      const payload = {
        ...(isEdit && { id: initialData?.id }),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneVal,
        address: address.trim() || null,
        avatarUrl: avatarUrl || null,
        role: 'PEMBELI',
        isVerified: true,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan data pembeli.');
      }

      showToast({
        title: isEdit ? 'Data Diperbarui' : 'Pembeli Ditambahkan',
        message: isEdit
          ? `Data pembeli "${name.trim()}" berhasil disimpan.`
          : `Pembeli baru "${name.trim()}" berhasil ditambahkan ke sistem.`,
        type: 'success',
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error submit pembeli:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialLetter = name ? name.charAt(0).toUpperCase() : 'P';

  return (
    <div className="space-y-4">
      {/* Top Bar Navigasi & Judul Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition cursor-pointer shrink-0 shadow-2xs"
            title="Kembali ke Daftar Pembeli"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Pembeli & Pelanggan /</span>
              <span className="text-xs font-semibold text-emerald-800">
                {isEdit ? 'Edit Data Pembeli' : 'Tambah Pembeli Baru'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {isEdit ? `Edit Data: ${initialData?.name}` : 'Tambah Pembeli & Pelanggan Baru'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Pembeli'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-200">
          <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form Content: 2-Kolom Layout (Kravio Outer Shell) */}
      <div
        className="rounded-2xl border border-[#E5E7EB] p-2 sm:p-2.5"
        style={HATCHED_BG_STYLE}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* Kolom Kiri: Foto Profil & Info Status (4 Kolom) */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">
            {/* Box Foto Profil */}
            <div className="bg-white rounded-xl border border-[#ECEEF2] p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Camera className="w-4 h-4 text-emerald-700" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Foto Profil Pembeli
                </h2>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-slate-200 shadow-xs">
                  <AvatarImage src={avatarUrl || ''} alt={name || 'Avatar'} className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-blue-100 text-blue-800 text-2xl font-black">
                    {initialLetter}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {name.trim() || 'Nama Pelanggan'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Konsumen Komoditas Agribisnis
                  </p>
                </div>

                {/* Upload Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Foto</span>
                      </>
                    )}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Hapus foto profil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 max-w-[220px] leading-relaxed">
                  Format gambar JPG, PNG, atau WebP. Maksimal ukuran 5 MB.
                </p>
              </div>
            </div>

            {/* Box Status Akun Pelanggan */}
            <div className="bg-white rounded-xl border border-[#ECEEF2] p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Status Akun Pelanggan
                </h2>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <span className="font-bold block">Akun Konsumen Aktif</span>
                  Akun pembeli secara otomatis memiliki hak untuk melakukan pemesanan komoditas panen di katalog toko koperasi.
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Rincian Data Pribadi & Kontak (8 Kolom) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl border border-[#ECEEF2] p-4 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-emerald-700" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Informasi Pribadi & Kontak Pelanggan
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span>Nama Lengkap Pembeli / Usaha</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso atau Rumah Makan Sejahtera"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span>Alamat Email</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Contoh: pembeli@gmail.com"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Digunakan untuk login dan pengiriman nota pesanan digital.
                  </p>
                </div>

                {/* Nomor Telepon / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span>Nomor WhatsApp / HP</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Wajib diawali 08 dan minimal 10 digit angka (contoh: 08123456789).
                  </p>
                </div>

                {/* Alamat Pengiriman / Domisili */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Alamat Lengkap Pengiriman / Domisili
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Jl. Trans Sulawesi No. 45, Kec. Kalawat, Minahasa Utara"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition resize-none leading-relaxed"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Alamat tujuan pengantaran saat pembeli memilih opsi pesanan komoditas diantar.
                  </p>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Pembeli'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
