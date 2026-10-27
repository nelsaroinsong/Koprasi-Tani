'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import NotFoundIllustration from '@/components/NotFoundIllustration';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Catat log error sistem
    console.error('Application Error caught by error boundary:', error);

    // Auto-recovery jika ChunkLoadError terjadi akibat rebuild/hot-reload file dev server
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('ChunkLoadError');

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem('chunk_reload_ts', now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <main className="h-screen max-h-screen w-full overflow-hidden bg-white flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center">
        {/* Illustration */}
        <div className="w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] mb-3 sm:mb-4 transition-transform duration-300 hover:scale-[1.02]">
          <NotFoundIllustration className="w-full h-auto max-h-[30vh] object-contain" />
        </div>

        {/* Text Group */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight mb-1 sm:mb-1.5">
          Oops!
        </h1>

        <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-800 tracking-tight mb-1.5 sm:mb-2">
          Terjadi Gangguan Sistem
        </h2>

        <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed max-w-sm sm:max-w-md mx-auto mb-5 sm:mb-6">
          Halaman mengalami kendala tak terduga saat memuat data. Silakan coba muat ulang atau kembali ke halaman beranda.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:scale-95 rounded-xl border border-neutral-300 transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
            <span>Coba Lagi</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-95 rounded-xl shadow-xs transition-all duration-200"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-200" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
