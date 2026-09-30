import Link from 'next/link';
import NotFoundIllustration from '@/components/NotFoundIllustration';

export const metadata = {
  title: '404 - Halaman Tidak Ditemukan | Koperasi Sinar Pagi Sejahtera',
  description: 'Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.',
};

export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4 py-12 sm:py-16 select-none">
      <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center">
        {/* Illustration */}
        <div className="w-full max-w-[420px] sm:max-w-[480px] mb-6 sm:mb-8 transition-transform duration-300 hover:scale-[1.01]">
          <NotFoundIllustration />
        </div>

        {/* Text Group */}
        <h1 className="text-3xl sm:text-4xl md:text-[40px] font-extrabold text-neutral-900 tracking-tight mb-2 sm:mb-3">
          Oops!
        </h1>
        
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-normal mb-2">
          Something went wrong
        </h2>

        <p className="text-neutral-500 text-sm sm:text-[15px] leading-relaxed max-w-md mx-auto mb-7 sm:mb-8">
          The page you&apos;re looking for isn&apos;t found, we suggest you back to home.
        </p>

        {/* Action Button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-95 rounded-lg shadow-sm transition-all duration-200"
        >
          Back to home page
        </Link>
      </div>
    </main>
  );
}
