'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { EquipmentRentalOrder } from '@/lib/equipment-rentals';
import { DENDA_PER_HARI, hitungDenda, hitungHariTerlambat, rincianTagihan } from '@/lib/rental-policy';

export type InspectionType = 'SERAH_TERIMA' | 'PENGEMBALIAN';

export interface InspectionPayload {
  inspection: { kondisi: string; jamMesin?: string; bbmLevel?: string; catatan?: string };
  damageFee?: number;
  damageNotes?: string;
}

interface Props {
  target: { rental: EquipmentRentalOrder; type: InspectionType } | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: InspectionPayload) => Promise<void>;
}

const KONDISI = ['Baik', 'Ada kerusakan ringan', 'Rusak'];
const BBM = ['Penuh', '3/4', '1/2', '1/4', 'Kosong'];
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const inputCls =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-500 transition';

/** Formulir cek kondisi unit saat serah terima / pengembalian */
export function RentalInspectionDialog(props: Props) {
  if (!props.target) return null;
  // key: formulir direset setiap kali membuka sewa / jenis cek yang berbeda
  return (
    <InspectionForm
      key={`${props.target.rental.id}-${props.target.type}`}
      {...props}
      target={props.target}
    />
  );
}

function InspectionForm({
  target,
  isSubmitting,
  onClose,
  onSubmit,
}: Props & { target: NonNullable<Props['target']> }) {
  const { rental, type } = target;
  const handoverBbm = rental.inspections?.find((i) => i.type === 'SERAH_TERIMA')?.bbmLevel;
  const [kondisi, setKondisi] = useState('Baik');
  const [jamMesin, setJamMesin] = useState('');
  const [bbmLevel, setBbmLevel] = useState(type === 'PENGEMBALIAN' && handoverBbm ? handoverBbm : 'Penuh');
  const [catatan, setCatatan] = useState('');
  const [damageFee, setDamageFee] = useState('');
  const [damageNotes, setDamageNotes] = useState('');

  const isReturn = type === 'PENGEMBALIAN';
  const handover = rental.inspections?.find((i) => i.type === 'SERAH_TERIMA');
  const tagihan = rincianTagihan(rental);
  const totalUnits = rental.items.reduce((s, it) => s + (it.jumlahUnit || 1), 0);
  const lateDays = isReturn ? hitungHariTerlambat(rental.endDate || rental.startDate) : 0;
  const lateFee = hitungDenda(lateDays, totalUnits);
  const damage = Math.max(0, Number(damageFee) || 0);
  const amountDue = isReturn ? lateFee + damage : rental.isPaid ? 0 : tagihan.sisaPelunasan;

  const handleSubmit = async () => {
    await onSubmit({
      inspection: { kondisi, jamMesin, bbmLevel, catatan },
      ...(isReturn ? { damageFee: damage, damageNotes } : {}),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="px-5 py-4 border-b border-slate-100">
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-slate-600" />
            {isReturn ? 'Pengembalian Unit' : 'Serah Terima Unit'} #{rental.rentalCode}
          </DialogTitle>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {rental.userName} • {rental.items.map((it) => `${it.nama} (${it.jumlahUnit})`).join(', ')}
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3 text-xs max-h-[65vh] overflow-y-auto">
          {isReturn && handover && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              Saat diserahkan: kondisi <b>{handover.kondisi}</b>
              {handover.jamMesin !== null ? `, jam mesin ${handover.jamMesin}` : ''}
              {handover.bbmLevel ? `, BBM ${handover.bbmLevel}` : ''}
              {handover.catatan ? ` — ${handover.catatan}` : ''}
            </div>
          )}

          <div>
            <span className="block font-semibold text-slate-700 mb-1.5">Kondisi unit</span>
            <div className="grid grid-cols-3 gap-1.5">
              {KONDISI.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKondisi(k)}
                  className={`py-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${
                    kondisi === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="block font-semibold text-slate-700 mb-1">Jam mesin (hour meter)</span>
              <input type="number" min={0} step="0.1" value={jamMesin} onChange={(e) => setJamMesin(e.target.value)} placeholder="Opsional" className={inputCls} />
            </label>
            <label className="block">
              <span className="block font-semibold text-slate-700 mb-1">Bahan bakar</span>
              <select value={bbmLevel} onChange={(e) => setBbmLevel(e.target.value)} className={inputCls}>
                {BBM.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block font-semibold text-slate-700 mb-1">Catatan kondisi</span>
            <textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Goresan, ban, kelengkapan alat..." className={`${inputCls} resize-none`} />
          </label>

          {isReturn && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="block font-semibold text-slate-700 mb-1">Biaya kerusakan (Rp)</span>
                  <input type="number" min={0} step={1000} value={damageFee} onChange={(e) => setDamageFee(e.target.value)} placeholder="0" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block font-semibold text-slate-700 mb-1">Keterangan kerusakan</span>
                  <input type="text" value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Opsional" className={inputCls} />
                </label>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Jadwal selesai</span>
                  <span className="font-semibold">{rental.endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Denda terlambat ({lateDays} hari × {totalUnits} unit × {rp(DENDA_PER_HARI)})
                  </span>
                  <span className={`font-semibold tabular-nums ${lateFee > 0 ? 'text-rose-700' : ''}`}>{rp(lateFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Biaya kerusakan</span>
                  <span className="font-semibold tabular-nums">{rp(damage)}</span>
                </div>
              </div>
            </>
          )}

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="font-semibold text-emerald-900">
              {isReturn ? 'Tagihan tambahan diterima tunai' : rental.isPaid ? 'Sudah lunas' : 'Pelunasan sisa diterima tunai'}
            </span>
            <span className="text-base font-black text-emerald-950 tabular-nums">{rp(amountDue)}</span>
          </div>
          {!isReturn && !rental.isPaid && tagihan.dpDibayar > 0 && (
            <p className="text-[11px] text-slate-500">
              Total {rp(tagihan.total)} dikurangi DP {rp(tagihan.dpDibayar)} yang sudah dibayar.
            </p>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isReturn ? 'Konfirmasi Unit Kembali' : 'Konfirmasi Serah Terima'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
