'use client';

import React from 'react';

interface BottomCTABannerProps {
  onJoinMember: () => void;
  onContactCounselor: () => void;
}

export default function BottomCTABanner({
  onJoinMember,
  onContactCounselor,
}: BottomCTABannerProps) {
  return (
    <section id="cta-koperasi" className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-forest-accent via-emerald-800 to-forest-dark p-8 sm:p-12 text-center text-white shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-extrabold max-w-2xl mx-auto leading-snug">
            Siap Meningkatkan Kualitas dan Keuntungan Hasil Tani Anda?
          </h3>
          <p className="text-sm text-emerald-100/90 max-w-xl mx-auto mt-3">
            Daftarkan lahan Anda ke sistem Koperasi Sinar Pagi Sejahtera sekarang juga untuk menikmati tarif subsidi
            alsintan, jaminan pembelian panen, dan pendampingan KUR.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              id="btn-gabung-anggota"
              onClick={onJoinMember}
              className="px-6 py-3 rounded-xl bg-white text-forest-accent font-bold text-sm hover:bg-emerald-50 active:scale-95 transition shadow-sm cursor-pointer"
              type="button"
            >
              Gabung Jadi Anggota Koperasi
            </button>
            <button
              id="btn-hubungi-penyuluh"
              onClick={onContactCounselor}
              className="px-6 py-3 rounded-xl bg-emerald-900/60 border border-emerald-400/40 text-white font-semibold text-sm hover:bg-emerald-900 active:scale-95 transition cursor-pointer"
              type="button"
            >
              Hubungi Penyuluh Lapangan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
