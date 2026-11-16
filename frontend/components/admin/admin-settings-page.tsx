'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  User,
  LocateFixed,
} from 'lucide-react';
import { validateIndonesianPhone } from '@/lib/phone-validation';

type Notice = { type: 'success' | 'error'; text: string } | null;

const iconClass = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none';

const inputClass =
  'w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 transition';

export function AdminSettingsPage() {
  const { data: session, update } = useSession();
  const sessionUser = session?.user as
    | { name?: string | null; email?: string | null; image?: string | null; avatarUrl?: string | null; phone?: string | null }
    | undefined;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [initial, setInitial] = useState({ name: '', phone: '', address: '', avatarUrl: '' });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const email = sessionUser?.email || '';

  useEffect(() => {
    let active = true;
    fetch('/api/admin/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.user) return;
        const next = {
          name: data.user.name || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          avatarUrl: data.user.avatarUrl || '',
        };
        setInitial(next);
        setName(next.name);
        setPhone(next.phone);
        setAddress(next.address);
        setAvatarUrl(next.avatarUrl);
      })
      .catch(() => {
        if (active) setNotice({ type: 'error', text: 'Gagal memuat data profil. Coba muat ulang halaman.' });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isDirty =
    name !== initial.name ||
    phone !== initial.phone ||
    address !== initial.address ||
    avatarUrl !== initial.avatarUrl;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'Format file tidak didukung. Pilih gambar JPG, PNG, atau WebP.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Ukuran foto maksimal 5 MB.' });
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setNotice(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('email', email);

      const res = await fetch('/api/upload/profile', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Gagal mengunggah foto profil.');

      setAvatarUrl(data.url);
      setAvatarFailed(false);
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Gagal mengunggah foto profil.' });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Isi alamat gudang dari posisi GPS perangkat saat ini
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setNotice({ type: 'error', text: 'Peramban Anda tidak mendukung deteksi lokasi.' });
      return;
    }

    setIsLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (!res.ok || !data?.address) throw new Error();
          setAddress(data.address);
          setNotice({ type: 'success', text: 'Alamat diisi dari lokasi Anda saat ini. Periksa lalu simpan.' });
        } catch {
          setNotice({ type: 'error', text: 'Lokasi ditemukan, tetapi alamatnya gagal dibaca. Isi alamat secara manual.' });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setNotice({
          type: 'error',
          text:
            err.code === 1
              ? 'Izin lokasi ditolak. Izinkan akses lokasi di peramban lalu coba lagi.'
              : 'Gagal mendeteksi lokasi. Pastikan GPS aktif atau isi alamat secara manual.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleReset = () => {
    setName(initial.name);
    setPhone(initial.phone);
    setAddress(initial.address);
    setAvatarUrl(initial.avatarUrl);
    setAvatarFailed(false);
    setNotice(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!name.trim()) {
      setNotice({ type: 'error', text: 'Nama administrator tidak boleh kosong.' });
      return;
    }
    if (phone.trim()) {
      const phoneVal = validateIndonesianPhone(phone.trim(), false);
      if (!phoneVal.isValid) {
        setNotice({ type: 'error', text: phoneVal.error || 'Nomor telepon tidak valid.' });
        return;
      }
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Gagal menyimpan perubahan.');

      const saved = {
        name: data.user?.name ?? name.trim(),
        phone: data.user?.phone ?? phone.trim(),
        address: data.user?.address ?? address.trim(),
        avatarUrl: data.user?.avatarUrl ?? avatarUrl,
      };
      setInitial(saved);
      setName(saved.name);
      setPhone(saved.phone);
      setAddress(saved.address);
      setAvatarUrl(saved.avatarUrl);

      // Segarkan sesi agar nama & foto di sidebar ikut berubah
      await update({ user: { name: saved.name, avatarUrl: saved.avatarUrl, phone: saved.phone } });
      setNotice({ type: 'success', text: 'Perubahan berhasil disimpan.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSaving(false);
    }
  };

  const displayAvatar = avatarUrl && !avatarFailed ? avatarUrl : '';
  const initialLetter = (name || sessionUser?.name || 'A').trim().charAt(0).toUpperCase();

  return (
    <form onSubmit={handleSave} className="max-w-5xl mx-auto w-full space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Pengaturan Akun</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Kelola identitas pengurus dan lokasi gudang koperasi.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
        {/* Account summary */}
        <aside className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] lg:sticky lg:top-20">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-3xl font-semibold text-slate-600">
                {displayAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatar}
                    alt="Foto profil"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initialLetter
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                title="Ganti foto profil"
                className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center ring-4 ring-white hover:bg-slate-700 transition cursor-pointer disabled:opacity-60"
              >
                {isUploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>

            <div className="mt-4 w-full min-w-0">
              <div className="font-semibold text-slate-900 truncate" title={name}>
                {isLoading ? '…' : name || 'Administrator'}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5" title={email}>
                {email}
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Administrator
            </div>

            <div className="mt-5 flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="font-semibold text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-60"
              >
                {isUploadingPhoto ? 'Mengunggah…' : 'Ganti foto'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">JPG, PNG, atau WebP. Maks. 5 MB.</p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </span>
            <div className="text-xs">
              <div className="font-semibold text-slate-800">Masuk dengan Google</div>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Keamanan akun dan kata sandi dikelola melalui akun Google koperasi.
              </p>
            </div>
          </div>
        </aside>

        <div className="space-y-6 min-w-0">
          {/* Profile section */}
          <section className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <header className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-[15px] font-semibold text-slate-900">Informasi Profil</h2>
              <p className="text-xs text-slate-500 mt-0.5">Nama dan kontak yang tampil sebagai pengurus koperasi.</p>
            </header>
            <div className="p-6 grid gap-5 sm:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="admin-name" className="sm:col-span-2">
                <User className={iconClass} />
                <input
                  id="admin-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  placeholder="Nama pengurus"
                  className={inputClass}
                />
              </Field>

              <Field label="Email" htmlFor="admin-email" hint="Terhubung dengan akun Google, tidak dapat diubah.">
                <Mail className={iconClass} />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  disabled
                  className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`}
                />
              </Field>

              <Field label="Nomor telepon / WhatsApp" htmlFor="admin-phone">
                <Phone className={iconClass} />
                <input
                  id="admin-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  placeholder="0812xxxxxxxx"
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          {/* Warehouse section */}
          <section className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <header className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-[15px] font-semibold text-slate-900">Kantor & Gudang Koperasi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dipakai sebagai lokasi ambil pesanan saat pembeli checkout di toko online.
              </p>
            </header>
            <div className="p-6">
              <Field
                label="Alamat lengkap"
                htmlFor="admin-address"
                action={
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating || isLoading}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-[11.5px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer disabled:opacity-60"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LocateFixed className="w-3.5 h-3.5" />
                    )}
                    {isLocating ? 'Mendeteksi lokasi…' : 'Gunakan lokasi sekarang'}
                  </button>
                }
              >
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <textarea
                  id="admin-address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isLoading}
                  placeholder="Jl. Raya Kolongan, Kec. Kalawat, Kab. Minahasa Utara, Sulawesi Utara"
                  className={`${inputClass} h-auto py-2.5 resize-none leading-relaxed`}
                />
              </Field>
            </div>
          </section>
        </div>
      </div>

      {/* Save bar */}
      <div
        className={`sticky bottom-4 z-30 flex justify-end transition-all duration-200 ${
          isDirty ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-4 py-2.5 shadow-lg">
          <span className="text-xs text-slate-600 whitespace-nowrap">Ada perubahan yang belum disimpan</span>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSaving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>

    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  action,
  className = '',
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-1.5 min-h-7">
        <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-700">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">{children}</div>
      {hint && <p className="text-[11px] text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}
