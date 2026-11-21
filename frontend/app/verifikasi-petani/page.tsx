'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  LogOut,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function VerifikasiPetaniPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const hasInitializedRef = useRef(false);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isEnteringToko, setIsEnteringToko] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [lastCheckedMessage, setLastCheckedMessage] = useState<string | null>(null);
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
  const checkStatus = async (isManualCheck = false) => {
    try {
      setIsChecking(true);
      if (isManualCheck) {
        setLastCheckedMessage(null);
      }

      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.user);
        if (data?.adminContact?.phone) {
          setAdminPhone(data.adminContact.phone);
        }

        // Sinkronisasi status profil terbaru ke local storage
        try {
          localStorage.setItem('koperasi_auth_user', JSON.stringify(data.user));
          window.dispatchEvent(new CustomEvent('user-updated'));
        } catch {}

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
          window.location.replace('/toko');
          return;
        }
        // Jika petani sudah di-ACC oleh admin, update session lalu langsung masuk ke portal toko/sewa alat
        if (data.user.role === 'PETANI' && data.user.isVerified) {
          if (updateSession) {
            try {
              await updateSession({ user: data.user });
            } catch {}
          }
          window.location.replace('/toko');
          return;
        }

        if (isManualCheck) {
          const now = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setLastCheckedMessage(
            `Status diperbarui pukul ${now} — permohonan masih dalam peninjauan pengurus.`
          );
        }
      }
    } catch (err) {
      console.warn('Error saat memeriksa status verifikasi:', err);
    } finally {
      setIsChecking(false);
    }
  };

  // Keluar dari akun / kembali ke halaman login untuk ganti akun
  const handleLogoutOrSwitchAccount = async () => {
    try {
      setIsLoggingOut(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('koperasi_user');
        localStorage.removeItem('koperasi_auth_user');
        localStorage.removeItem('koperasi_token');
        localStorage.removeItem('koperasi_last_active');
      }
      await signOut({ redirect: false });
      window.location.replace('/login');
    } catch {
      window.location.replace('/login');
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      checkStatus(false);
    }
  }, [status, router]);

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#233414] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-[#344d15] font-medium">
            Memeriksa status verifikasi...
          </span>
        </div>
      </div>
    );
  }

  // Jika sudah terverifikasi
  if (profileData.role === 'PETANI' && profileData.isVerified) {
    const handleMasukToko = async () => {
      setIsEnteringToko(true);
      try {
        localStorage.setItem('koperasi_auth_user', JSON.stringify(profileData));
        window.dispatchEvent(new CustomEvent('user-updated'));
      } catch {}
      if (updateSession) {
        try {
          await updateSession({ user: profileData });
        } catch {}
      }
      window.location.replace('/toko');
    };

    return (
      <div className="min-h-screen bg-[#f4f5f1] flex flex-col justify-center items-center px-4 py-10 sm:py-12 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
        <div className="max-w-[440px] w-full bg-white border border-[#dce1d6] rounded-[32px] p-7 sm:p-9 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#233414] border border-[#344d15] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-7 h-7 text-[#D4F63D]" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-[#1a2610] tracking-tight leading-tight">
            Akun Petani Terverifikasi!
          </h1>
          <p className="text-[13px] sm:text-sm text-[#526046] mt-2 mb-7 leading-relaxed">
            Selamat, permohonan kemitraan Petani Anda telah resmi disetujui oleh pengurus Koperasi Sinar Pagi Sejahtera.
          </p>
          <button
            onClick={handleMasukToko}
            disabled={isEnteringToko}
            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-[13px] sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 group"
          >
            {isEnteringToko ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D4F63D]" />
                <span>Membuka Toko...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Toko & Layanan Petani</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const userInitial = (profileData.name || 'P').charAt(0).toUpperCase();
  const rawPhone = adminPhone || '081944078924';
  const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Halo Pengurus Koperasi Sinar Pagi Sejahtera, saya ${profileData.name} (${profileData.email}) ingin mengonfirmasi status verifikasi pendaftaran akun Mitra Petani saya.`
  )}`;

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col justify-center items-center px-4 py-10 sm:py-12 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="max-w-[440px] w-full">
        {/* Top Navigation: Kembali ke Login / Ganti Akun */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleLogoutOrSwitchAccount}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#344d15] hover:text-[#233414] px-3 py-1.5 rounded-full bg-[#EAEDE7] hover:bg-[#dfe4da] border border-[#d5dccf] transition-colors cursor-pointer disabled:opacity-60"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowLeft className="w-3.5 h-3.5" />
            )}
            <span>{isLoggingOut ? 'Mengalihkan...' : 'Kembali ke Login / Ganti Akun'}</span>
          </button>
        </div>

        {/* Main Card matching /login & /onboarding */}
        <div className="w-full bg-white border border-[#dce1d6] rounded-[32px] p-6 sm:p-9">
          {/* Top Centered Logo Badge matching /login & /onboarding */}
          <div className="w-14 h-14 rounded-2xl bg-[#233414] border border-[#344d15] flex items-center justify-center mx-auto mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/images/landing/koperasi-logo-lime.png"
              alt="Logo Koperasi Sinar Pagi Sejahtera"
              className="w-7 h-7 object-contain"
            />
          </div>

          {/* Headline & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#1a2610] tracking-tight leading-tight">
              Verifikasi Mitra Petani
            </h1>
            <p className="text-[13px] sm:text-sm text-[#526046] mt-2 font-normal">
              Koperasi Sinar Pagi Sejahtera ·{' '}
              <span className="font-semibold text-[#233414]">Minahasa Utara</span>
            </p>
          </div>

          {/* Status Banner */}
          <div className="p-4 rounded-2xl bg-[#fffbeb] border border-[#fde68a] mb-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#fef3c7] border border-[#fde68a] text-[#92400e] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[13px] sm:text-sm font-bold text-[#78350f] leading-snug">
                  Menunggu Persetujuan Pengurus
                </h2>
                <p className="text-[13px] text-[#92400e] mt-1 leading-relaxed">
                  Pendaftaran kemitraan Petani Anda telah diterima dan sedang ditinjau oleh pengurus koperasi.
                </p>
                <div className="mt-2.5 pt-2.5 border-t border-[#fde68a]/80 flex items-center gap-1.5 text-xs text-[#92400e] font-semibold">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Estimasi verifikasi 1–2 hari kerja</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Data Pendaftaran Ledger matching Step 4 Onboarding */}
          <div className="mb-5">
            <div className="text-xs font-bold text-[#344d15] uppercase tracking-wider mb-2 px-0.5">
              Rincian Data Pendaftaran
            </div>

            <div className="px-4 bg-[#f4f5f1] rounded-2xl border border-[#dce1d6] divide-y divide-[#dce1d6] text-[13px]">
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#526046] shrink-0">Nama Petani</span>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="w-5 h-5 border border-[#cfd6c9] shrink-0">
                    {profileData.avatarUrl ? (
                      <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
                    ) : null}
                    <AvatarFallback className="bg-[#233414] text-[#D4F63D] text-[10px] font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-[#1a2610] truncate">
                    {profileData.name}
                  </span>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#526046] shrink-0">Email Akun</span>
                <span className="font-medium text-[#233414] truncate">
                  {profileData.email}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#526046] shrink-0">Nomor WhatsApp</span>
                <span className="font-semibold text-[#1a2610] tabular-nums">
                  {profileData.phone || '—'}
                </span>
              </div>

              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-[#526046] shrink-0">Alamat Domisili</span>
                <span className="font-medium text-[#233414] text-right max-w-[220px] line-clamp-2">
                  {profileData.address || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback saat tombol Periksa Status ditekan */}
          {lastCheckedMessage && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#f4f5f1] border border-[#cfd6c9] text-xs text-[#233414] font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-[#344d15] shrink-0" />
              <span>{lastCheckedMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => checkStatus(true)}
              disabled={isChecking}
              className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-semibold text-[13px] sm:text-sm flex items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#D4F63D] ${isChecking ? 'animate-spin' : ''}`}
              />
              <span>
                {isChecking ? 'Memeriksa Status...' : 'Periksa Status Verifikasi Sekarang'}
              </span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 sm:h-12 px-4 rounded-xl border border-[#cfd6c9] bg-[#f4f5f1] hover:bg-[#EAEDE7] text-[#233414] font-semibold text-[13px] sm:text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#344d15]" />
              <span>Konfirmasi Cepat via WhatsApp Pengurus</span>
            </a>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLogoutOrSwitchAccount}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-[#5b6950] hover:text-[#c4242a] transition-colors cursor-pointer disabled:opacity-60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isLoggingOut ? 'Keluar dari akun...' : 'Keluar dari Akun (Logout)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
