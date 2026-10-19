'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectMengikutiPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/mengikuti');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f4f5f1] flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#233414] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs sm:text-[13px] text-[#344d15] font-medium">
          Mengalihkan ke halaman petani yang diikuti...
        </span>
      </div>
    </div>
  );
}
