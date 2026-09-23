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
  Sprout,
  AlertCircle,
  Loader2,
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      {/* Return to Home link */}
      <div className="max-w-md w-full mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        {/* Cooperative Brand Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center text-white mb-3 shadow-md shadow-emerald-700/20">
            <Sprout className="w-7 h-7 text-emerald-200" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Koperasi Sinar Pagi Sejahtera
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Minahasa Utara • Platform Agribisnis Terpadu
          </p>
        </div>

        {/* Login Instruction */}
        <div className="text-center mb-6">
          <h2 className="text-sm font-semibold text-slate-800">
            Masuk ke Akun Administrator
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gunakan kredensial pengurus terdaftar untuk mengakses panel admin.
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isSubmitting || isSuccess}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm shadow-xs transition cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Memverifikasi...</span>
              </>
            ) : isSuccess ? (
              <span>Mengalihkan...</span>
            ) : (
              <span>Masuk ke Panel Administrasi</span>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Akses Terbatas • Portal Resmi Administrator Koperasi</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
