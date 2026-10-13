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
  LocateFixed,
  ExternalLink,
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
  const [isLocating, setIsLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler Gunakan Lokasi Sekarang
  const handleUseCurrentLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast({
        title: 'Lokasi Tidak Didukung',
        message: 'Peramban Anda tidak mendukung deteksi lokasi (Geolocation).',
        type: 'error',
      });
      return;
    }

    try {
      setIsLocating(true);

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();

      if (res.ok && data?.address) {
        setAddress(data.address);
        showToast({
          title: 'Lokasi Berhasil Dideteksi',
          message: 'Alamat domisili telah diisi sesuai lokasi GPS Anda saat ini.',
          type: 'success',
        });
      } else {
        setAddress(`Titik GPS (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
        showToast({
          title: 'Koordinat GPS Ditemukan',
          message: 'Titik koordinat berhasil dimasukkan ke kolom alamat.',
          type: 'info',
        });
      }
    } catch (err: any) {
      if (err?.code === 1) {
        showToast({
          title: 'Akses Lokasi Dibatalkan',
          message: 'Permintaan lokasi dibatalkan. Anda tetap dapat mengetikkan alamat secara manual.',
          type: 'info',
        });
        return;
      }

      console.warn('Geolocation notice:', err?.message || err);
      let errMsg = 'Gagal mendeteksi lokasi saat ini.';
      if (err?.code === 2) {
        errMsg = 'Informasi sinyal lokasi GPS tidak tersedia pada perangkat.';
      } else if (err?.code === 3) {
        errMsg = 'Waktu permintaan deteksi lokasi habis. Silakan coba kembali.';
      }

      showToast({
        title: 'Gagal Deteksi Lokasi',
        message: errMsg,
        type: 'error',
      });
    } finally {
      setIsLocating(false);
    }
  };

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

  // Format tanggal bergabung
  const registeredDate = (user as any)?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '22 Sep 2026';

  return (
    <div className="min-h-screen bg-[#f3f5f6] pb-24 lg:pb-14">
      <AppHeader activePage="profile" />

      <main className="max-w-4xl mx-auto px-2.5 sm:px-6 pt-2.5 sm:pt-6">
        {/* Tombol Navigasi Kembali */}
        <div className="mb-2 sm:mb-3.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Master Profile Container Card (Mirip Gambar 1) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* 1. Header Banner Landscape Gradient */}
          <div className="h-24 sm:h-44 bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 relative overflow-hidden shadow-inner">
            <div className="absolute -top-10 -right-10 w-36 sm:w-48 h-36 sm:h-48 rounded-full bg-emerald-300/30 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 sm:w-48 h-36 sm:h-48 rounded-full bg-teal-300/30 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
          </div>

          {/* 2. Avatar & Header Profile Details */}
          <div className="px-3.5 sm:px-8 pb-4 sm:pb-6 border-b border-slate-100">
            <div className="flex items-end justify-between gap-3 -mt-9 sm:-mt-16 mb-3 sm:mb-5">
              {/* Avatar dengan border putih tebal & Camera trigger */}
              <div className="relative group self-start shrink-0">
                <div className="w-18 h-18 sm:w-28 sm:h-28 rounded-full bg-slate-100 border-3 sm:border-4 border-white shadow-md text-emerald-800 flex items-center justify-center font-black text-2xl sm:text-4xl overflow-hidden">
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
                  className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center transition cursor-pointer hover:scale-105"
                  title="Ganti Foto Profil"
                >
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Action Button di Kanan (Mirip View profile di Gambar 1) */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/profile/mengikuti"
                  className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200/90 hover:bg-slate-50 text-[11px] sm:text-xs font-semibold text-slate-700 transition shadow-2xs inline-flex items-center gap-1 sm:gap-1.5"
                >
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                  <span>Petani Diikuti</span>
                </Link>
                {isPetani && (
                  <Link
                    href="/dashboard"
                    className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-700 hover:bg-emerald-800 text-[11px] sm:text-xs font-semibold text-white transition shadow-2xs inline-flex items-center gap-1 sm:gap-1.5"
                  >
                    <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Nama & Email User */}
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight">
                  {user.name}
                </h1>
                {/* Verified Badge Biru (Persis Gambar 1) */}
                <div
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-2xs shrink-0"
                  title="Akun Terverifikasi"
                >
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 truncate">
                {user.email}
              </p>
            </div>

            {/* 3. Stats Row 4 Kolom (Persis Gambar 1, fit dalam 1 baris di mobile) */}
            <div className="grid grid-cols-4 gap-2 sm:gap-6 pt-3 sm:pt-5 mt-3 sm:mt-5 border-t border-slate-100">
              {/* Kolom 1: Terdaftar */}
              <div className="min-w-0">
                <div className="text-[9.5px] sm:text-xs text-slate-400 font-medium">
                  Terdaftar
                </div>
                <div className="text-[11px] sm:text-base font-extrabold text-slate-900 mt-0.5 truncate">
                  {registeredDate.split(' ')[0]} {registeredDate.split(' ')[1]?.slice(0, 3)}
                </div>
              </div>

              {/* Kolom 2: Mengikuti */}
              <div className="min-w-0">
                <div className="text-[9.5px] sm:text-xs text-slate-400 font-medium">
                  Mengikuti
                </div>
                <Link
                  href="/profile/mengikuti"
                  className="text-[11px] sm:text-base font-extrabold text-slate-900 hover:text-emerald-700 transition mt-0.5 block truncate"
                >
                  {followStats.followingCount} Petani
                </Link>
              </div>

              {/* Kolom 3: Pengikut */}
              <div className="min-w-0">
                <div className="text-[9.5px] sm:text-xs text-slate-400 font-medium">
                  Pengikut
                </div>
                <div className="text-[11px] sm:text-base font-extrabold text-slate-900 mt-0.5 truncate">
                  {followStats.followersCount} Pengguna
                </div>
              </div>

              {/* Kolom 4: Status / Peran */}
              <div className="min-w-0">
                <div className="text-[9.5px] sm:text-xs text-slate-400 font-medium">
                  Peran Akun
                </div>
                <div className="text-[11px] sm:text-base font-extrabold text-emerald-700 mt-0.5 truncate">
                  {isPetani ? 'Petani' : isAdmin ? 'Admin' : 'Anggota'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Form Bagian Public Profile / Informasi Pribadi (Mirip Gambar 1) */}
          <div className="px-3.5 sm:px-8 py-4 sm:py-7 border-b border-slate-100">
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-6">
              {/* Row 1: Nama Lengkap */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900">
                    Nama Lengkap
                  </label>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                    Nama resmi yang ditampilkan pada profil dan transaksi Anda.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-2xs font-medium text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Email Google Akun */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900">
                    Alamat Email
                  </label>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                    Akun Google utama yang tertaut secara permanen.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-slate-50 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed font-medium shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 3: Nomor Telepon / WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900">
                    Nomor WhatsApp / Kontak
                  </label>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                    Digunakan untuk konfirmasi pesanan dan koordinasi penjemputan hasil tani.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-8 sm:pl-10 pr-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-2xs font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Alamat Domisili & Deteksi GPS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900">
                    Alamat Lengkap Domisili
                  </label>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                    Alamat pengiriman belanja atau lokasi lahan kebun mitra.
                  </p>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating || isSaving}
                      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200/70 border border-emerald-200/90 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                          <span>Mendeteksi...</span>
                        </>
                      ) : (
                        <>
                          <LocateFixed className="w-3 h-3 text-emerald-700" />
                          <span>Gunakan Lokasi Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Tuliskan nama jalan, kelurahan/desa, kecamatan..."
                      className="w-full pl-8 sm:pl-10 pr-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-2xs font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button (Lebar penuh sampai kiri sekali di atas Akses Layanan & Ekosistem) */}
              <div className="pt-3 border-t border-slate-100/80 space-y-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 sm:py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>

                {saveSuccess && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Perubahan profil berhasil disimpan!</span>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* 5. Bagian Akses Layanan Koperasi (Mirip Section Support access di Gambar 1) */}
          <div className="px-3.5 sm:px-8 py-3.5 sm:py-6 border-b border-slate-100">
            <div className="mb-2.5 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Akses Layanan & Ekosistem
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                Kelola jejaring mitra tani dan pengelolaan panen mandiri.
              </p>
            </div>

            <div className="space-y-2">
              <Link
                href="/profile/mengikuti"
                className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/70 flex items-center justify-between transition shadow-2xs group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition truncate">
                      Daftar Petani yang Diikuti
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      Pantau ketersediaan komoditas dari petani-petani langganan Anda
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </Link>

              {isPetani && (
                <Link
                  href="/dashboard"
                  className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/70 flex items-center justify-between transition shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                      <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition truncate">
                        Kelola Komoditas Panen Saya
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        Pantau stok panen di gudang koperasi dan pencairan tunai
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin-koperasi-sinar-pagi-sejahtera"
                  className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 flex items-center justify-between transition shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-emerald-900 truncate">
                        Panel Administrator
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-emerald-700/80 truncate">
                        Kelola produk, pesanan, dan kas koperasi
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                </Link>
              )}
            </div>
          </div>

          {/* 6. Logout Section (Persis "Log out of all devices" di Gambar 1) */}
          <div className="px-3.5 sm:px-8 py-3.5 sm:py-6 bg-slate-50/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Keluar dari Akun Koperasi
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                  Akhiri sesi aktif Anda saat ini pada perangkat peramban ini.
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-700 hover:text-red-700 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
