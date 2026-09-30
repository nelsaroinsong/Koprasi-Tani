'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import NotFoundIllustration from '@/components/NotFoundIllustration';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console or error reporting service
    console.error('Application Error caught by error boundary:', error);
  }, [error]);

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
          The page encountered an unexpected error, we suggest you back to home or try again.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:scale-95 rounded-lg border border-neutral-300 transition-all duration-200"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-95 rounded-lg shadow-sm transition-all duration-200"
          >
            Back to home page
          </Link>
        </div>
      </div>
    </main>
  );
}
