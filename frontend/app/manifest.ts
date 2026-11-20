import type { MetadataRoute } from 'next';

/** Web App Manifest: web bisa dipasang di layar utama HP seperti aplikasi */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Koperasi Sinar Pagi Sejahtera',
    short_name: 'Koperasi Tani',
    description: 'Belanja hasil panen, sewa alat pertanian, dan bagi hasil petani Koperasi Sinar Pagi Sejahtera — Minahasa Utara.',
    start_url: '/toko',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f5f1',
    theme_color: '#233414',
    lang: 'id',
    categories: ['shopping', 'business', 'food'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Toko Panen', url: '/toko', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Sewa Alat', url: '/sewa-alat', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Pesanan Saya', url: '/pesanan', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
