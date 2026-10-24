'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Camera,
  Trash2,
  User,
  Phone,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
  MapPin,
} from 'lucide-react';
import { validateIndonesianPhone } from '@/lib/phone-validation';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
    address?: string;
  };
  onUserUpdated: (updatedUser: {
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
    address?: string;
  }) => void;
}

export function AdminProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}: AdminProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar || '');

  // Password fields
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state when modal opens or currentUser changes
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setAvatarUrl(currentUser.avatar || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePassword(false);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Fetch fresh profile from API
      fetch('/api/admin/profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setName(data.user.name || '');
            setPhone(data.user.phone || '');
            setAddress(data.user.address || '');
            if (data.user.avatarUrl) setAvatarUrl(data.user.avatarUrl);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentUser]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format file tidak didukung. Harap pilih gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 5 MB.');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('email', currentUser.email);

      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah foto profil.');
      }

      setAvatarUrl(data.url);
      setSuccessMessage('Foto profil berhasil diunggah!');
    } catch (err: any) {
      console.error('Error saat upload foto profil:', err);
      setErrorMessage(err.message || 'Gagal mengunggah foto profil.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Nama administrator tidak boleh kosong.');
      return;
    }

    if (phone.trim()) {
      const phoneVal = validateIndonesianPhone(phone.trim(), false);
      if (!phoneVal.isValid) {
        setErrorMessage(phoneVal.error || 'Nomor telepon tidak valid.');
        return;
      }
    }

    if (changePassword) {
      if (!currentPassword) {
        setErrorMessage('Silakan isi kata sandi saat ini.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('Kata sandi baru minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          avatarUrl,
          ...(changePassword && {
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan perubahan profil.');
      }

      setSuccessMessage('Profil dan pengaturan akun berhasil diperbarui!');
      onUserUpdated({
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatarUrl,
        phone: data.user.phone,
        address: data.user.address,
      });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saat menyimpan profil:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inisial untuk avatar fallback
  const userInitial = (name || currentUser.name || 'A').charAt(0).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="text-left mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                Edit Profil Administrator
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Kelola identitas akun, foto profil, dan kata sandi pengurus.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug font-medium">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center pb-4 border-b border-slate-100">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-2xl shadow-md border-3 border-emerald-100 overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Foto Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>

              {/* Camera Trigger Button */}
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md ring-2 ring-white cursor-pointer transition disabled:opacity-60"
                title="Ganti Foto Profil"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Photo Action Links */}
            <div className="flex items-center gap-3 mt-2.5">
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                {isUploadingPhoto ? 'Mengunggah...' : 'Unggah Foto Baru'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Fields: Name, Email, Phone */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Administrator Koperasi"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4 text-emerald-700" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812-xxxx-xxxx"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Kantor & Gudang Koperasi (Lokasi Ambil Pesanan)
              </label>
              <div className="relative">
                <div className="absolute top-2.5 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                </div>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kab. Minahasa Utara, Sulawesi Utara"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Alamat ini akan otomatis menjadi lokasi serah terima saat pembeli checkout komoditas di toko online.
              </p>
            </div>
          </div>

          {/* Password Change Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setChangePassword(!changePassword)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between text-xs font-semibold transition cursor-pointer border border-slate-200/80"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Ubah Kata Sandi Administrator</span>
              </div>
              <span className="text-[11px] text-emerald-700 underline font-normal">
                {changePassword ? 'Tutup' : 'Ganti Password'}
              </span>
            </button>

            {changePassword && (
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kata Sandi Saat Ini
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata sandi lama"
                      className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
