import type { MetadataRoute } from 'next';

/** Web App Manifest: web bisa dipasang di layar utama HP seperti aplikasi */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Koperasi Sinar Pagi Sejahtera',
    short_name: 'Koperasi Tani',
    description: 'Belanja hasil panen, sewa alat pertanian, dan bagi hasil petani Koperasi Sinar Pagi Sejahtera — Minahasa Utara.',
    // Buka dari beranda (bukan /toko yang mengarahkan tamu ke halaman login)
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff', // latar layar pembuka, serasi dengan ikon
    theme_color: '#233414',
    lang: 'id',
    categories: ['shopping', 'business', 'food'],
    icons: [
      // Pakai PNG transparan (purpose: 'any') agar splash screen Android tampil bersih tanpa bingkai abu-abu
      // dan ukuran logo tetap proporsional (tidak ikut di-zoom 1.5x oleh maskable adaptive icon).
      { src: '/icons/icon-192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Toko Panen', url: '/toko', icons: [{ src: '/icons/icon-192.png?v=3', sizes: '192x192' }] },
      { name: 'Sewa Alat', url: '/sewa-alat', icons: [{ src: '/icons/icon-192.png?v=3', sizes: '192x192' }] },
      { name: 'Pesanan Saya', url: '/pesanan', icons: [{ src: '/icons/icon-192.png?v=3', sizes: '192x192' }] },
    ],
  };
}
