'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
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
  LocateFixed,
  ReceiptText,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

let cachedFollowStats: { followingCount: number; followersCount: number } | null = null;
let cachedUserCreatedAt: string | null = null;

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

  // Follow stats & registration date (SWR Cache)
  const [followStats, setFollowStats] = useState(
    () => cachedFollowStats || { followingCount: 0, followersCount: 0 }
  );
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(
    () => cachedUserCreatedAt || null
  );

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

  // Fetch follow statistics & profile details from database
  useEffect(() => {
    if (user) {
      fetch('/api/user/profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            const nextStats = {
              followingCount: data.user.followingCount || 0,
              followersCount: data.user.followersCount || 0,
            };
            setFollowStats(nextStats);
            cachedFollowStats = nextStats;
            if (data.user.createdAt) {
              setUserCreatedAt(data.user.createdAt);
              cachedUserCreatedAt = data.user.createdAt;
            }
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
      <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 text-[#233414] animate-spin" />
          <span className="text-xs text-[#526046] font-medium">Memuat profil akun...</span>
        </div>
      </div>
    );
  }

  const userInitial = (user.name || 'U').charAt(0).toUpperCase();
  const currentAvatar = previewAvatar || avatarUrl || user.avatarUrl;
  const isPetani = user.role === 'PETANI';
  const isAdmin = user.role === 'ADMIN';

  // Format tanggal bergabung sesuai database (atau tanggal hari ini)
  const rawCreatedAt = userCreatedAt || (user as any)?.createdAt;
  const registeredDate = rawCreatedAt
    ? new Date(rawCreatedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div className="min-h-screen bg-[#f4f5f1] pb-24 lg:pb-14">
      <AppHeader activePage="profile" />

      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
        {/* Master Profile Container Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#dce1d6] overflow-hidden">
          {/* 1. Header Banner Flat Deep Forest Green */}
          <div className="h-24 sm:h-40 bg-[#233414] border border-[#344d15] relative overflow-hidden" />

          {/* 2. Avatar & Header Profile Details */}
          <div className="px-4 sm:px-8 pb-4 sm:pb-6 border-b border-[#EAEDE7]">
            <div className="flex items-end justify-between gap-3 -mt-10 sm:-mt-14 mb-3.5 sm:mb-5">
              {/* Avatar dengan border putih tebal & Camera trigger */}
              <div className="relative group self-start shrink-0">
                <div className="w-18 h-18 sm:w-28 sm:h-28 rounded-full bg-[#EAEDE7] border-3 sm:border-4 border-white shadow-sm text-[#233414] flex items-center justify-center font-black text-2xl sm:text-4xl overflow-hidden">
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
                  className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-[#f4f5f1] text-[#1a2610] border border-[#cfd6c9] shadow-2xs flex items-center justify-center transition cursor-pointer"
                  title="Ganti Foto Profil"
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#233414]" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Action Buttons di Kanan */}
              <div className="flex items-center gap-1.5 sm:gap-2 translate-y-3 sm:translate-y-0">
                <Link
                  href="/profile/mengikuti"
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#f4f5f1] text-xs font-semibold text-[#1a2610] shadow-2xs transition inline-flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#344d15]" />
                  <span>Petani Diikuti</span>
                </Link>
                {isPetani && (
                  <Link
                    href="/dashboard"
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#233414] hover:bg-[#344d15] text-xs font-semibold text-white shadow-2xs transition inline-flex items-center gap-1.5"
                  >
                    <Store className="w-3.5 h-3.5 text-[#D4F63D]" />
                    <span>Dashboard</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Nama & Email User */}
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-base sm:text-2xl font-black text-[#1a2610] tracking-tight">
                  {user.name}
                </h1>
                {/* Verified Badge */}
                <div
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#233414] text-[#D4F63D] flex items-center justify-center shrink-0"
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
              <p className="text-[11px] sm:text-sm text-[#526046] mt-0.5 truncate">
                {user.email}
              </p>
            </div>

            {/* 3. Stats Row 4 Kolom */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 pt-3.5 sm:pt-5 mt-3.5 sm:mt-5 border-t border-[#EAEDE7]">
              {/* Kolom 1: Terdaftar */}
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-[#5b6950] font-medium">
                  Terdaftar
                </div>
                <div className="text-xs sm:text-base font-extrabold text-[#1a2610] mt-0.5 truncate tabular-nums">
                  {registeredDate.split(' ')[0]} {registeredDate.split(' ')[1]?.slice(0, 3)}
                </div>
              </div>

              {/* Kolom 2: Mengikuti */}
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-[#5b6950] font-medium">
                  Mengikuti
                </div>
                <Link
                  href="/profile/mengikuti"
                  className="text-xs sm:text-base font-extrabold text-[#1a2610] hover:text-[#344d15] transition mt-0.5 block truncate tabular-nums"
                >
                  {followStats.followingCount} Petani
                </Link>
              </div>

              {/* Kolom 3: Pengikut */}
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-[#5b6950] font-medium">
                  Pengikut
                </div>
                <div className="text-xs sm:text-base font-extrabold text-[#1a2610] mt-0.5 truncate tabular-nums">
                  {followStats.followersCount} Pengguna
                </div>
              </div>

              {/* Kolom 4: Status / Peran */}
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-[#5b6950] font-medium">
                  Peran Akun
                </div>
                <div className="text-xs sm:text-base font-extrabold text-[#344d15] mt-0.5 truncate">
                  {isPetani ? 'Petani' : isAdmin ? 'Admin' : 'Anggota'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Form Bagian Informasi Pribadi */}
          <div className="px-4 sm:px-8 py-4 sm:py-7 border-b border-[#EAEDE7]">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Row 1: Nama Lengkap */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#1a2610]">
                    Nama Lengkap
                  </label>
                  <p className="text-[10px] sm:text-xs text-[#5b6950] mt-0.5 hidden sm:block">
                    Nama resmi yang ditampilkan pada profil dan transaksi Anda.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-white border border-[#cfd6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] transition font-medium text-[#1a2610] placeholder:text-[#5b6950]"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Email Google Akun */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#1a2610]">
                    Alamat Email
                  </label>
                  <p className="text-[10px] sm:text-xs text-[#5b6950] mt-0.5 hidden sm:block">
                    Akun Google utama yang tertaut secara permanen.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-[#f4f5f1] text-[#5b6950] border border-[#dce1d6] rounded-xl cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              {/* Row 3: Nomor Telepon / WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#1a2610]">
                    Nomor WhatsApp / Kontak
                  </label>
                  <p className="text-[10px] sm:text-xs text-[#5b6950] mt-0.5 hidden sm:block">
                    Digunakan untuk konfirmasi pesanan dan koordinasi penjemputan hasil tani.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#5b6950] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-8 sm:pl-10 pr-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-white border border-[#cfd6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] transition font-medium text-[#1a2610] placeholder:text-[#5b6950]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Alamat Domisili & Deteksi GPS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 md:gap-6 items-start">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#1a2610]">
                    Alamat Lengkap Domisili
                  </label>
                  <p className="text-[10px] sm:text-xs text-[#5b6950] mt-0.5 hidden sm:block">
                    Alamat pengiriman belanja atau lokasi lahan kebun mitra.
                  </p>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating || isSaving}
                      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#233414] bg-[#e2f2c8] hover:bg-[#d5eab3] border border-[#c9e39e] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-[#233414]" />
                          <span>Mendeteksi...</span>
                        </>
                      ) : (
                        <>
                          <LocateFixed className="w-3 h-3 text-[#233414]" />
                          <span>Gunakan Lokasi Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-[#5b6950] absolute left-3 top-2.5" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Tuliskan nama jalan, kelurahan/desa, kecamatan..."
                      className="w-full pl-8 sm:pl-10 pr-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm bg-white border border-[#cfd6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#233414]/15 focus:border-[#233414] transition font-medium text-[#1a2610] placeholder:text-[#5b6950] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-[#EAEDE7] space-y-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 sm:py-3.5 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#D4F63D]" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#D4F63D]" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>

                {saveSuccess && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#233414] animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-[#547318]" />
                    <span>Perubahan profil berhasil disimpan!</span>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* 5. Bagian Akses Layanan Koperasi */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-[#EAEDE7]">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-[#1a2610]">
                Akses Layanan & Ekosistem
              </h2>
              <p className="text-[10px] sm:text-xs text-[#5b6950] mt-0.5">
                Kelola jejaring mitra tani dan pengelolaan panen mandiri.
              </p>
            </div>

            <div className="space-y-2.5">
              <Link
                href="/profile/mengikuti"
                className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#dce1d6] hover:border-[#344d15] hover:bg-[#f4f5f1]/60 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#e2f2c8] text-[#233414] flex items-center justify-center shrink-0 border border-[#c9e39e]">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] transition truncate">
                      Daftar Petani yang Diikuti
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[#5b6950] truncate">
                      Pantau ketersediaan komoditas dari petani-petani langganan Anda
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5b6950] group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </Link>

              {/* Riwayat Transaksi */}
              <Link
                href="/profile/transaksi"
                className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#dce1d6] hover:border-[#344d15] hover:bg-[#f4f5f1]/60 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#e2f2c8] text-[#233414] flex items-center justify-center shrink-0 border border-[#c9e39e]">
                    <ReceiptText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] transition truncate">
                      Riwayat Transaksi
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[#5b6950] truncate">
                      Pantau catatan pengeluaran belanja, sewa alat, dan arus transaksi
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5b6950] group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </Link>

              {isPetani && (
                <Link
                  href="/dashboard"
                  className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#dce1d6] hover:border-[#344d15] hover:bg-[#f4f5f1]/60 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#233414] text-[#D4F63D] flex items-center justify-center shrink-0 border border-[#344d15]">
                      <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a2610] group-hover:text-[#344d15] transition truncate">
                        Kelola Komoditas Panen Saya
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#5b6950] truncate">
                        Pantau stok panen di gudang koperasi dan pencairan tunai
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5b6950] group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin-koperasi-sinar-pagi-sejahtera"
                  className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#c9e39e] bg-[#e2f2c8]/40 hover:bg-[#e2f2c8]/70 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#233414] text-[#D4F63D] flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#1a2610] truncate">
                        Panel Administrator
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#526046] truncate">
                        Kelola produk, pesanan, dan kas koperasi
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#233414] group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                </Link>
              )}
            </div>
          </div>

          {/* 6. Logout Section */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 bg-[#f4f5f1]/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1a2610]">
                  Keluar dari Akun Koperasi
                </h3>
                <p className="text-[10px] sm:text-xs text-[#5b6950] mt-0.5 hidden sm:block">
                  Akhiri sesi aktif Anda saat ini pada perangkat peramban ini.
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-[#cfd6c9] bg-white hover:bg-[#ffedea] hover:border-red-200 text-[#1a2610] hover:text-[#831c1e] text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
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
