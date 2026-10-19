'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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
  LogOut,
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
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
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

  // Kembali ke halaman Login & Ganti Akun Google
  const handleSwitchAccount = async () => {
    try {
      setIsSwitchingAccount(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('koperasi_auth_user');
        localStorage.removeItem('koperasi_user');
        localStorage.removeItem('koperasi_token');
        localStorage.removeItem('koperasi_last_active');
        localStorage.removeItem('koperasi_last_activity_time');
      }
      await signOut({ redirect: false });
      window.location.replace('/login');
    } catch (err) {
      console.warn('Gagal keluar sesi saat ganti akun:', err);
      window.location.replace('/login');
    }
  };

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
      if (avatarUrl) {
        formData.append('oldUrl', avatarUrl);
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

  // Hapus Foto Profil dari Cloudflare R2 & Reset State
  const handleDeletePhoto = async () => {
    if (!avatarUrl) return;

    try {
      setIsDeletingPhoto(true);
      await fetch('/api/upload/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: avatarUrl,
          email: session?.user?.email,
        }),
      });
    } catch (err) {
      console.warn('Gagal menghapus avatar dari Cloudflare R2:', err);
    } finally {
      setAvatarUrl('');
      setIsDeletingPhoto(false);
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

      if (data.user && typeof window !== 'undefined') {
        try {
          localStorage.setItem('koperasi_auth_user', JSON.stringify(data.user));
          window.dispatchEvent(new CustomEvent('user-updated'));
        } catch {}
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
      <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#233414] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-[#344d15] font-medium">Memeriksa status akun...</span>
        </div>
      </div>
    );
  }

  const displayName = session?.user?.name || name || 'Pengguna Google';
  const displayEmail = session?.user?.email || 'email@gmail.com';
  const userInitial = displayName.charAt(0).toUpperCase();

  const steps: Array<{ step: StepNumber; label: string }> = [
    { step: 1, label: 'Google' },
    { step: 2, label: 'Identitas' },
    { step: 3, label: 'Peran' },
    { step: 4, label: 'Selesai' },
  ];

  // Lebar garis penghubung aktif pada timeline (0%, 33.3%, 66.6%, 100%)
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col justify-center items-center px-4 py-10 sm:py-12 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="max-w-[440px] w-full">
        {/* Top Navigation: Kembali ke Halaman Login / Ganti Akun */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSwitchAccount}
            disabled={isSwitchingAccount}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#344d15] hover:text-[#233414] px-3 py-1.5 rounded-full bg-[#EAEDE7] hover:bg-[#dfe4da] border border-[#d5dccf] transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSwitchingAccount ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowLeft className="w-3.5 h-3.5" />
            )}
            <span>{isSwitchingAccount ? 'Mengalihkan...' : 'Kembali ke Login / Ganti Akun'}</span>
          </button>
        </div>

        {/* Unified Onboarding Card matching /login & Beranda theme */}
        <div className="w-full bg-white border border-[#dce1d6] rounded-[32px] p-6 sm:p-9">
          {/* Top Centered Logo Badge matching /login */}
          <div className="w-14 h-14 rounded-2xl bg-[#233414] border border-[#344d15] flex items-center justify-center mx-auto mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/koperasi-logo-lime.png"
              alt="Logo Koperasi Sinar Pagi Sejahtera"
              className="w-7 h-7 object-contain"
            />
          </div>

          {/* Headline & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#1a2610] tracking-tight leading-tight">
              Tahap Pembuatan Akun
            </h1>
            <p className="text-[13px] sm:text-sm text-[#526046] mt-2 font-normal">
              Koperasi Sinar Pagi Sejahtera ·{' '}
              <span className="font-semibold text-[#233414]">
                {currentStep === 1 && 'Verifikasi Akun'}
                {currentStep === 2 && 'Kontak & Domisili'}
                {currentStep === 3 && 'Peran Keanggotaan'}
                {currentStep === 4 && 'Tinjau Pendaftaran'}
              </span>
            </p>
          </div>

          {/* Numbered 1 - 2 - 3 - 4 Connected Timeline Stepper */}
          <div className="mb-7 px-2" role="navigation" aria-label="Tahap pendaftaran 1 sampai 4">
            <div className="relative flex items-start justify-between">
              {/* Background Track Line connecting centers of circle 1 to circle 4 */}
              <div
                className="absolute left-5 right-5 top-4 h-[2px] bg-[#dce1d6] -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-[#344d15] transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {steps.map(({ step, label }) => {
                const isCompleted = currentStep > step;
                const isActive = currentStep === step;

                return (
                  <button
                    key={step}
                    type="button"
                    disabled={!isCompleted}
                    onClick={() => isCompleted && setCurrentStep(step)}
                    className={`relative z-10 flex flex-col items-center group focus:outline-none ${
                      isCompleted ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {/* Numbered Step Circle (1, 2, 3, 4) */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold tabular-nums border transition-all duration-200 ${
                        isActive
                          ? 'bg-[#233414] border-[#233414] text-[#D4F63D] ring-4 ring-[#e6ece0]'
                          : isCompleted
                          ? 'bg-[#344d15] border-[#344d15] text-white group-hover:bg-[#233414]'
                          : 'bg-[#f4f5f1] border-[#cfd6c9] text-[#68785b]'
                      }`}
                    >
                      {step}
                    </div>

                    {/* Step Label */}
                    <span
                      className={`mt-2 text-xs leading-tight whitespace-nowrap transition-colors duration-150 ${
                        isActive
                          ? 'font-bold text-[#1a2610]'
                          : isCompleted
                          ? 'font-semibold text-[#344d15] group-hover:text-[#1a2610]'
                          : 'font-medium text-[#768468]'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Alert Notice */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#ffedea] border border-red-200 text-[#831c1e] flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-[#c4242a] shrink-0 mt-0.5" />
              <span className="leading-relaxed text-[13px] font-medium">{errorMessage}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ==================== TAHAP 1: AKUN GOOGLE TERHUBUNG ==================== */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Unified Connected Google Account Panel */}
                <div className="p-4 bg-[#f4f5f1] rounded-2xl border border-[#dce1d6]">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <Avatar className="w-12 h-12 border border-[#cfd6c9] shrink-0">
                      {session?.user?.image ? (
                        <AvatarImage src={session.user.image} alt={displayName} />
                      ) : null}
                      <AvatarFallback className="bg-[#233414] text-[#D4F63D] font-semibold text-sm">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm font-semibold text-[#1a2610]">
                          {displayName}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#e2f2c8] text-[#233414] border border-[#c9e39e] shrink-0">
                          <ShieldCheck className="w-3 h-3 text-[#344d15]" />
                          OAuth Aktif
                        </span>
                      </div>
                      <div className="text-[13px] text-[#526046] flex items-center gap-1.5 mt-1 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#68785b] shrink-0" />
                        <span className="truncate">{displayEmail}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#dce1d6] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#344d15] shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#526046] leading-relaxed">
                      Autentikasi akun Google Anda telah diverifikasi. Lanjutkan untuk melengkapi nomor WhatsApp dan alamat domisili Anda.
                    </p>
                  </div>

                  {/* Action untuk Ganti Akun Google langsung dari kartu */}
                  <div className="mt-3.5 pt-3 border-t border-[#dce1d6] flex items-center justify-between gap-2">
                    <span className="text-xs text-[#5b6950]">Bukan akun Google Anda?</span>
                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      disabled={isSwitchingAccount}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#233414] hover:text-[#344d15] bg-white hover:bg-[#EAEDE7] border border-[#cfd6c9] px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isSwitchingAccount ? 'Mengalihkan...' : 'Ganti Akun'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoToStep2}
                  className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-[13px] sm:text-sm whitespace-nowrap transition-colors duration-150 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>Lanjut ke Identitas Diri</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            )}

            {/* ==================== TAHAP 2: IDENTITAS DIRI ==================== */}
            {currentStep === 2 && (
              <motion.form
                key="step-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGoToStep3();
                }}
                noValidate
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Foto Profil Pengguna (Tanpa Kustomisasi Avatar) */}
                <div className="p-3.5 bg-[#f4f5f1] rounded-2xl border border-[#dce1d6] flex items-center gap-3.5">
                  <Avatar className="w-12 h-12 border border-[#cfd6c9] shrink-0">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={name || 'Avatar'} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-[#233414] text-[#D4F63D] font-semibold text-sm">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-[#1a2610] block">
                      Foto Profil Anggota
                    </span>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-3 py-1.5 text-[13px] font-medium rounded-lg bg-white border border-[#cfd6c9] text-[#233414] hover:bg-[#EAEDE7] transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#344d15]" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-[#344d15]" />
                            <span>Pilih Foto</span>
                          </>
                        )}
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          disabled={isDeletingPhoto}
                          className="px-2.5 py-1.5 text-[13px] font-medium rounded-lg text-[#c4242a] hover:bg-[#ffedea] transition-colors duration-150 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Hapus foto dan gunakan inisial"
                        >
                          {isDeletingPhoto ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Menghapus...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </>
                          )}
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
                  <label
                    htmlFor="onboarding-name"
                    className="block text-[13px] font-medium text-[#1a2610] mb-2"
                  >
                    Nama Lengkap <span className="text-[#c4242a]">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-[#68785b] pointer-events-none" />
                    <input
                      id="onboarding-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#768468] focus:outline-none focus:border-[#233414] focus:ring-1 focus:ring-[#233414] transition-colors"
                    />
                  </div>
                </div>

                {/* Nomor Telepon / WhatsApp */}
                <div>
                  <label
                    htmlFor="onboarding-phone"
                    className="block text-[13px] font-medium text-[#1a2610] mb-2"
                  >
                    Nomor WhatsApp / Telepon <span className="text-[#c4242a]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-[#68785b] pointer-events-none" />
                    <input
                      id="onboarding-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#768468] focus:outline-none focus:border-[#233414] focus:ring-1 focus:ring-[#233414] transition-colors tabular-nums"
                    />
                  </div>
                  <p className="text-[13px] text-[#5b6950] mt-1.5">
                    Digunakan untuk konfirmasi pesanan komoditas di koperasi.
                  </p>
                </div>

                {/* Alamat Lengkap / Domisili + FITUR GUNAKAN LOKASI SEKARANG */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label
                      htmlFor="onboarding-address"
                      className="text-[13px] font-medium text-[#1a2610]"
                    >
                      Alamat Domisili <span className="text-[#c4242a]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectCurrentLocation}
                      disabled={isDetectingLocation}
                      className="inline-flex items-center gap-1.5 text-xs text-[#233414] hover:text-[#1a2610] font-semibold bg-[#EAEDE7] hover:bg-[#dfe4da] border border-[#cfd6c9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                      title="Deteksi alamat berdasarkan GPS lokasi Anda saat ini"
                    >
                      {isDetectingLocation ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-[#344d15]" />
                          <span>Mendeteksi...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3 h-3 text-[#344d15]" />
                          <span>Lokasi Saat Ini</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-[#68785b] pointer-events-none" />
                    <input
                      id="onboarding-address"
                      name="address"
                      type="text"
                      autoComplete="street-address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Jl. Raya Kolongan, Kec. Kalawat, Minahasa Utara"
                      className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-[#cfd6c9] rounded-xl text-[#1a2610] placeholder:text-[#768468] focus:outline-none focus:border-[#233414] focus:ring-1 focus:ring-[#233414] transition-colors"
                    />
                  </div>
                </div>

                {/* Navigasi Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="h-11 sm:h-12 px-4 border border-[#cfd6c9] bg-white hover:bg-[#f4f5f1] text-[#233414] rounded-xl font-medium text-[13px] sm:text-sm whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-[13px] sm:text-sm whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <span>Lanjut ke Peran</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </button>
                </div>
              </motion.form>
            )}

            {/* ==================== TAHAP 3: PILIHAN TIPE ANGGOTA ==================== */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <p className="text-[13px] text-[#526046] leading-relaxed">
                  Pilih peran keanggotaan untuk menentukan akses layanan akun Anda di koperasi:
                </p>

                <div className="space-y-3" role="radiogroup" aria-label="Pilih Tipe Keanggotaan">
                  {/* Opsi 1: Pembeli */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'PEMBELI'}
                    onClick={() => setSelectedRole('PEMBELI')}
                    className={`w-full p-4 rounded-2xl border text-left transition-colors duration-150 cursor-pointer ${
                      selectedRole === 'PEMBELI'
                        ? 'border-[#233414] bg-[#f4f5f1] ring-1 ring-[#233414]'
                        : 'border-[#dce1d6] hover:border-[#b8c4ae] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ShoppingBag className="w-4 h-4 text-[#233414] shrink-0" />
                        <span className="text-sm font-semibold text-[#1a2610]">
                          Sebagai Pembeli
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#233414] bg-[#e2f2c8] border border-[#c9e39e] px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-[#344d15]" />
                          Langsung Aktif
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          selectedRole === 'PEMBELI'
                            ? 'border-[#233414] bg-[#233414] text-[#D4F63D]'
                            : 'border-[#cfd6c9] bg-white'
                        }`}
                      >
                        {selectedRole === 'PEMBELI' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#526046] leading-relaxed mt-1.5 pl-6">
                      Beli komoditas agribisnis segar langsung dari petani koperasi.
                    </p>
                  </button>

                  {/* Opsi 2: Mitra Petani */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'PETANI'}
                    onClick={() => setSelectedRole('PETANI')}
                    className={`w-full p-4 rounded-2xl border text-left transition-colors duration-150 cursor-pointer ${
                      selectedRole === 'PETANI'
                        ? 'border-[#233414] bg-[#f4f5f1] ring-1 ring-[#233414]'
                        : 'border-[#dce1d6] hover:border-[#b8c4ae] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sprout className="w-4 h-4 text-[#233414] shrink-0" />
                        <span className="text-sm font-semibold text-[#1a2610]">
                          Mitra Petani
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#92400e] bg-[#fffbeb] border border-[#fde68a] px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          Verifikasi Admin
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          selectedRole === 'PETANI'
                            ? 'border-[#233414] bg-[#233414] text-[#D4F63D]'
                            : 'border-[#cfd6c9] bg-white'
                        }`}
                      >
                        {selectedRole === 'PETANI' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#526046] leading-relaxed mt-1.5 pl-6">
                      Menyetor komoditas panen, sewa alat pertanian, dan pencairan uang tunai.
                    </p>
                  </button>
                </div>

                {selectedRole === 'PETANI' && (
                  <div className="p-3.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-[13px] flex items-start gap-2.5 leading-relaxed animate-in fade-in duration-150">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Akun Mitra Petani akan diverifikasi pengurus koperasi sebelum dapat mengelola komoditas dan mencairkan uang tunai.
                    </span>
                  </div>
                )}

                {/* Navigasi Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="h-11 sm:h-12 px-4 border border-[#cfd6c9] bg-white hover:bg-[#f4f5f1] text-[#233414] rounded-xl font-medium text-[13px] sm:text-sm whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToStep4}
                    className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-[13px] sm:text-sm whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <span>Lanjut ke Konfirmasi</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ==================== TAHAP 4: KONFIRMASI AKHIR & SELESAI ==================== */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <p className="text-[13px] text-[#526046] leading-relaxed">
                  Pastikan seluruh informasi identitas dan peran akun Anda sudah sesuai:
                </p>

                {/* Ringkasan Akun Ledger */}
                <div className="px-4 bg-[#f4f5f1] rounded-2xl border border-[#dce1d6] divide-y divide-[#dce1d6] text-[13px]">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-[#526046] shrink-0">Nama Lengkap</span>
                    <span className="font-semibold text-[#1a2610] truncate">
                      {name || displayName}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-[#526046] shrink-0">Email</span>
                    <span className="font-medium text-[#233414] truncate">
                      {displayEmail}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-[#526046] shrink-0">WhatsApp</span>
                    <span className="font-semibold text-[#1a2610] tabular-nums">
                      {phone || '—'}
                    </span>
                  </div>

                  <div className="py-3 flex items-start justify-between gap-4">
                    <span className="text-[#526046] shrink-0">Alamat Domisili</span>
                    <span className="font-medium text-[#233414] text-right max-w-[220px] line-clamp-2">
                      {address || '—'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-[#526046] shrink-0">Tipe Anggota</span>
                    <span
                      className={`font-semibold px-2.5 py-0.5 rounded-full text-xs shrink-0 ${
                        selectedRole === 'PEMBELI'
                          ? 'bg-[#e2f2c8] text-[#233414] border border-[#c9e39e]'
                          : 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'
                      }`}
                    >
                      {selectedRole === 'PEMBELI' ? 'Sebagai Pembeli' : 'Mitra Petani'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#f4f5f1] border border-[#dce1d6] rounded-xl flex items-start gap-2.5 text-[13px] text-[#344d15] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-[#344d15] shrink-0 mt-0.5" />
                  <span>
                    Setelah akun diaktifkan, login berikutnya akan{' '}
                    <strong className="font-semibold text-[#1a2610]">
                      langsung diarahkan ke Toko Online
                    </strong>
                    .
                  </span>
                </div>

                {/* Navigasi Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={isSubmitting}
                    className="h-11 sm:h-12 px-4 border border-[#cfd6c9] bg-white hover:bg-[#f4f5f1] text-[#233414] rounded-xl font-medium text-[13px] sm:text-sm whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Ubah</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || isUploadingPhoto}
                    className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-[13px] sm:text-sm whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5] text-[#D4F63D]" />
                        <span>
                          {selectedRole === 'PETANI'
                            ? 'Daftar Mitra Petani'
                            : 'Aktifkan Akun'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legal Agreement / Terms notice matching /login */}
          <p className="mt-7 text-center text-xs text-[#5b6950] leading-relaxed max-w-xs mx-auto">
            Dengan melanjutkan, Anda menyetujui{' '}
            <span className="text-[#233414] font-semibold underline underline-offset-2 hover:text-[#344d15] cursor-pointer">
              Ketentuan Layanan
            </span>{' '}
            dan{' '}
            <span className="text-[#233414] font-semibold underline underline-offset-2 hover:text-[#344d15] cursor-pointer">
              Kebijakan Privasi
            </span>{' '}
            Koperasi Sinar Pagi Sejahtera.
          </p>
        </div>
      </div>
    </div>
  );
}
