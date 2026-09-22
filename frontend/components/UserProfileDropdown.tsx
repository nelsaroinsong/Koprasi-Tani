'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  Receipt,
  CreditCard,
  LogOut,
  ChevronRight,
  ShoppingCart,
  X,
  Phone,
  Camera,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function UserProfileDropdown() {
  const { user, logout, updateProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync edit form with current user on modal open
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '+62 812-4455-6677');
      setEditAvatar(user.avatarUrl || '');
      setSelectedFile(null);
      setUploadError(null);
    }
  }, [user, activeModal]);

  // Handle local avatar image selection
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload ke R2 & Simpan Profil
  const handleSaveProfile = async () => {
    setIsUploading(true);
    setUploadError(null);
    let finalAvatarUrl = editAvatar;

    try {
      if (selectedFile) {
        // Upload langsung ke Cloudflare R2 bucket koperasi-images/profiles/
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (user?.email) {
          formData.append('email', user.email);
        }

        const res = await fetch('/api/upload/profile', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Gagal mengunggah foto ke Cloudflare R2');
        }

        finalAvatarUrl = data.url;
      }

      // Simpan perubahan ke auth context & session
      updateProfile({
        name: editName,
        phone: editPhone,
        avatarUrl: finalAvatarUrl,
      });

      setActiveModal(null);
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah foto ke R2.');
    } finally {
      setIsUploading(false);
    }
  };

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const displayRole = user.role === 'PETANI' ? 'PETANI' : 'PEMBELI';
  const roleSubtitle =
    user.role === 'PETANI'
      ? 'Petani Kelapa & Jagung'
      : 'Pembeli Komoditas & Hasil Tani';

  const registeredDate = '22 September 2026';
  const userIdDisplay = user.id ? `KK-${user.id.slice(-5).toUpperCase()}` : 'KK-03721';

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
        {/* Tombol Keranjang Belanja di sebelah kiri foto profil */}
        <button
          onClick={() => setActiveModal('cart')}
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 flex items-center justify-center transition border border-slate-200 cursor-pointer shadow-2xs"
          title="Keranjang Belanja"
          type="button"
        >
          <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs ring-2 ring-white">
              {cartCount}
            </span>
          )}
        </button>

        {/* Profile Trigger Pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 sm:gap-2.5 p-1 sm:pr-3 rounded-full border border-slate-200 hover:border-emerald-500/50 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs group"
          type="button"
        >
          {/* Avatar circle */}
          <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>

          {/* User info */}
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-800 leading-tight group-hover:text-emerald-800 transition">
              {user.name}
            </div>
            <div className="text-[10px] font-bold text-emerald-700 tracking-wider">
              {displayRole}
            </div>
          </div>

          {/* Chevron */}
          <div className="text-slate-400 group-hover:text-slate-700 transition pr-1">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {/* Dropdown Card */}
        {isOpen && (
          <div className="absolute right-3 sm:right-6 top-16 sm:top-20 z-50 w-[320px] sm:w-[350px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Dark Forest Green Header */}
            <div className="bg-[#1b4332] text-white p-5 relative overflow-hidden">
              {/* Subtle decorative glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl" />

              {/* Role badge top right */}
              <div className="flex justify-between items-start mb-4 relative z-10">
                {/* Avatar with verified check */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-extrabold text-xl shadow-md overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs ring-2 ring-[#1b4332]">
                    <CheckCircle2 className="w-3.5 h-3.5 fill-amber-500 text-white" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 backdrop-blur-xs text-[11px] font-bold text-emerald-100 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{displayRole}</span>
                </div>
              </div>

              {/* Name & Phone Number */}
              <div className="relative z-10 mb-4">
                <h3 className="text-base font-bold tracking-tight text-white leading-tight">
                  {user.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 mt-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>{user.phone || '+62 812-4455-6677'}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-300/80 mt-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>Minahasa Utara, Sulawesi Utara</span>
                </div>
              </div>

              {/* Registered Meta (ID User dihapus) */}
              <div className="pt-2.5 border-t border-emerald-700/60 flex items-center justify-between text-xs text-emerald-100/90 relative z-10">
                <span className="text-[11px] text-emerald-300/80 font-medium">Terdaftar</span>
                <span className="font-bold text-xs text-emerald-100">{registeredDate}</span>
              </div>
            </div>

            {/* Menu List */}
            <div className="p-3.5 space-y-1">
              {/* 1. Edit Profil */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveModal('edit-profile');
                }}
                className="w-full p-2.5 rounded-2xl hover:bg-slate-50 flex items-center justify-between group transition cursor-pointer text-left"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Edit Profil</div>
                    <div className="text-[11px] text-slate-400">Ubah info pribadi & alamat</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
              </button>

              {/* 2. Riwayat Pembelian */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveModal('riwayat');
                }}
                className="w-full p-2.5 rounded-2xl hover:bg-slate-50 flex items-center justify-between group transition cursor-pointer text-left"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Riwayat Pembelian</div>
                    <div className="text-[11px] text-slate-400">Daftar transaksi & status pesanan</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
              </button>

              {/* 3. Metode Pembayaran */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveModal('pembayaran');
                }}
                className="w-full p-2.5 rounded-2xl hover:bg-slate-50 flex items-center justify-between group transition cursor-pointer text-left"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Metode Pembayaran</div>
                    <div className="text-[11px] text-slate-400">QRIS, Transfer Bank & e-Wallet</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
              </button>

              {/* Divider & Logout */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full p-2.5 rounded-2xl hover:bg-red-50 text-red-600 flex items-center justify-center gap-2 font-semibold text-xs transition cursor-pointer"
                  type="button"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Modal for Selected Menu Item */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>

            {activeModal === 'cart' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Keranjang Belanja</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Daftar komoditas yang siap Anda checkout dari Koperasi Sinar Pagi Sejahtera.
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
                  <div className="font-semibold text-slate-800">Kelapa Butir Grade A (Minahasa Utara)</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">50 butir • Rp 250.000</div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs transition"
                >
                  Tutup Keranjang
                </button>
              </div>
            )}

            {activeModal === 'edit-profile' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Profil Akun</h3>
                <p className="text-xs text-slate-500 mb-5">
                  Perbarui foto profil, nama lengkap, dan nomor kontak Anda.
                </p>

                {/* Photo Profile Editor */}
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-emerald-500 overflow-hidden">
                      {editAvatar ? (
                        <img src={editAvatar} alt="Foto Profil" className="w-full h-full object-cover" />
                      ) : (
                        <span>{userInitial}</span>
                      )}
                    </div>

                    {/* Camera Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md ring-2 ring-white cursor-pointer transition"
                      title="Ganti Foto Profil"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />

                  {/* Photo Action Buttons */}
                  <div className="flex items-center gap-3 mt-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      Unggah Foto Baru
                    </button>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar('')}
                        className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      disabled
                      defaultValue={user.email}
                      className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor WhatsApp / Telepon</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+62 812-xxxx-xxxx"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {uploadError && (
                  <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                    {uploadError}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleSaveProfile}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition cursor-pointer shadow-xs"
                >
                  {isUploading ? 'Mengunggah Foto ke Cloudflare R2...' : 'Simpan Perubahan'}
                </button>
              </div>
            )}

            {activeModal === 'riwayat' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Riwayat Pembelian</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Daftar transaksi pembelian hasil tani dan pemesanan yang pernah Anda lakukan.
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-center text-xs text-slate-500">
                  Belum ada transaksi sebelumnya. Pesanan Anda akan muncul di sini.
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs transition"
                >
                  Tutup
                </button>
              </div>
            )}

            {activeModal === 'pembayaran' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Metode Pembayaran</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Pilihan metode pembayaran untuk pembelian komoditas Koperasi Sinar Pagi Sejahtera.
                </p>
                <div className="space-y-2 mb-5 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <span className="font-semibold text-slate-800">QRIS Koperasi (Instan)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Aktif</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Transfer Bank (BRI / BNI / Mandiri)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Aktif</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs transition"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
