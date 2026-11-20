'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Jika sudah terotentikasi sebagai ADMIN, langsung arahkan ke /admin
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [status, session, router]);

  // Pesan error dari parameter query (mis. ditolak oleh callback signIn)
  const errorParam = searchParams.get('error');
  const urlErrorMessage =
    errorParam === 'unauthorized'
      ? 'Akses ditolak: Akun Google ini tidak terdaftar sebagai administrator aktif.'
      : errorParam
        ? 'Terjadi kendala saat masuk dengan Google. Silakan coba kembali.'
        : null;
  const shownError = errorMessage ?? urlErrorMessage;
  const isTimeout = searchParams.get('reason') === 'timeout';

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    try {
      setIsSubmitting(true);
      // Tandai bahwa login ini berasal dari portal admin (berlaku 5 menit)
      document.cookie = 'ksps_admin_login=1; Max-Age=300; Path=/; SameSite=Lax';
      await signIn('google', { callbackUrl: '/admin' });
    } catch (err) {
      console.error('Error saat login admin:', err);
      setErrorMessage('Terjadi kendala sistem. Silakan coba kembali.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col justify-center items-center px-4 py-10 sm:py-12 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="max-w-[420px] w-full">
        {/* Main Login Card (Matching Login User with 32px Radius & Taste Borders) */}
        <div className="w-full bg-white border border-[#dce1d6] rounded-[32px] p-7 sm:p-9 shadow-[0_4px_24px_rgba(26,38,16,0.04)]">
          {/* Top Centered Logo Badge with Dark Forest Green & Lime Emblem matching Login User */}
          <div className="w-14 h-14 rounded-2xl bg-[#233414] border border-[#344d15] flex items-center justify-center mx-auto mb-6 shadow-md shadow-[#233414]/15">
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
              Masuk ke Akun Admin
            </h1>
            <p className="text-[11.5px] sm:text-xs text-[#526046] mt-1.5 font-normal tracking-tight sm:whitespace-nowrap">
              Masuk dengan akun Google resmi pengurus Koperasi Sinar Pagi Sejahtera.
            </p>
          </div>

          {/* Sesi admin berakhir karena tidak aktif */}
          {isTimeout && !shownError && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#92400e] flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[13px]">Sesi Admin Berakhir</div>
                <p className="mt-0.5 leading-relaxed">
                  Anda otomatis keluar demi keamanan karena tidak ada aktivitas. Silakan masuk kembali.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert Box (Matching Login User) */}
          {shownError && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#ffedea] border border-red-200 text-[#831c1e] flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 text-[#c4242a] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#831c1e] text-[13px]">
                  Autentikasi Gagal
                </div>
                <p className="mt-0.5 text-[#831c1e] leading-relaxed text-xs">
                  {shownError}
                </p>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full h-11 sm:h-12 rounded-xl bg-[#233414] hover:bg-[#344d15] active:scale-[0.99] text-white font-semibold text-[13px] sm:text-sm flex items-center justify-center gap-3 transition-all duration-150 cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#D4F63D]" />
            ) : (
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
            )}
            <span>{isSubmitting ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
          </button>

          {/* Security Badge / Footer Notice matching Login User */}
          <div className="mt-8 pt-5 border-t border-[#eaede7] flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-1.5 text-xs text-[#526046] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#344d15]" />
              <span>Akses Terbatas • Portal Resmi Administrator Koperasi</span>
            </div>
            <p className="text-[11px] text-[#78886e]">
              Bukan administrator?{' '}
              <Link
                href="/login"
                className="text-[#233414] font-semibold underline underline-offset-2 hover:text-[#344d15]"
              >
                Masuk sebagai Anggota / Petani
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
