'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectMengikutiPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/mengikuti');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span>Mengalihkan ke /profile/mengikuti...</span>
      </div>
    </div>
  );
}
