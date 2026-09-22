'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import MainFooter from '@/components/MainFooter';
import { CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [activeSection] = useState<'beranda' | 'toko' | 'alsintan'>('beranda');

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
