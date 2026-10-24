'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Loader2,
  UserCheck,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Send,
  KeyRound,
  RotateCcw,
  RefreshCw,
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

  // OTP Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(isEdit);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer countdown untuk kirim ulang OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Request Send OTP ke Email Pembeli
  const handleSendOtp = async () => {
    setOtpError(null);
    setDevOtpNotice(null);
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setOtpError('Masukkan format alamat email yang valid terlebih dahulu.');
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await fetch('/api/admin/users/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, role: 'PEMBELI' }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengirim kode verifikasi OTP.');
      }

      setOtpSent(true);
      setOtpCountdown(60); // 60 detik cooldown
      setOtpCode('');

      if (data.isDev && data.devOtp) {
        setDevOtpNotice(`[Mode Dev] Kode OTP simulasi Anda: ${data.devOtp}`);
      }

      showToast({
        title: 'Kode OTP Terkirim',
        message: data.message || `Kode verifikasi telah dikirim ke ${cleanEmail}`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error send OTP:', err);
      setOtpError(err.message || 'Terjadi kesalahan saat mengirim OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP yang dimasukkan
  const handleVerifyOtp = async () => {
    setOtpError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setOtpError('Masukkan 6 digit kode OTP yang terkirim.');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      const res = await fetch('/api/admin/users/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Kode OTP tidak cocok atau kedaluwarsa.');
      }

      setIsEmailVerified(true);
      setOtpSent(false);
      setDevOtpNotice(null);
      setOtpError(null);

      showToast({
        title: 'Email Terverifikasi',
        message: 'Alamat email aktif pembeli berhasil diverifikasi!',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error verify OTP:', err);
      setOtpError(err.message || 'Gagal memverifikasi OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Reset email verification jika admin ingin mengganti email
  const handleResetEmailVerification = () => {
    setIsEmailVerified(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
    setDevOtpNotice(null);
    setOtpCountdown(0);
  };

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
      setErrorMessage('Nama lengkap pembeli wajib diisi.');
      return false;
    }
    if (cleanName.length < 3) {
      setErrorMessage('Nama lengkap pembeli minimal terdiri dari 3 karakter.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Format alamat email tidak valid.');
      return false;
    }

    if (!isEdit && !isEmailVerified) {
      setErrorMessage('Alamat email pembeli wajib diverifikasi dengan kode OTP terlebih dahulu.');
      return false;
    }

    if (
      isEdit &&
      initialData?.email &&
      cleanEmail !== initialData.email.trim().toLowerCase() &&
      !isEmailVerified
    ) {
      setErrorMessage('Alamat email baru pembeli wajib diverifikasi dengan kode OTP terlebih dahulu.');
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
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan data pembeli.');
      }

      showToast(
        isEdit
          ? `Data pembeli ${name.trim()} berhasil diperbarui`
          : `Pembeli ${name.trim()} berhasil ditambahkan`
      );
      onSuccess();
    } catch (err: any) {
      console.error('Error submit pembeli form:', err);
      setErrorMessage(err.message || 'Gagal menyimpan data pembeli.');
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
          <span>Kembali ke Data Pembeli</span>
        </button>

        <span className="text-xs text-slate-400 hidden sm:inline-block">
          Overview / Pembeli / {isEdit ? 'Edit Data Pembeli' : 'Tambah Pembeli Baru'}
        </span>
      </div>

      {/* Kravio Outer Shell */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        <div className="bg-white rounded-xl border border-[#ECEEF2] p-5 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Header Section */}
          <div className="flex items-start gap-3.5 pb-6 border-b border-slate-100">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {isEdit ? 'Edit Data Pembeli & Pelanggan' : 'Tambah Pembeli & Pelanggan Baru'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? 'Perbarui profil kontak, nomor WhatsApp, atau alamat pengiriman pelanggan.'
                  : 'Lengkapi formulir profil pelanggan baru untuk didaftarkan ke sistem Koperasi Sinar Pagi Sejahtera.'}
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
            {/* 1. Foto Profil Pembeli */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Avatar className="w-20 h-20 rounded-2xl border-2 border-white shadow-sm shrink-0">
                <AvatarImage src={avatarUrl} alt={name || 'Pembeli'} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-emerald-700 text-white font-bold text-2xl">
                  {initialLetter}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Foto Profil Pembeli
                </div>
                <p className="text-[11.5px] text-slate-400 max-w-md">
                  Gunakan foto pelanggan atau logo usaha yang jelas. Format JPG, PNG, atau WebP (Maksimal 5 MB).
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

            {/* 2. Informasi Kontak & Domisili */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Informasi Kontak & Domisili
              </div>

              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
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

              {/* Email & Verifikasi OTP */}
              <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span>Alamat Email (Akun Google Pembeli)</span>
                    <span className="text-rose-500">*</span>
                  </label>

                  {/* Status Badge Verifikasi */}
                  {isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Email Terverifikasi</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Perlu Verifikasi OTP
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      disabled={isEmailVerified || isSendingOtp}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsEmailVerified(false);
                        setOtpSent(false);
                      }}
                      placeholder="Contoh: pembeli@gmail.com"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  {/* Tombol Minta / Kirim OTP */}
                  {!isEmailVerified ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || otpCountdown > 0 || !email.trim()}
                      className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : otpCountdown > 0 ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kirim Ulang ({otpCountdown}s)</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{otpSent ? 'Kirim Ulang OTP' : 'Kirim Kode Verifikasi'}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetEmailVerification}
                      className="h-10 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shrink-0"
                      title="Ubah alamat email"
                    >
                      Ubah Email
                    </button>
                  )}
                </div>

                {/* Input Kode OTP jika OTP sudah dikirim dan belum terverifikasi */}
                {otpSent && !isEmailVerified && (
                  <div className="pt-2 mt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[11.5px] font-semibold text-slate-800 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Masukkan 6 Digit Kode OTP</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Dikirim ke <strong className="text-slate-800">{email}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-36 h-10 px-3 text-center tracking-[6px] font-mono text-base font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition shadow-2xs"
                      />

                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || otpCode.length !== 6}
                        className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isVerifyingOtp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Verifikasi OTP</span>
                      </button>

                      {/* Tombol Refresh / Kirim Ulang Kode OTP ke Email */}
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || otpCountdown > 0}
                        className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs shrink-0"
                        title="Refresh dan kirimkan kode OTP baru ke email"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isSendingOtp ? 'animate-spin text-emerald-700' : 'text-slate-500'
                          }`}
                        />
                        <span>
                          {otpCountdown > 0 ? `Kirim Ulang (${otpCountdown}s)` : 'Refresh Kode OTP'}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Belum menerima email? Periksa folder spam atau klik Refresh Kode.</span>
                      {otpCountdown === 0 && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                          className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Minta Kode Baru</span>
                        </button>
                      )}
                    </div>

                    {devOtpNotice && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{devOtpNotice}</span>
                      </div>
                    )}

                    {otpError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}
                  </div>
                )}

                {otpError && !otpSent && (
                  <p className="text-[11px] text-rose-600 font-medium">{otpError}</p>
                )}

                <p className="text-[11px] text-slate-400">
                  Email pembeli harus aktif karena digunakan untuk masuk melalui <strong>Google Login</strong>. Kode OTP dikirimkan ke email untuk memastikan email valid.
                </p>
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

                {/* Alamat Pengiriman / Domisili */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Alamat Pengiriman / Domisili
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Jl. Trans Sulawesi No. 45, Kec. Kalawat, Minahasa Utara"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Alamat tujuan pengantaran saat pembeli memilih opsi pesanan diantar.
                  </p>
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
                    <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Pembeli'}</span>
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
