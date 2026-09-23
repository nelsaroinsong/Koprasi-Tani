'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ShoppingBag,
  Sprout,
  CheckCircle2,
  ArrowRight,
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';

export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession();
  const { user: authUser } = useAuth();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedRole, setSelectedRole] = useState<'PEMBELI' | 'PETANI'>('PEMBELI');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync dengan session saat user pertama kali membuka halaman
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && session?.user) {
      // Jika admin, arahkan ke /admin
      if ((session.user as any).role === 'ADMIN') {
        router.replace('/admin');
        return;
      }

      // Jika user sudah menyelesaikan onboarding sebelumnya
      if ((session.user as any).isOnboarded) {
        if ((session.user as any).role === 'PETANI' && !(session.user as any).isVerified) {
          router.replace('/verifikasi-petani');
        } else {
          router.replace('/toko');
        }
        return;
      }

      // Pre-fill nama dan avatar dari akun Google
      setName(session.user.name || '');
      setAvatarUrl(session.user.image || '');
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

  // Submit Formulir Onboarding
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setErrorMessage('Alamat domisili lengkap wajib diisi.');
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
        throw new Error(data.error || 'Gagal menyimpan identitas.');
      }

      // Update Session NextAuth
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

      // Arahkan sesuai peran:
      // - PEMBELI -> /toko
      // - PETANI -> /verifikasi-petani
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Memeriksa status akun...</span>
        </div>
      </div>
    );
  }

  const userInitial = (name || session?.user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-10">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
            Langkah Terakhir Pendaftaran
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Lengkapi Identitas Akun Anda
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
            Selamat datang di Koperasi Sinar Pagi Sejahtera. Mohon lengkapi identitas Anda di bawah untuk melanjutkan.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Foto Profil */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-4">
              <div className="relative group shrink-0">
                <Avatar className="w-16 h-16 border-2 border-white shadow-xs">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={name || 'Avatar'} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-base">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>

                {/* Upload Button Overlay */}
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
                <span className="text-xs font-semibold text-slate-800 block">
                  Foto Profil Pengguna
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Gunakan foto akun Google Anda atau unggah foto baru (Maks. 5 MB)
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
                      onClick={() => setAvatarUrl('')}
                      className="px-2 py-1 text-[11px] font-semibold rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer flex items-center gap-1"
                      title="Gunakan Inisial"
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
                <UserIcon className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Email (Disabled - from Google) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email (Google)
              </label>
              <div className="relative">
                <Mail className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={session?.user?.email || ''}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Nomor Telepon / WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Alamat Lengkap / Domisili */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap / Domisili <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jln. Raya Kalawat, Desa Watutumou, Minahasa Utara"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Pilihan Peran Akun */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Pilih Tipe Keanggotaan Anda <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opsi 1: Pembeli */}
                <div
                  onClick={() => setSelectedRole('PEMBELI')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedRole === 'PEMBELI'
                      ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    {selectedRole === 'PEMBELI' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-600 text-white" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Sebagai Pembeli</h4>
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded mt-1 mb-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    Langsung Aktif
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Beli komoditas agribisnis segar (kelapa, jagung, olahan) langsung dari petani koperasi.
                  </p>
                </div>

                {/* Opsi 2: Petani (Tanpa Kelompok Tani) */}
                <div
                  onClick={() => setSelectedRole('PETANI')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedRole === 'PETANI'
                      ? 'border-amber-600 bg-amber-50/30 ring-1 ring-amber-600 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Sprout className="w-4 h-4" />
                    </div>
                    {selectedRole === 'PETANI' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600 fill-amber-600 text-white" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Mitra Petani</h4>
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded mt-1 mb-1.5">
                    <Clock className="w-3 h-3" />
                    Perlu Verifikasi Admin
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Menjual hasil panen ke koperasi dan sewa alsintan bersubsidi. Menunggu persetujuan pengurus.
                  </p>
                </div>
              </div>

              {selectedRole === 'PETANI' && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 leading-relaxed animate-in fade-in duration-150">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Pemberitahuan:</strong> Setelah menyimpan, akun Petani Anda akan masuk ke tahap verifikasi oleh pengurus Koperasi. Begitu disetujui (*ACC*) oleh admin, Anda resmi mendapatkan akses penuh akun Petani.
                  </span>
                </div>
              )}
            </div>

            {/* Tombol Simpan */}
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="w-full py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Identitas...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedRole === 'PETANI'
                      ? 'Ajukan Pendaftaran Mitra Petani'
                      : 'Simpan Identitas & Mulai Belanja'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
