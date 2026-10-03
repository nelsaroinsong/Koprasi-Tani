'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CheckoutDispatcher() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'sewa-alat') {
      router.replace('/checkout/sewa-alat');
    } else {
      router.replace('/checkout/toko');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
      </div>
    }>
      <CheckoutDispatcher />
    </Suspense>
  );
}
