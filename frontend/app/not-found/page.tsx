import NotFound from '../not-found';

export const metadata = {
  title: '404 - Halaman Tidak Ditemukan | Koperasi Sinar Pagi Sejahtera',
  description: 'Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.',
};

export default function NotFoundPage() {
  return <NotFound />;
}
