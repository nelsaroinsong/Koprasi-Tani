'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, TrendingUp, Building, Award } from 'lucide-react';

interface KurModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KurModal({ isOpen, onClose }: KurModalProps) {
  const [landArea, setLandArea] = useState<number>(2.0);
  const [commodity, setCommodity] = useState<'Kelapa' | 'Jagung' | 'Campuran'>('Kelapa');
  const [monthlyHarvest, setMonthlyHarvest] = useState<number>(3500);
  const [loanRequest, setLoanRequest] = useState<number>(25000000);

  if (!isOpen) return null;

  // Credit scoring logic
  const baseScore = 720;
  const areaBonus = Math.min(landArea * 15, 60);
  const volumeBonus = Math.min((monthlyHarvest / 1000) * 10, 50);
  const creditScore = Math.round(baseScore + areaBonus + volumeBonus);

  const maxLoanEligible = Math.min(50000000, Math.round(monthlyHarvest * 8000 * 2));
  const isEligible = creditScore >= 700;

  return (
    <div id="kur-modal-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="kur-modal"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-accent text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">Skor Kelayakan KUR Pertanian</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-forest-700">
                  Mitra Bank SulutGo &amp; BRI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Credit scoring otomatis berbasis riwayat timbang &amp; jual panen Koperasi Sinar Pagi Sejahtera
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
          {/* Credit Score Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-forest-accent to-emerald-900 text-white relative overflow-hidden shadow-md">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
                  Hasil Analisis Skor Koperasi
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-black text-white">{creditScore}</span>
                  <span className="text-xs font-bold text-emerald-300 bg-white/20 px-2.5 py-0.5 rounded-full">
                    Kategori: SANGAT LAYAK (Grade AAA)
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-2 max-w-sm">
                  Rekam jejak panen tertib 12 bulan terakhir. Berhak mengajukan KUR Mikro tanpa jaminan sertifikat fisik.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-right">
                <p className="text-[11px] text-emerald-200">Maksimum Plafon Direkomendasikan</p>
                <p className="text-xl font-extrabold text-white mt-0.5">
                  Rp {maxLoanEligible.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-emerald-300 mt-1">Bunga Subsidi 6% eff / tahun</p>
              </div>
            </div>
          </div>

          {/* Calculator Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Luas Lahan Aktif (Hektar)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="20"
                value={landArea}
                onChange={(e) => setLandArea(parseFloat(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-forest-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Komoditas Utama
              </label>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-forest-accent focus:outline-none bg-white"
              >
                <option value="Kelapa">Kelapa Butir &amp; Kopra</option>
                <option value="Jagung">Jagung Pipil Kering</option>
                <option value="Campuran">Tumpangsari Kelapa - Jagung</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Rata-rata Panen Masuk Koperasi (kg/bln)
              </label>
              <input
                type="number"
                step="250"
                min="500"
                value={monthlyHarvest}
                onChange={(e) => setMonthlyHarvest(parseInt(e.target.value) || 1000)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-forest-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nominal Pinjaman Diajukan
              </label>
              <input
                type="number"
                step="5000000"
                max={maxLoanEligible}
                value={loanRequest}
                onChange={(e) => setLoanRequest(parseInt(e.target.value) || 10000000)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-forest-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Syarat & Mitra Perbankan */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-700" /> Dokumen Disiapkan Koperasi Otomatis:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Surat Rekomendasi Koperasi Sinar Pagi Sejahtera</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Buku Catatan Transaksi Timbang Digital 12 Bulan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Titik Koordinat Polygon Lahan Minahasa Utara</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Surat Keterangan Usaha (SKU) Desa Terverifikasi</span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-500">
              Biaya Pengajuan &amp; Asuransi Pertanian (AUTP) ditanggung subsidi.
            </span>
            <button
              onClick={() => {
                alert(`Pengajuan Rekomendasi KUR sebesar Rp ${loanRequest.toLocaleString('id-ID')} telah dikirim ke Bank SulutGo Cabang Airmadidi. Tim Koperasi akan menghubungi Anda dalam 1x24 jam.`);
                onClose();
              }}
              className="py-3 px-6 rounded-xl bg-forest-accent text-white font-bold hover:bg-forest-800 transition shadow-md cursor-pointer"
            >
              Ajukan Rekomendasi KUR Koperasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
