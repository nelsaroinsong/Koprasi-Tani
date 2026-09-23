import React from 'react';
import { Sprout } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="flex-1 w-full min-h-[calc(100vh-8rem)] rounded-3xl border border-dashed border-emerald-200/80 bg-white/60 backdrop-blur-xs p-8 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100 shadow-xs">
        <Sprout className="w-7 h-7 text-emerald-600" />
      </div>
      <h2 className="text-base font-bold text-slate-800">
        Panel Administrator Koperasi Sinar Pagi Sejahtera
      </h2>
      <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
        Pilih menu pada sidebar di sebelah kiri untuk mengelola data pengguna, produk, dan layanan koperasi.
      </p>
    </div>
  );
}
