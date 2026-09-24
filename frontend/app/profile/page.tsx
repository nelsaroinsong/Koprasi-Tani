'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
  User as UserIcon,
  Phone,
  MapPin,
  Camera,
  CheckCircle2,
  Users,
  Shield,
  LogOut,
  Save,
  Loader2,
  ChevronRight,
  Store,
  ArrowLeft,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout, updateProfile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Edit states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Follow stats
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followersCount: 0,
  });

  // Auth protection guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?callbackUrl=/profile');
    }
  }, [user, authLoading, router]);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  // Fetch follow statistics
  useEffect(() => {
    if (user) {
      fetch('/api/user/profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setFollowStats({
              followingCount: data.user.followingCount || 0,
              followersCount: data.user.followersCount || 0,
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Handle local avatar file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format Tidak Didukung',
        message: 'Silakan pilih file gambar (JPG, PNG, WebP).',
        type: 'error',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: 'Ukuran Terlalu Besar',
        message: 'Maksimal ukuran foto adalah 5 MB.',
        type: 'error',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({
        title: 'Nama Wajib Diisi',
        message: 'Mohon masukkan nama lengkap Anda.',
        type: 'error',
      });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar image if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (user?.email) {
          formData.append('email', user.email);
        }

        const uploadRes = await fetch('/api/upload/profile', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || uploadData.error) {
          throw new Error(uploadData.error || 'Gagal mengunggah foto profil.');
        }

        finalAvatarUrl = uploadData.url;
      }

      // Update in database via API
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          avatarUrl: finalAvatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal memperbarui profil.');
      }

      // Update local state in auth context
      updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatarUrl: finalAvatarUrl,
      });

      setAvatarUrl(finalAvatarUrl);
      setSelectedFile(null);
      setPreviewAvatar(null);
      setSaveSuccess(true);

      showToast({
        title: 'Profil Diperbarui',
        message: 'Perubahan data profil Anda berhasil disimpan.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem saat menyimpan profil.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 text-emerald-700 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Memuat profil akun...</span>
        </div>
      </div>
    );
  }

  const userInitial = (user.name || 'U').charAt(0).toUpperCase();
  const currentAvatar = previewAvatar || avatarUrl || user.avatarUrl;
  const isPetani = user.role === 'PETANI';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 lg:pb-10">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8">
        {/* Back Link */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="bg-gradient-to-br from-[#183d2e] via-[#143527] to-[#0f281e] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm border border-emerald-900/40 relative overflow-hidden mb-5">
          {/* Background Decorative Blur */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
            {/* Avatar Section with Change Trigger */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border-2 border-white/20 text-white flex items-center justify-center font-black text-3xl overflow-hidden shadow-md">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md ring-2 ring-[#183d2e] transition cursor-pointer"
                title="Ganti Foto Profil"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {user.name}
                </h1>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-700/90 text-emerald-100 border border-emerald-500/40 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>{isPetani ? 'Petani Mitra' : isAdmin ? 'Administrator' : 'Pembeli Terdaftar'}</span>
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-200/90 mt-1">
                <Mail className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>

              {/* Status Mengikuti / Pengikut */}
              <div className="mt-3.5 pt-3 border-t border-emerald-800/60 flex items-center justify-center sm:justify-start gap-4 text-xs text-emerald-100">
                <Link
                  href="/toko/mengikuti"
                  className="hover:underline flex items-center gap-1.5 font-medium"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Mengikuti: <strong className="font-bold text-white">{followStats.followingCount}</strong> Petani</span>
                </Link>

                {isPetani && (
                  <>
                    <span className="text-emerald-600">•</span>
                    <div className="flex items-center gap-1 font-medium">
                      <span>Pengikut: <strong className="font-bold text-white">{followStats.followersCount}</strong></span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Edit Profil */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xs mb-5">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Informasi Pribadi & Kontak
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Perbarui identitas, nomor telepon WhatsApp, dan alamat domisili Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap Anda"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition"
                required
              />
            </div>

            {/* Input Email (Readonly) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Email (Google Akun)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Email tertaut secara permanen dengan akun Google Anda.
              </span>
            </div>

            {/* Input Nomor Telepon / WA */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Input Alamat Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Lengkap Domisili / Lokasi Kirim
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tuliskan nama jalan, kelurahan/desa, kecamatan, dan patokan alamat..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition resize-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tersimpan!</span>
                </span>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Menu Navigasi Layanan Terkait */}
        <div className="space-y-2 mb-6">
          <Link
            href="/toko/mengikuti"
            className="w-full p-3.5 bg-white border border-slate-200/90 rounded-2xl hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 transition shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div>Daftar Petani yang Diikuti</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Lihat hasil panen dari petani-petani binaan langganan Anda
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {isPetani && (
            <Link
              href="/toko"
              className="w-full p-3.5 bg-white border border-slate-200/90 rounded-2xl hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 transition shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div>Kelola Komoditas Panen Saya</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Lihat stok fisik di gudang koperasi dan pencairan tunai
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin-koperasi-sinar-pagi-sejahtera"
              className="w-full p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl hover:bg-emerald-100/70 flex items-center justify-between text-xs font-bold text-emerald-900 transition shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div>Masuk ke Panel Administrator</div>
                  <div className="text-[10px] text-emerald-700/80 font-normal">
                    Kelola seluruh produk, pesanan anggota, dan pencairan tunai
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {/* Logout Button */}
        <div className="border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={logout}
            className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-red-200/60 shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun Koperasi</span>
          </button>
        </div>
      </main>
    </div>
  );
}
