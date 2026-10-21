'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  LogIn,
} from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Jika sudah terotentikasi sebagai ADMIN, langsung arahkan ke /admin
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [status, session, router]);

  // Tangkap parameter query error jika ada
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setErrorMessage('Akses ditolak: Akun Anda tidak memiliki hak akses administrator.');
    } else if (errorParam === 'CredentialsSignin') {
      setErrorMessage('Email atau kata sandi administrator tidak valid.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Silakan isi email administrator dan kata sandi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signIn('admin-credentials', {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage('Email atau kata sandi salah, atau akun Anda bukan admin.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = '/admin';
      }, 300);
    } catch (err) {
      console.error('Error saat login admin:', err);
      setErrorMessage('Terjadi kendala sistem. Silakan coba kembali.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex flex-col justify-center items-center px-4 py-10 sm:py-12 font-sans selection:bg-[#D4F63D] selection:text-slate-950">
      <div className="max-w-[420px] w-full">
        {/* Back to Beranda Link (Matching Login User) */}
        <div className="mb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#344d15] hover:text-[#233414] px-3.5 py-1.5 rounded-full bg-[#EAEDE7] hover:bg-[#dfe4da] border border-[#d5dccf] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAEDE7] border border-[#d5dccf] text-[11px] font-bold text-[#233414] mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#344d15]" />
              <span>Portal Pengurus Administrator</span>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#1a2610] tracking-tight leading-tight">
              Masuk ke Akun Admin
            </h1>
            <p className="text-[13px] sm:text-sm text-[#526046] mt-2 font-normal leading-relaxed">
              Gunakan kredensial resmi pengurus Koperasi Sinar Pagi Sejahtera.
            </p>
          </div>

          {/* Error Alert Box (Matching Login User) */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#ffedea] border border-red-200 text-[#831c1e] flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 text-[#c4242a] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#831c1e] text-[13px]">
                  Autentikasi Gagal
                </div>
                <p className="mt-0.5 text-[#831c1e] leading-relaxed text-xs">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1a2610] mb-1.5">
                Email Administrator
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sinarpagisejahtera.co.id"
                disabled={isSubmitting || isSuccess}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-[#cfd6c9] bg-[#fafbf9] text-[#1a2610] text-[13px] sm:text-sm placeholder:text-[#88967d] focus:bg-white focus:outline-none focus:border-[#233414] focus:ring-2 focus:ring-[#233414]/15 transition-all disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a2610] mb-1.5">
                Kata Sandi
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting || isSuccess}
                  className="w-full pl-4 pr-11 py-2.5 sm:py-3 rounded-xl border border-[#cfd6c9] bg-[#fafbf9] text-[#1a2610] text-[13px] sm:text-sm placeholder:text-[#88967d] focus:bg-white focus:outline-none focus:border-[#233414] focus:ring-2 focus:ring-[#233414]/15 transition-all disabled:opacity-60 [::-ms-reveal]:hidden [::-ms-clear]:hidden"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((prev) => !prev);
                  }}
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-2.5 p-1.5 rounded-lg text-[#708063] hover:text-[#1a2610] hover:bg-[#EAEDE7] transition cursor-pointer z-20 flex items-center justify-center select-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Action Button: Deep Forest Olive Green matching Beranda & Login User */}
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="w-full mt-2 h-11 sm:h-12 rounded-xl bg-[#233414] hover:bg-[#344d15] active:scale-[0.99] text-white font-semibold text-[13px] sm:text-sm flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4F63D]" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#D4F63D]" />
                  <span>Mengalihkan ke Panel Admin...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#D4F63D]" />
                  <span>Masuk ke Panel Administrasi</span>
                </>
              )}
            </button>
          </form>

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
