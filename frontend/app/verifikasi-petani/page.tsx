'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Clock,
  CheckCircle2,
  Sprout,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Phone,
  MapPin,
  Mail,
  User,
  MessageCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function VerifikasiPetaniPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    avatarUrl: string;
    role: string;
    isVerified: boolean;
    createdAt?: string;
  } | null>(null);

  // Fetch status profil terbaru dari database
  const checkStatus = async () => {
    try {
      setIsChecking(true);
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.user);
        if (data?.adminContact?.phone) {
          setAdminPhone(data.adminContact.phone);
        }
        // Jika belum onboarding, harus lengkapi identitas dulu
        if (!data.user.isOnboarded) {
          router.replace('/onboarding');
          return;
        }
        // Jika admin, arahkan ke dashboard admin
        if (data.user.role === 'ADMIN') {
          router.replace('/admin');
          return;
        }
        // Jika pembeli, langsung ke toko online
        if (data.user.role === 'PEMBELI') {
          router.replace('/toko');
          return;
        }
        // Jika petani sudah di-ACC oleh admin, langsung masuk ke portal toko/sewa alat
        if (data.user.role === 'PETANI' && data.user.isVerified) {
          router.replace('/toko');
          return;
        }
      }
    } catch (err) {
      console.error('Error saat memeriksa status verifikasi:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated') {
      checkStatus();
    }
  }, [status]);

  if (status === 'loading' || !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-slate-500 font-medium">Memeriksa status akun...</span>
        </div>
      </div>
    );
  }

  // Jika sudah terverifikasi
  if (profileData.role === 'PETANI' && profileData.isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-3 sm:px-4 py-6 sm:py-10">
        <div className="max-w-sm w-full bg-white border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
            Akun Petani Terverifikasi!
          </h1>
          <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
            Selamat, permohonan kemitraan Petani Anda telah resmi disetujui oleh pengurus Koperasi Sinar Pagi Sejahtera.
          </p>
          <button
            onClick={() => router.push('/toko')}
            className="w-full py-2 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] sm:text-xs transition cursor-pointer shadow-2xs"
          >
            Masuk ke Toko & Layanan Petani
          </button>
        </div>
      </div>
    );
  }

  const userInitial = (profileData.name || 'P').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
        {/* Brand Header Compact */}
        <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-2xs shrink-0">
              <Sprout className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Koperasi Sinar Pagi Sejahtera
              </h2>
              <p className="text-[10px] text-slate-500">Minahasa Utara • Kemitraan Petani</p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shrink-0">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>Tahap Verifikasi</span>
          </div>
        </div>

        {/* Main Status Banner Compact */}
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/70 border border-amber-200/80 mb-3 sm:mb-4">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Akun Petani Anda Masih Dalam Tahap Verifikasi
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Pendaftaran kemitraan Petani Anda telah diterima dan saat ini sedang dalam peninjauan resmi oleh Pengurus Koperasi Sinar Pagi Sejahtera Minahasa Utara.
              </p>
              <div className="mt-1 text-[10px] text-amber-800 font-medium">
                ⏱️ Proses verifikasi biasanya memerlukan waktu 1–2 hari kerja.
              </div>
            </div>
          </div>
        </div>

        {/* Identitas Terdaftar Compact */}
        <div className="space-y-1.5 mb-3 sm:mb-4">
          <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase tracking-wider px-0.5">
            Rincian Data Pendaftaran Anda
          </h3>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[10px] sm:text-[11px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                Nama Petani:
              </span>
              <div className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5 border border-slate-200">
                  {profileData.avatarUrl && (
                    <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
                  )}
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="font-bold text-slate-900 truncate max-w-[150px]">{profileData.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                Email Akun:
              </span>
              <span className="font-medium text-slate-800 truncate max-w-[170px]">{profileData.email}</span>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                Nomor WhatsApp:
              </span>
              <span className="font-semibold text-slate-800">{profileData.phone || '-'}</span>
            </div>

            <div className="flex items-start justify-between pt-0.5">
              <span className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                Alamat Domisili:
              </span>
              <span className="font-medium text-slate-800 truncate max-w-[170px] text-right">
                {profileData.address || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Compact */}
        <div className="space-y-1.5 sm:space-y-2">
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="w-full py-2 px-3 rounded-lg sm:rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa...' : 'Periksa Status Verifikasi Sekarang'}</span>
          </button>

          {(() => {
            const rawPhone = adminPhone || '081944078924';
            const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');
            return (
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `Halo Pengurus Koperasi Sinar Pagi Sejahtera, saya ${profileData.name} (${profileData.email}) ingin mengonfirmasi status verifikasi pendaftaran akun Petani saya.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-lg sm:rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs hover:border-emerald-500/40"
              >
                <MessageCircle className="w-3 h-3 text-emerald-600" />
                <span>Konfirmasi Cepat via WhatsApp Pengurus</span>
              </a>
            );
          })()}

          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.replace('/login');
            }}
            className="w-full py-1.5 px-3 text-[10px] sm:text-[11px] font-semibold text-slate-500 hover:text-red-600 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Keluar dari Akun (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
