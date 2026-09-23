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
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Memeriksa status akun...</span>
        </div>
      </div>
    );
  }

  // Jika sudah terverifikasi
  if (profileData.role === 'PETANI' && profileData.isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-emerald-200 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Akun Petani Terverifikasi!
          </h1>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Selamat, permohonan kemitraan Petani Anda telah resmi disetujui oleh pengurus Koperasi Sinar Pagi Sejahtera.
          </p>
          <button
            onClick={() => router.push('/toko')}
            className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
          >
            Masuk ke Toko & Layanan Petani
          </button>
        </div>
      </div>
    );
  }

  const userInitial = (profileData.name || 'P').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <Sprout className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Koperasi Sinar Pagi Sejahtera
              </h2>
              <p className="text-[11px] text-slate-500">Minahasa Utara • Kemitraan Petani</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Tahap Verifikasi</span>
          </div>
        </div>

        {/* Main Status Banner */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 mb-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-snug">
                Akun Petani Anda Masih Dalam Tahap Verifikasi
              </h1>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pendaftaran kemitraan Petani Anda telah diterima dan saat ini sedang dalam peninjauan resmi oleh Pengurus Koperasi Sinar Pagi Sejahtera Minahasa Utara.
              </p>
              <div className="mt-2 text-[11px] text-amber-800 font-medium">
                ⏱️ Proses verifikasi biasanya memerlukan waktu 1–2 hari kerja.
              </div>
            </div>
          </div>
        </div>

        {/* Identitas Terdaftar */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Rincian Data Pendaftaran Anda
          </h3>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nama Petani:
              </span>
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 border border-slate-200">
                  {profileData.avatarUrl && (
                    <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
                  )}
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="font-bold text-slate-900">{profileData.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Akun:
              </span>
              <span className="font-semibold text-slate-800">{profileData.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Nomor WhatsApp:
              </span>
              <span className="font-semibold text-slate-800">{profileData.phone || '-'}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Alamat Domisili:
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[260px] text-right">
                {profileData.address || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa ke Server...' : 'Periksa Status Verifikasi Sekarang'}</span>
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
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:border-emerald-500/40"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Konfirmasi Cepat via WhatsApp Pengurus</span>
              </a>
            );
          })()}

          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.replace('/login');
            }}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari Akun (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
