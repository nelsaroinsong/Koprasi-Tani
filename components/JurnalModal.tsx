'use client';

import React from 'react';
import { X, FileText, CheckCircle2, Download, Printer } from 'lucide-react';

interface JurnalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const harvestLogs = [
  {
    ticket: 'TMB-202609-082',
    date: '20 Sep 2026',
    crop: 'Kopra Putih Grade A',
    netWeight: '450 kg',
    moisture: '5.2%',
    pricePerKg: 13500,
    totalPayout: 6075000,
    status: 'Lunas (Transfer BSG)',
    pool: 'Pool Airmadidi',
  },
  {
    ticket: 'TMB-202609-041',
    date: '14 Sep 2026',
    crop: 'Jagung Pipil Kering Super',
    netWeight: '1.200 kg',
    moisture: '13.8%',
    pricePerKg: 5500,
    totalPayout: 6600000,
    status: 'Lunas (Transfer BSG)',
    pool: 'Pool Kauditan I',
  },
  {
    ticket: 'TMB-202608-199',
    date: '28 Agu 2026',
    crop: 'Kelapa Butir Tua Grade A',
    netWeight: '600 butir',
    moisture: '-',
    pricePerKg: 4500,
    totalPayout: 2700000,
    status: 'Lunas (Kontan di Pool)',
    pool: 'Pool Airmadidi',
  },
];

export default function JurnalModal({ isOpen, onClose }: JurnalModalProps) {
  if (!isOpen) return null;

  return (
    <div id="jurnal-modal-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="jurnal-modal"
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-accent text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">Buku Jurnal &amp; Nota Timbang Panen</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-forest-700">
                  Anggota #0891
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Riwayat timbangan digital terverifikasi Koperasi Sinar Pagi Sejahtera
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
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-slate-500 font-medium">Total Volume Terjual (Q3)</p>
              <p className="text-xl font-black text-forest-accent mt-1">2.250 kg / butir</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-medium">Total Pencairan Dana</p>
              <p className="text-xl font-black text-slate-900 mt-1">Rp 15.375.000</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500 font-medium">Rata-rata Waktu Cair</p>
              <p className="text-xl font-black text-emerald-700 mt-1">&lt; 3 Jam</p>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4">No. Tiket &amp; Tanggal</th>
                    <th className="py-3 px-4">Komoditas &amp; Kadar Air</th>
                    <th className="py-3 px-4">Berat Bersih</th>
                    <th className="py-3 px-4">Harga / Satuan</th>
                    <th className="py-3 px-4">Total Bayar</th>
                    <th className="py-3 px-4">Status &amp; Pool</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {harvestLogs.map((log) => (
                    <tr key={log.ticket} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{log.ticket}</span>
                        <span className="text-[11px] text-slate-400">{log.date}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{log.crop}</span>
                        <span className="text-[11px] text-slate-500">KA: {log.moisture}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{log.netWeight}</td>
                      <td className="py-3.5 px-4 text-slate-600">Rp {log.pricePerKg.toLocaleString('id-ID')}</td>
                      <td className="py-3.5 px-4 font-black text-forest-accent">
                        Rp {log.totalPayout.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> {log.status}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">{log.pool}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-400">
              * Nota digital ini sah dan tersinkronisasi dengan sistem buku besar Koperasi.
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => alert('Mengunduh Laporan Rekapitulasi Timbangan (PDF)...')}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PDF</span>
              </button>
              <button
                onClick={() => alert('Mencetak struk timbangan resmi...')}
                className="py-2.5 px-4 rounded-xl bg-forest-accent text-white font-bold hover:bg-forest-800 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Nota</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
