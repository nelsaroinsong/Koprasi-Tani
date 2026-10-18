'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      {/* Main Login Card */}
      <div className="max-w-[390px] w-full bg-white border border-neutral-150 rounded-[32px] p-8 sm:p-9 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
        
        {/* Top Centered Logo Badge with Image 3 (K-leaf emblem) */}
        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center mx-auto mb-6 shadow-[0_8px_25px_rgba(0,0,0,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/koperasi-logo-trans.png"
            alt="Logo Koperasi Sinar Pagi Sejahtera"
            className="w-7 h-7 object-contain"
          />
        </div>

        {/* Headline & Subtitle matching Image 2 */}
        <div className="text-center mb-7">
          <h1 className="text-2xl sm:text-[26px] font-bold text-neutral-900 tracking-tight leading-tight">
            Selamat Datang!
          </h1>
          <p className="text-xs sm:text-[13px] text-neutral-500 mt-2 font-normal">
            Baru di sini? <span className="font-semibold text-neutral-900">Masuk otomatis via Google</span>
          </p>
        </div>

        {/* Inactivity Timeout Alert Notice */}
        {isTimeout && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-950 text-xs">Sesi Login Berakhir</div>
              <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">
                Sistem otomatis keluar demi keamanan. Silakan masuk kembali dengan Google.
              </p>
            </div>
          </div>
        )}

        {/* Admin Login Attempt Alert Notice */}
        {isBlockedAdmin && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-950 flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-950 text-xs">Akses Khusus Administrator</div>
              <p className="mt-0.5 text-red-800 leading-relaxed text-[11px]">
                Portal ini untuk anggota dan pembeli. Administrator silakan login melalui portal admin.
              </p>
            </div>
          </div>
        )}

        {/* Primary Action Button: Solid Black Button matching Image 2 with Google Auth */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-11 sm:h-12 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow transition-all duration-150 active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            {/* Google G Logo SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span className="font-semibold">{isLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
          </button>
        </div>

        {/* Legal Agreement / Terms notice matching Image 2 */}
        <p className="mt-8 text-center text-[11px] text-neutral-400 leading-relaxed max-w-[280px] sm:max-w-xs mx-auto">
          Dengan melanjutkan, Anda menyetujui{' '}
          <span className="text-neutral-700 underline underline-offset-2 hover:text-neutral-950 cursor-pointer">Ketentuan Layanan</span>{' '}
          dan{' '}
          <span className="text-neutral-700 underline underline-offset-2 hover:text-neutral-950 cursor-pointer">Kebijakan Privasi</span>{' '}
          Koperasi Sinar Pagi Sejahtera.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center" />}>
      <LoginContent />
    </Suspense>
  );
}
