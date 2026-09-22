'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import MainFooter from '@/components/MainFooter';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeSection] = useState<'beranda' | 'toko' | 'alsintan'>('beranda');

  // Jika sudah login, beranda otomatis diarahkan ke Toko Online
  useEffect(() => {
    if (!isLoading && user) {
      if (!user.role) {
        router.replace('/onboarding');
      } else {
        router.replace('/toko');
      }
    }
  }, [user, isLoading, router]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleOpenModal = (type: 'toko' | 'alsintan') => {
    if (type === 'toko') {
      alert('Layanan Toko Online Komoditas sedang dalam penyesuaian.');
    } else if (type === 'alsintan') {
      alert('Layanan Sewa Alsintan & Traktor sedang dalam penyesuaian.');
    }
  };

  // Jika user sudah login atau sedang memvalidasi sesi, jangan render beranda agar tidak ada flash
  if (isLoading || user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500">Memuat Toko Online...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dot-pattern text-slate-800 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenModal={handleOpenModal}
        activeSection={activeSection}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          onJoinKoperasi={() => showToast('Pendaftaran anggota Koperasi Sinar Pagi Sejahtera segera dibuka!')}
          onExploreToko={() => handleOpenModal('toko')}
          onSewaAlsintan={() => handleOpenModal('alsintan')}
          onBookingBanner={() => handleOpenModal('alsintan')}
        />
      </main>

      {/* Footer */}
      <MainFooter
        onNavClick={(target) => handleOpenModal(target)}
      />
    </div>
  );
}
