'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface KelompokTaniOption {
  id: string;
  nama: string;
  desa: string;
  kecamatan: string;
  komoditasUtama: string;
}

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
    kelompokTaniId?: string | null;
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
  const [kelompokTaniId, setKelompokTaniId] = useState('');
  const [isVerified, setIsVerified] = useState(role === 'PEMBELI');
  const [kelompokTaniList, setKelompokTaniList] = useState<KelompokTaniOption[]>([]);

  const [isLoadingPoktan, setIsLoadingPoktan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch kelompok tani list if role is PETANI
  useEffect(() => {
    if (role === 'PETANI') {
      setIsLoadingPoktan(true);
      fetch('/api/admin/kelompok-tani')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && Array.isArray(data.kelompokTani)) {
            setKelompokTaniList(data.kelompokTani);
          }
        })
        .catch((err) => console.error('Error fetching poktan:', err))
        .finally(() => setIsLoadingPoktan(false));
    }
  }, [role]);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (mode === 'EDIT' && initialData) {
        setName(initialData.name || '');
        setEmail(initialData.email || '');
        setPhone(initialData.phone || '');
        setKelompokTaniId(initialData.kelompokTaniId || '');
        setIsVerified(initialData.isVerified ?? (role === 'PEMBELI'));
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setKelompokTaniId('');
        setIsVerified(role === 'PEMBELI');
      }
    }
  }, [isOpen, mode, initialData, role]);

  // Form Validation & Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Validasi 1: Nama wajib diisi
    if (!cleanName) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }

    // Validasi 2: Format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Format email tidak valid.');
      return;
    }

    // Validasi 3: Nomor Telepon
    if (cleanPhone && cleanPhone.length < 8) {
      setErrorMessage('Nomor telepon minimal 8 digit angka.');
      return;
    }

    try {
      setIsSubmitting(true);

      const endpoint = '/api/admin/users';
      const method = mode === 'CREATE' ? 'POST' : 'PUT';
      const payload = {
        ...(mode === 'EDIT' && { id: initialData?.id }),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || null,
        role,
        isVerified,
        ...(role === 'PETANI' && {
          kelompokTaniId: kelompokTaniId || null,
        }),
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

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submit user form:', err);
      setErrorMessage(err.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleTitle = role === 'PETANI' ? 'Petani' : 'Pembeli';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-xl">
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
              : `Perbarui informasi akun ${roleTitle.toLowerCase()} yang tersimpan di sistem.`}
          </DialogDescription>
        </DialogHeader>

        {/* Validation Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
          {/* Nama */}
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
                placeholder="0812-xxxx-xxxx"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Pilihan Kelompok Tani khusus Petani */}
          {role === 'PETANI' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelompok Tani Binaan (Minahasa Utara)
              </label>
              <div className="relative">
                <MapPin className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={kelompokTaniId}
                  onChange={(e) => setKelompokTaniId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition cursor-pointer"
                >
                  <option value="">-- Petani Mandiri (Belum Ada Poktan) --</option>
                  {kelompokTaniList.map((poktan) => (
                    <option key={poktan.id} value={poktan.id}>
                      {poktan.nama} (Desa {poktan.desa}, Kec. {poktan.kecamatan})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status Verifikasi */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800">Status Keanggotaan</span>
              <p className="text-[11px] text-slate-500">
                {isVerified ? 'Akun telah terverifikasi resmi oleh pengurus' : 'Akun masih menunggu proses verifikasi'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVerified(!isVerified)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
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
              disabled={isSubmitting}
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
  );
}
