'use client';

import { useEffect } from 'react';

/**
 * Komponen recovery otomatis untuk ChunkLoadError pada Next.js Webpack.
 * Terjadi saat kode baru di-compile ulang oleh dev server sementara tab browser
 * pengguna masih memegang manifest/hash chunk versi sebelumnya.
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    const handleChunkError = (message?: string) => {
      if (!message) return;
      if (
        message.includes('Loading chunk') ||
        message.includes('ChunkLoadError') ||
        message.includes('Failed to fetch dynamically imported module')
      ) {
        const lastReload = sessionStorage.getItem('chunk_recovery_reload');
        const now = Date.now();
        // Cegah loop tak berujung (minimal selang 8 detik)
        if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
          sessionStorage.setItem('chunk_recovery_reload', now.toString());
          window.location.reload();
        }
      }
    };

    const onError = (event: ErrorEvent) => {
      handleChunkError(event?.message || event?.error?.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleChunkError(event?.reason?.message || String(event?.reason));
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
