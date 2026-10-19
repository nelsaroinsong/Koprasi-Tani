'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

function LoginContent() {
  const { loginWithGoogle, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get('reason') === 'timeout';
  const isBlockedAdmin = searchParams.get('error') === 'AdminBlocked';

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col justify-center items-center px-4 py-10 sm:py-12 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="max-w-[420px] w-full">
        {/* Back to Beranda Link */}
        <div className="mb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#344d15] hover:text-[#233414] px-3 py-1.5 rounded-full bg-[#EAEDE7] hover:bg-[#dfe4da] border border-[#d5dccf] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Main Login Card */}
        <div className="w-full bg-white border border-[#dce1d6] rounded-[32px] p-7 sm:p-9">
          {/* Top Centered Logo Badge with Dark Forest Green & Lime Emblem matching Beranda */}
          <div className="w-14 h-14 rounded-2xl bg-[#233414] border border-[#344d15] flex items-center justify-center mx-auto mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/koperasi-logo-lime.png"
              alt="Logo Koperasi Sinar Pagi Sejahtera"
              className="w-7 h-7 object-contain"
            />
          </div>

          {/* Headline & Subtitle */}
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#1a2610] tracking-tight leading-tight">
              Selamat Datang!
            </h1>
            <p className="text-[13px] sm:text-sm text-[#526046] mt-2 font-normal">
              Baru di sini?{' '}
              <span className="font-semibold text-[#233414]">Masuk otomatis via Google</span>
            </p>
          </div>

          {/* Inactivity Timeout Alert Notice */}
          {isTimeout && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#92400e] flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#92400e] text-[13px]">Sesi Login Berakhir</div>
                <p className="mt-0.5 text-[#92400e] leading-relaxed text-xs">
                  Sistem otomatis keluar demi keamanan. Silakan masuk kembali dengan Google.
                </p>
              </div>
            </div>
          )}

          {/* Admin Login Attempt Alert Notice */}
          {isBlockedAdmin && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#ffedea] border border-red-200 text-[#831c1e] flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 text-[#c4242a] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#831c1e] text-[13px]">
                  Akses Khusus Administrator
                </div>
                <p className="mt-0.5 text-[#831c1e] leading-relaxed text-xs">
                  Portal ini untuk anggota dan pembeli. Administrator silakan login melalui portal admin.
                </p>
              </div>
            </div>
          )}

          {/* Primary Action Button: Deep Forest Olive Green matching Beranda */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-11 sm:h-12 rounded-xl bg-[#233414] hover:bg-[#344d15] text-white font-medium text-[13px] sm:text-sm flex items-center justify-center gap-3 transition-colors duration-150 active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              {/* Google G Logo SVG inside white badge for contrast on dark forest button */}
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </span>
              <span className="font-semibold">
                {isLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
              </span>
            </button>
          </div>

          {/* Legal Agreement / Terms notice */}
          <p className="mt-8 text-center text-xs text-[#5b6950] leading-relaxed max-w-xs mx-auto">
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center" />}>
      <LoginContent />
    </Suspense>
  );
}
