'use client';

import React from 'react';
import { X, User, Tractor, Sprout, TrendingUp, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSewa: () => void;
  onOpenKur: () => void;
}

export default function DashboardModal({
  isOpen,
  onClose,
  onOpenSewa,
  onOpenKur,
}: DashboardModalProps) {
  if (!isOpen) return null;

  return (
    <div id="dashboard-modal-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="dashboard-modal"
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-forest-accent text-white font-black text-lg flex items-center justify-center shadow-sm">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">Lio Runtuwene</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-forest-700">
                  ANGGOTA UTAMA PETANI
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Kec. Airmadidi, Minahasa Utara • ID: SPS-MU-2024-0891</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-medium">Luas Lahan Terdata</p>
              <p className="text-xl font-black text-slate-900 mt-1">2.2 Hektar</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Jagung &amp; Kelapa</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-medium">Estimasi SHU Berjalan</p>
              <p className="text-xl font-black text-forest-accent mt-1">Rp 3.850.000</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Cair Akhir Tahun</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-medium">Total Penjualan Panen</p>
              <p className="text-xl font-black text-slate-900 mt-1">Rp 46.2 M</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">100% Kontan Terbayar</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
              <p className="text-slate-600 font-medium">Skor Kredit Koperasi</p>
              <p className="text-xl font-black text-emerald-800 mt-1">785 / 850</p>
              <p className="text-[10px] text-forest-accent font-semibold mt-0.5">Grade AAA (KUR Siap)</p>
            </div>
          </div>

          {/* Active Services & Rentals */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Tractor className="w-4 h-4 text-forest-accent" />
                Sewa Alsintan &amp; Layanan Berjalan
              </h4>
              <button
                onClick={() => {
                  onClose();
                  onOpenSewa();
                }}
                className="text-xs font-bold text-forest-accent hover:underline cursor-pointer"
              >
                + Sewa Alat Baru
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">Traktor Roda Dua Quick G1000</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-forest-700">
                    Sedang Digunakan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pool Airmadidi • Termasuk Operator (Om Nico) • Berakhir 24 September 2026
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">Tarif Subsidi Rp 150.000/hari</p>
                <span className="text-[10px] text-emerald-600 font-medium">Status: Berjalan Lancar</span>
              </div>
            </div>
          </div>

          {/* Jadwal Penyuluhan & Rekomendasi Musim */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-700" />
              Rekomendasi Agronomis Minggu Ini (Minahasa Utara)
            </h4>
            <p className="text-slate-600 leading-relaxed text-xs">
              Cuaca di wilayah Airmadidi dan Kauditan diprakirakan cerah berawan 4 hari ke depan. Waktu yang sangat ideal
              untuk penjemuran kopra dan panen jagung kering pipil untuk menghindari risiko jamur aflatoksin.
            </p>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  onClose();
                  onOpenKur();
                }}
                className="px-4 py-2 rounded-xl bg-forest-accent text-white font-bold hover:bg-forest-800 transition cursor-pointer"
              >
                Cek Plafon KUR Musim Tanam Baru
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
