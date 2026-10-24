'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Phone,
  Sprout,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Camera,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { validateIndonesianPhone } from '@/lib/phone-validation';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'CREATE' | 'EDIT';
  role: 'PETANI' | 'PEMBELI';
  initialData?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
  } | null;
}

export function UserFormModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  role,
  initialData,
}: UserFormModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isVerified, setIsVerified] = useState(role === 'PEMBELI');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Validasi Konfirmasi sebelum Simpan Perubahan (Khusus Edit)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsConfirmDialogOpen(false);
      if (mode === 'EDIT' && initialData) {
        setName(initialData.name || '');
        setEmail(initialData.email || '');
        setPhone(initialData.phone || '');
        setAddress(initialData.address || '');
        setAvatarUrl(initialData.avatarUrl || '');
        setIsVerified(initialData.isVerified ?? (role === 'PEMBELI'));
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setAvatarUrl('');
        setIsVerified(role === 'PEMBELI');
      }
    }
  }, [isOpen, mode, initialData, role]);

  // Handle Photo Upload
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

    // Validasi 1: Nama wajib diisi dan minimal 3 karakter
    if (!cleanName) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return false;
    }
    if (cleanName.length < 3) {
      setErrorMessage('Nama lengkap minimal terdiri dari 3 karakter.');
      return false;
    }

    // Validasi 2: Format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Format email tidak valid.');
      return false;
    }

    // Validasi 3: Nomor Telepon / WhatsApp
    if (cleanPhone) {
      const phoneValidation = validateIndonesianPhone(cleanPhone, false);
      if (!phoneValidation.isValid) {
        setErrorMessage(phoneValidation.error || 'Nomor telepon tidak valid.');
        return false;
      }
    }

    return true;
  };

  // Pre-Submit: Jika Edit, buka modal validasi konfirmasi
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    if (mode === 'EDIT') {
      setIsConfirmDialogOpen(true);
    } else {
      executeSave();
    }
  };

  // Eksekusi Simpan Data ke Server
  const executeSave = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const endpoint = '/api/admin/users';
      const method = mode === 'CREATE' ? 'POST' : 'PUT';
      const payload = {
        ...(mode === 'EDIT' && { id: initialData?.id }),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || null,
        address: cleanAddress || null,
        avatarUrl: avatarUrl || null,
        role,
        isVerified,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan data.');
      }

      setIsConfirmDialogOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submit user form:', err);
      setErrorMessage(err.message || 'Gagal menyimpan data pengguna.');
      setIsConfirmDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleTitle = role === 'PETANI' ? 'Petani' : 'Pembeli';

  return (
    <>
      {/* 1. Modal Form Utama */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader className="text-left mb-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sprout className="w-4 h-4" />
              </span>
              <DialogTitle className="text-base font-bold text-slate-900">
                {mode === 'CREATE' ? `Tambah ${roleTitle} Baru` : `Edit Data ${roleTitle}`}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {mode === 'CREATE'
                ? `Lengkapi formulir di bawah untuk mendaftarkan ${roleTitle.toLowerCase()} baru ke database koperasi.`
                : `Perbarui informasi akun, foto profil, dan status ${roleTitle.toLowerCase()} tersimpan.`}
            </DialogDescription>
          </DialogHeader>

          {/* Validation Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handlePreSubmit} className="space-y-4 mt-1">
            {/* Foto Profil */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center gap-4">
              <div className="relative group shrink-0">
                <Avatar className="w-14 h-14 border-2 border-white shadow-xs">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={name || 'Avatar'} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-sm">
                    {name ? name.slice(0, 2).toUpperCase() : 'US'}
                  </AvatarFallback>
                </Avatar>

                {/* Upload Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer disabled:opacity-50"
                  title="Ganti Foto Profil"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800">Foto Profil</span>
                  {avatarUrl && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                      Ada Foto
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Format JPG, PNG, atau WebP (Maks. 5 MB)
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3 h-3 text-emerald-600" />
                        <span>{avatarUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                      </>
                    )}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2 py-1 text-[11px] font-semibold rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer flex items-center gap-1"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Contoh: Bpk. Markus Dengah`}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* No Telepon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Wajib diawali 08 dan minimal 10 digit (contoh: 08123456789).
              </p>
            </div>

            {/* Alamat Domisili */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap / Domisili
              </label>
              <div className="relative">
                <MapPin className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jln. Raya Kalawat, Desa Watutumou, Minahasa Utara"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Status Verifikasi */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800">Status Keanggotaan</span>
                <p className="text-[11px] text-slate-500">
                  {isVerified
                    ? 'Akun telah terverifikasi resmi oleh pengurus'
                    : 'Akun masih menunggu proses verifikasi'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVerified(!isVerified)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isVerified
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                {isVerified ? 'Terverifikasi' : 'Menunggu'}
              </button>
            </div>

            {/* Modal Footer Actions */}
            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingPhoto}
                className="py-2 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{mode === 'CREATE' ? 'Simpan & Daftarkan' : 'Simpan Perubahan'}</span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Pop-up Modal Validasi Konfirmasi sebelum Simpan Perubahan (Khusus Edit) */}
      <Dialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => !open && !isSubmitting && setIsConfirmDialogOpen(false)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="text-left mb-1">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Konfirmasi Simpan Perubahan
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Pastikan informasi berikut sudah tepat sebelum disimpan ke sistem.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Rincian Perubahan Data */}
          <div className="my-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Foto Profil:</span>
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="object-cover" />}
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {name ? name.slice(0, 2).toUpperCase() : 'US'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-slate-800">
                  {avatarUrl ? 'Foto Diperbarui' : 'Menggunakan Avatar Default'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Nama Lengkap:</span>
              <span className="font-bold text-slate-900">{name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Alamat Email:</span>
              <span className="font-semibold text-slate-800">{email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Nomor Kontak:</span>
              <span className="font-semibold text-slate-800">{phone || 'Belum diisi'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Alamat Domisili:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                {address || 'Belum diisi'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
              <span className="text-slate-500 font-medium">Status Akun:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isVerified
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isVerified ? 'Terverifikasi' : 'Menunggu'}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Periksa Kembali
            </button>
            <button
              type="button"
              onClick={executeSave}
              disabled={isSubmitting}
              className="py-2 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Server...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ya, Simpan Perubahan</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
