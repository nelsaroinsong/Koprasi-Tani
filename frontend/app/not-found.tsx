import Link from 'next/link';
import NotFoundIllustration from '@/components/NotFoundIllustration';
import { Home, ShoppingBag } from 'lucide-react';

export const metadata = {
  title: '404 - Halaman Tidak Ditemukan | Koperasi Sinar Pagi Sejahtera',
  description: 'Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.',
};

export default function NotFound() {
  return (
    <main className="h-screen max-h-screen w-full overflow-hidden bg-white flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center">
        {/* Illustration - Disesuaikan agar proporsional dan tidak memicu vertical scrollbar */}
        <div className="w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] mb-3 sm:mb-4 transition-transform duration-300 hover:scale-[1.02]">
          <NotFoundIllustration className="w-full h-auto max-h-[30vh] object-contain" />
        </div>

        {/* Text Group */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight mb-1 sm:mb-1.5">
          Oops!
        </h1>

        <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-800 tracking-tight mb-1.5 sm:mb-2">
          Halaman Tidak Ditemukan
        </h2>

        <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed max-w-sm sm:max-w-md mx-auto mb-5 sm:mb-6">
          Halaman yang Anda tuju tidak tersedia atau tautan mungkin telah dipindahkan. Mari kembali ke beranda atau toko koperasi.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:scale-95 rounded-xl border border-neutral-200 transition-all duration-200"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
            <span>Kembali ke Beranda</span>
          </Link>
          <Link
            href="/toko"
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-xl shadow-xs transition-all duration-200"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
            <span>Toko Online</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
