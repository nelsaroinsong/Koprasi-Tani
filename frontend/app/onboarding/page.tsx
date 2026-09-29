'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ShoppingBag,
  Sprout,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  User as UserIcon,
  Phone,
  MapPin,
  Mail,
  Camera,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  Navigation,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'motion/react';

type StepNumber = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stepper State (Tahap 1, 2, 3, 4)
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedRole, setSelectedRole] = useState<'PEMBELI' | 'PETANI'>('PEMBELI');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync dengan session saat user pertama kali membuka halaman
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && session?.user) {
      if ((session.user as any).role === 'ADMIN') {
        router.replace('/admin');
        return;
      }

      // JIKA AKUN SUDAH PERNAH TERDAFTAR:
      // Langsung alihkan ke toko online tanpa menampilkan formulir buat akun
      if ((session.user as any).isOnboarded) {
        if ((session.user as any).role === 'PETANI' && !(session.user as any).isVerified) {
          router.replace('/verifikasi-petani');
        } else {
          router.replace('/toko');
        }
        return;
      }

      setName((prev) => prev || session?.user?.name || '');
      setAvatarUrl((prev) => prev || session?.user?.image || '');
    }
  }, [status, session, router]);

  // Upload Foto Profil
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format berkas harus berupa gambar (JPG, PNG, atau WebP).');
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
      if (session?.user?.email) {
        formData.append('email', session.user.email);
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
      console.error('Error upload foto onboarding:', err);
      setErrorMessage(err.message || 'Gagal mengunggah foto profil.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Deteksi Lokasi Sekarang (HTML5 Geolocation + Reverse Geocode)
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Fitur deteksi lokasi GPS tidak didukung di perangkat ini.');
      return;
    }

    setIsDetectingLocation(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Reverse geocode via OpenStreetMap Nominatim (gratis & bahasa Indonesia)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=id`,
            {
              headers: {
                Accept: 'application/json',
              },
            }
          );

          if (res.ok) {
            const data = await res.json();
            const formatted = data.display_name || data.name || '';
            if (formatted) {
              setAddress(formatted);
            } else {
              setAddress(`Titik Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } else {
            setAddress(`Titik Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (e) {
          console.warn('Gagal reverse geocode, fallback ke koordinat:', e);
          const { latitude, longitude } = pos.coords;
          setAddress(`Titik Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsDetectingLocation(false);
        if (err.code === 1) {
          setErrorMessage('Izin akses lokasi ditolak di browser. Silakan ketik alamat secara manual.');
        } else if (err.code === 2) {
          setErrorMessage('Lokasi GPS tidak terdeteksi. Silakan ketik alamat secara manual.');
        } else {
          setErrorMessage('Waktu pencarian lokasi habis. Silakan ketik alamat secara manual.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Navigasi ke Step 2 (Data Diri)
  const handleGoToStep2 = () => {
    setErrorMessage(null);
    setCurrentStep(2);
  };

  // Validasi Step 2 lalu lanjut ke Step 3 (Tipe Anggota)
  const handleGoToStep3 = () => {
    setErrorMessage(null);
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    if (!cleanName || cleanName.length < 3) {
      setErrorMessage('Nama lengkap wajib diisi minimal 3 karakter.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Nomor telepon/WhatsApp wajib diisi minimal 8 digit.');
      return;
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      setErrorMessage('Alamat domisili lengkap wajib diisi minimal 5 karakter.');
      return;
    }

    setCurrentStep(3);
  };

  // Navigasi ke Step 4 (Konfirmasi)
  const handleGoToStep4 = () => {
    setErrorMessage(null);
    setCurrentStep(4);
  };

  // Submit Formulir Onboarding Akhir (Simpan ke DB)
  const handleFinalSubmit = async () => {
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    if (!cleanName || cleanName.length < 3) {
      setErrorMessage('Nama lengkap wajib diisi minimal 3 karakter.');
      setCurrentStep(2);
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Nomor telepon/WhatsApp wajib diisi minimal 8 digit.');
      setCurrentStep(2);
      return;
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      setErrorMessage('Alamat domisili lengkap wajib diisi.');
      setCurrentStep(2);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          avatarUrl: avatarUrl || null,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan identitas akun.');
      }

      if (updateSession) {
        await updateSession({
          user: {
            name: cleanName,
            phone: cleanPhone,
            address: cleanAddress,
            avatarUrl: avatarUrl || null,
            role: selectedRole,
            isVerified: selectedRole === 'PEMBELI',
            isOnboarded: true,
          },
        });
      }

      if (selectedRole === 'PETANI') {
        router.push('/verifikasi-petani');
      } else {
        router.push('/toko');
      }
    } catch (err: any) {
      console.error('Error submitting onboarding:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || Boolean((session?.user as any)?.isOnboarded)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-slate-500 font-medium">Memeriksa status akun...</span>
        </div>
      </div>
    );
  }

  const userInitial = (name || session?.user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-md w-full">
        {/* Header Koperasi Ringkas */}
        <div className="text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-semibold mb-1">
            Pendaftaran Anggota
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Tahap Pembuatan Akun
          </h1>
          <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 max-w-xs mx-auto">
            Koperasi Sinar Pagi Sejahtera • 4 langkah mudah
          </p>
        </div>

        {/* STEPPER COMPACT (SESUAI GAMBAR 1) */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs mb-3 sm:mb-4">
          <div className="max-w-xs sm:max-w-sm mx-auto">
            <div className="grid grid-cols-4 gap-0.5 text-center relative">
              {/* Garis Abu-Abu Latar Belakang */}
              <div className="absolute top-3 sm:top-3.5 left-[12%] right-[12%] h-0.5 sm:h-1 bg-slate-200 -z-0 rounded-full" />

              {/* Garis Hijau Progress Berjalan */}
              <div
                className="absolute top-3 sm:top-3.5 left-[12%] h-0.5 sm:h-1 bg-emerald-600 -z-0 rounded-full transition-all duration-400 ease-out"
                style={{
                  width:
                    currentStep === 1
                      ? '0%'
                      : currentStep === 2
                      ? '38%'
                      : currentStep === 3
                      ? '74%'
                      : '76%',
                }}
              />

              {/* Step 1: Akun Google */}
              <div
                onClick={() => currentStep > 1 && setCurrentStep(1)}
                className={`flex flex-col items-center relative z-10 ${
                  currentStep > 1 ? 'cursor-pointer' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-2xs transition-all ${
                    currentStep >= 1
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold mt-1 leading-tight ${
                    currentStep === 1 ? 'text-emerald-800' : 'text-slate-700'
                  }`}
                >
                  Akun Google
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">
                  Terhubung
                </span>
              </div>

              {/* Step 2: Identitas Diri */}
              <div
                onClick={() => currentStep > 2 && setCurrentStep(2)}
                className={`flex flex-col items-center relative z-10 ${
                  currentStep > 2 ? 'cursor-pointer' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-2xs transition-all ${
                    currentStep >= 2
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold mt-1 leading-tight ${
                    currentStep === 2 ? 'text-emerald-800' : 'text-slate-700'
                  }`}
                >
                  Identitas Diri
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">
                  Kontak & Alamat
                </span>
              </div>

              {/* Step 3: Tipe Anggota */}
              <div
                onClick={() => currentStep > 3 && setCurrentStep(3)}
                className={`flex flex-col items-center relative z-10 ${
                  currentStep > 3 ? 'cursor-pointer' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-2xs transition-all ${
                    currentStep >= 3
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > 3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '3'}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold mt-1 leading-tight ${
                    currentStep === 3 ? 'text-emerald-800' : 'text-slate-700'
                  }`}
                >
                  Tipe Anggota
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">
                  Pembeli / Petani
                </span>
              </div>

              {/* Step 4: Selesai */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-2xs transition-all ${
                    currentStep >= 4
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  4
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold mt-1 leading-tight ${
                    currentStep === 4 ? 'text-emerald-800' : 'text-slate-700'
                  }`}
                >
                  Selesai
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline">
                  Mulai Belanja
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card Compact */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          {errorMessage && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-[11px] animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ==================== TAHAP 1: AKUN GOOGLE TERHUBUNG ==================== */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3.5"
              >
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[11px] sm:text-xs font-bold text-emerald-950">
                      Akun Google Berhasil Terhubung
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      Autentikasi akun Google Anda telah diverifikasi oleh sistem. Langkah selanjutnya adalah melengkapi nomor WhatsApp dan domisili Anda.
                    </p>
                  </div>
                </div>

                {/* Info Card Google */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <Avatar className="w-11 h-11 border-2 border-white shadow-2xs shrink-0">
                    {session?.user?.image ? (
                      <AvatarImage src={session.user.image} alt={session.user.name || 'Avatar'} />
                    ) : null}
                    <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-xs">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {session?.user?.name || name || 'Pengguna Google'}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{session?.user?.email || 'email@gmail.com'}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Terverifikasi OAuth
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleGoToStep2}
                    className="w-full py-2 sm:py-2.5 px-3.5 rounded-lg sm:rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-[11px] sm:text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 group"
                  >
                    <span>Lanjut ke Identitas Diri</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== TAHAP 2: IDENTITAS DIRI ==================== */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                {/* Foto Profil Pengguna Compact */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
                  <div className="relative group shrink-0">
                    <Avatar className="w-11 h-11 border-2 border-white shadow-2xs">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={name || 'Avatar'} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-xs">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white cursor-pointer disabled:opacity-50"
                      title="Ganti Foto Profil"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      Foto Profil Anggota
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>Unggah...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{avatarUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                          </>
                        )}
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-md text-red-600 hover:bg-red-50 transition cursor-pointer flex items-center gap-1"
                          title="Gunakan Inisial"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
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
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute inset-y-0 left-2.5 my-auto w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Nomor Telepon / WhatsApp */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / Telepon <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute inset-y-0 left-2.5 my-auto w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                    />
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">
                    Digunakan untuk konfirmasi pesanan komoditas di koperasi.
                  </p>
                </div>

                {/* Alamat Lengkap / Domisili + FITUR GUNAKAN LOKASI SEKARANG */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] sm:text-xs font-semibold text-slate-700">
                      Alamat Domisili <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectCurrentLocation}
                      disabled={isDetectingLocation}
                      className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-md transition cursor-pointer disabled:opacity-60"
                      title="Deteksi alamat berdasarkan GPS lokasi Anda saat ini"
                    >
                      {isDetectingLocation ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-700" />
                          <span>Mendeteksi...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Gunakan Lokasi Saat Ini</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute inset-y-0 left-2.5 my-auto w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Jl. Raya Kolongan, Kec. Kalawat, Minahasa Utara"
                      className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Navigasi Buttons Compact */}
                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg sm:rounded-xl font-semibold text-[11px] sm:text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToStep3}
                    className="flex-1 py-2 px-3.5 rounded-lg sm:rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] sm:text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 group"
                  >
                    <span>Lanjut ke Tipe Anggota</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== TAHAP 3: PILIHAN TIPE ANGGOTA ==================== */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <div>
                  <h3 className="text-[11px] sm:text-xs font-bold text-slate-900">
                    Pilih Tipe Keanggotaan
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Tentukan peran akun Anda di Koperasi:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  {/* Opsi 1: Pembeli */}
                  <div
                    onClick={() => setSelectedRole('PEMBELI')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative ${
                      selectedRole === 'PEMBELI'
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </div>
                      {selectedRole === 'PEMBELI' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 text-white" />
                      )}
                    </div>
                    <h4 className="text-[11px] sm:text-xs font-bold text-slate-900">Sebagai Pembeli</h4>
                    <div className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded mt-0.5 mb-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Langsung Aktif
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Beli komoditas agribisnis segar langsung dari petani koperasi.
                    </p>
                  </div>

                  {/* Opsi 2: Mitra Petani */}
                  <div
                    onClick={() => setSelectedRole('PETANI')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative ${
                      selectedRole === 'PETANI'
                        ? 'border-amber-600 bg-amber-50/40 ring-1 ring-amber-600 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Sprout className="w-3.5 h-3.5" />
                      </div>
                      {selectedRole === 'PETANI' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 fill-amber-600 text-white" />
                      )}
                    </div>
                    <h4 className="text-[11px] sm:text-xs font-bold text-slate-900">Mitra Petani</h4>
                    <div className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded mt-0.5 mb-1">
                      <Clock className="w-2.5 h-2.5" />
                      Verifikasi Admin
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Menyetor komoditas panen, sewa alat pertanian, dan pencairan uang tunai.
                    </p>
                  </div>
                </div>

                {selectedRole === 'PETANI' && (
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[10px] sm:text-[11px] flex items-start gap-1.5 leading-relaxed animate-in fade-in duration-150">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Akun Mitra Petani akan diverifikasi pengurus koperasi sebelum dapat mengelola komoditas dan mencairkan uang tunai.
                    </span>
                  </div>
                )}

                {/* Navigasi Buttons Compact */}
                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg sm:rounded-xl font-semibold text-[11px] sm:text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToStep4}
                    className="flex-1 py-2 px-3.5 rounded-lg sm:rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] sm:text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 group"
                  >
                    <span>Lanjut ke Konfirmasi</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== TAHAP 4: KONFIRMASI AKHIR & SELESAI ==================== */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <div>
                  <h3 className="text-[11px] sm:text-xs font-bold text-slate-900">
                    Tinjau Data Pendaftaran
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Pastikan informasi akun Anda sudah sesuai:
                  </p>
                </div>

                {/* Ringkasan Akun Compact */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-[11px] sm:text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                    <span className="text-slate-500 text-[10px] sm:text-[11px]">Nama Lengkap:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">{name}</span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                    <span className="text-slate-500 text-[10px] sm:text-[11px]">Email:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[180px]">{session?.user?.email}</span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                    <span className="text-slate-500 text-[10px] sm:text-[11px]">WhatsApp:</span>
                    <span className="font-semibold text-slate-900">{phone}</span>
                  </div>

                  <div className="flex items-start justify-between pb-1.5 border-b border-slate-200/80">
                    <span className="text-slate-500 text-[10px] sm:text-[11px] shrink-0">Alamat:</span>
                    <span className="font-medium text-slate-800 text-right max-w-[200px] line-clamp-2">{address}</span>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-slate-500 text-[10px] sm:text-[11px]">Tipe Anggota:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[9px] ${
                        selectedRole === 'PEMBELI'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {selectedRole === 'PEMBELI' ? 'Sebagai Pembeli' : 'Mitra Petani'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-start gap-2 text-[10px] sm:text-[11px] text-emerald-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Setelah akun diaktifkan, login berikutnya akan <strong>langsung diarahkan ke Toko Online</strong>.
                  </span>
                </div>

                {/* Navigasi Buttons Compact */}
                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={isSubmitting}
                    className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg sm:rounded-xl font-semibold text-[11px] sm:text-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Ubah</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || isUploadingPhoto}
                    className="flex-1 py-2 sm:py-2.5 px-3.5 rounded-lg sm:rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-[11px] sm:text-xs shadow-2xs transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>
                          {selectedRole === 'PETANI'
                            ? 'Daftar Mitra Petani'
                            : 'Aktifkan Akun & Belanja'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
