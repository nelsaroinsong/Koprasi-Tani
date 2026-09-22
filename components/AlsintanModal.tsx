'use client';

import React, { useState } from 'react';
import { AlsintanItem } from '@/lib/types';
import { X, Calendar, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';

interface AlsintanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: AlsintanItem | null;
  allItems: AlsintanItem[];
  onConfirmBooking: (bookingDetails: {
    item: AlsintanItem;
    date: string;
    duration: number;
    pool: string;
    withOperator: boolean;
    totalCost: number;
  }) => void;
}

export default function AlsintanModal({
  isOpen,
  onClose,
  selectedItem,
  allItems,
  onConfirmBooking,
}: AlsintanModalProps) {
  const [currentSelectedId, setCurrentSelectedId] = useState<string>(
    selectedItem ? selectedItem.id : allItems[0]?.id || ''
  );
  const [bookingDate, setBookingDate] = useState<string>('2026-09-23');
  const [duration, setDuration] = useState<number>(1);
  const [selectedPool, setSelectedPool] = useState<string>('Pool Airmadidi (Sentral)');
  const [withOperator, setWithOperator] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentItem = allItems.find((i) => i.id === currentSelectedId) || allItems[0];
  const operatorFeePerDay = 50000;
  const unitCost = currentItem ? currentItem.price * duration : 0;
  const operatorCost = withOperator ? operatorFeePerDay * duration : 0;
  const totalCost = unitCost + operatorCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;
    onConfirmBooking({
      item: currentItem,
      date: bookingDate,
      duration,
      pool: selectedPool,
      withOperator,
      totalCost,
    });
  };

  return (
    <div id="alsintan-modal-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="alsintan-modal-card"
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-forest-accent text-white flex items-center justify-center text-xl shadow-sm">
              🚜
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Formulir Sewa Alsintan Subsidi</h3>
              <p className="text-xs text-slate-500">Koperasi Sinar Pagi Sejahtera • Pool Minut</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Pilih Alat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Mesin / Alsintan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {allItems.map((it) => {
                const isSelected = it.id === currentItem?.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setCurrentSelectedId(it.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-forest-accent bg-emerald-50/60 text-slate-900 ring-2 ring-forest-accent/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold truncate">{it.name}</p>
                    <p className="text-[11px] font-semibold text-forest-accent mt-0.5">
                      Rp {it.price.toLocaleString('id-ID')}{it.unit}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tanggal & Durasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Mulai Sewa
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-forest-accent focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Durasi ({currentItem?.unit.replace('/', '')})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-forest-accent focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Lokasi Pool Pengambilan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lokasi Pool Alsintan
            </label>
            <select
              value={selectedPool}
              onChange={(e) => setSelectedPool(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-forest-accent focus:outline-none bg-white"
            >
              <option value="Pool Airmadidi (Sentral)">Pool Airmadidi (Jl. Raya Manado-Bitung Km 16)</option>
              <option value="Pool Kauditan I">Pool Kauditan (Kompleks Sentra Jagung Kauditan I)</option>
              <option value="Pool Likupang Timur">Pool Likupang Timur (Pusat Hortikultura & Solar Dome)</option>
            </select>
          </div>

          {/* Opsi Pendampingan Operator */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Sertakan Operator Resmi Koperasi</p>
              <p className="text-[11px] text-slate-500">
                Operator handal terlatih &amp; bersertifikat (Rp 50.000/hari)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={withOperator}
                onChange={(e) => setWithOperator(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-accent" />
            </label>
          </div>

          {/* Ringkasan Biaya */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Sewa {currentItem?.name} ({duration} {currentItem?.unit.replace('/', '')})</span>
              <span className="font-semibold text-slate-900">Rp {unitCost.toLocaleString('id-ID')}</span>
            </div>
            {withOperator && (
              <div className="flex justify-between text-slate-600">
                <span>Jasa Operator Resmi ({duration} hari)</span>
                <span className="font-semibold text-slate-900">Rp {operatorCost.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Subsidi Koperasi (Diskon Anggota)</span>
              <span className="text-emerald-700 font-bold">- Termasuk Subsidi 35%</span>
            </div>
            <div className="pt-2 border-t border-emerald-200 flex justify-between text-sm font-extrabold text-slate-900">
              <span>Total Tarif Sewa</span>
              <span className="text-forest-accent text-base">Rp {totalCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-2 py-3 px-4 rounded-xl bg-forest-accent text-white font-bold text-xs hover:bg-forest-800 transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Konfirmasi Sewa Alsintan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
