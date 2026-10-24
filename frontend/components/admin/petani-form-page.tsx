'use client';

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  Upload,
  Trash2,
  Loader2,
  Sprout,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/context/toast-context';
import { validateIndonesianPhone } from '@/lib/phone-validation';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

export interface PetaniFormData {
  id?: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

interface PetaniFormPageProps {
  initialData?: PetaniFormData | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PetaniFormPage({
  initialData,
  onCancel,
  onSuccess,
}: PetaniFormPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(initialData && initialData.id);

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [isVerified, setIsVerified] = useState(
    initialData?.isVerified !== undefined ? initialData.isVerified : true
  );

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
      showToast('Foto profil berhasil diunggah');
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
      setErrorMessage('Nama lengkap wajib diisi.');
      return false;
    }
    if (cleanName.length < 3) {
      setErrorMessage('Nama lengkap minimal terdiri dari 3 karakter.');
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
      const payload = {
        ...(isEdit && { id: initialData?.id }),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        avatarUrl: avatarUrl || null,
        role: 'PETANI',
        isVerified,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan data petani.');
      }

      showToast(
        isEdit
          ? `Data petani ${name.trim()} berhasil diperbarui`
          : `Petani ${name.trim()} berhasil ditambahkan`
      );
      onSuccess();
    } catch (err: any) {
      console.error('Error submit petani form:', err);
      setErrorMessage(err.message || 'Gagal menyimpan data petani.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialLetter = name.trim().charAt(0).toUpperCase() || 'P';

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Kembali ke Data Petani</span>
        </button>

        <span className="text-xs text-slate-400 hidden sm:inline-block">
          Overview / Petani / {isEdit ? 'Edit Data Petani' : 'Tambah Petani Baru'}
        </span>
      </div>

      {/* Kravio Outer Shell */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        <div className="bg-white rounded-xl border border-[#ECEEF2] p-5 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Header Section */}
          <div className="flex items-start gap-3.5 pb-6 border-b border-slate-100">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Sprout className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {isEdit ? 'Edit Data Petani Mitra' : 'Tambah Petani Mitra Baru'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? 'Perbarui profil kontak, alamat domisili, atau status verifikasi kemitraan petani.'
                  : 'Lengkapi formulir profil petani binaan baru untuk didaftarkan ke sistem Koperasi Sinar Pagi Sejahtera.'}
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* 1. Foto Profil Petani */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Avatar className="w-20 h-20 rounded-2xl border-2 border-white shadow-sm shrink-0">
                <AvatarImage src={avatarUrl} alt={name || 'Petani'} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-emerald-700 text-white font-bold text-2xl">
                  {initialLetter}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Foto Profil Petani
                </div>
                <p className="text-[11.5px] text-slate-400 max-w-md">
                  Gunakan foto petani yang jelas. Format JPG, PNG, atau WebP (Maksimal 5 MB).
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
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
                    className="h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{avatarUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                      </>
                    )}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Informasi Pribadi & Kontak */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Informasi Kontak & Domisili
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <span>Nama Lengkap</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Bpk. Markus Dengah"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
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
                      placeholder="Contoh: markus.dengah@gmail.com"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nomor Telepon / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                    <span>Nomor Telepon / WhatsApp</span>
                    <span className="text-[11px] text-emerald-700 font-normal">Terkoneksi WA</span>
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

                {/* Alamat Domisili */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Alamat Domisili / Wilayah Lahan
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Desa Watutumou II, Kec. Kalawat, Minahasa Utara"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Wilayah kebun/lahan binaan petani mitra.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Status Keanggotaan & Verifikasi */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Status Verifikasi Kemitraan
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Opsi Terverifikasi */}
                <div
                  onClick={() => setIsVerified(true)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    isVerified
                      ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                      isVerified
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isVerified && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>Terverifikasi (Aktif)</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Disetujui
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
                      Petani sah menjadi mitra koperasi dan produk panennya dapat dipajang di toko.
                    </p>
                  </div>
                </div>

                {/* Opsi Menunggu */}
                <div
                  onClick={() => setIsVerified(false)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    !isVerified
                      ? 'border-amber-300 bg-amber-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                      !isVerified
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {!isVerified && <Clock className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>Menunggu Verifikasi</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Pending
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
                      Permohonan masih ditinjau. Petani belum dapat bertransaksi penuh.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Data...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Petani'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
