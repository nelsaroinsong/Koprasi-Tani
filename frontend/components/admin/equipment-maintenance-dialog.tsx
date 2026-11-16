'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/context/toast-context';
import { todayWita } from '@/lib/rental-schedule';

interface MaintenanceItem {
  id: string;
  startDate: string;
  endDate: string;
  jumlahUnit: number;
  alasan: string;
  createdBy?: string | null;
}

interface Props {
  equipment: { id: string; nama: string; stokUnit: number } | null;
  onClose: () => void;
}

const inputCls =
  'w-full text-xs px-3 py-2 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition text-slate-800';

/** Blokir jadwal unit untuk servis / perawatan */
export function EquipmentMaintenanceDialog({ equipment, onClose }: Props) {
  const { showToast } = useToast();
  const today = todayWita();
  const [list, setList] = useState<MaintenanceItem[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = Boolean(equipment) && loadedFor !== equipment?.id;
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [jumlahUnit, setJumlahUnit] = useState('1');
  const [alasan, setAlasan] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (equipmentId: string) => {
    try {
      const res = await fetch(`/api/admin/equipments/maintenance?equipmentId=${equipmentId}`);
      const data = await res.json();
      setList(data.maintenance || []);
    } catch {
      setList([]);
    } finally {
      setLoadedFor(equipmentId);
    }
  }, []);

  useEffect(() => {
    if (!equipment) return;
    let active = true;
    fetch(`/api/admin/equipments/maintenance?equipmentId=${equipment.id}`)
      .then((res) => res.json())
      .then((data) => active && setList(data.maintenance || []))
      .catch(() => active && setList([]))
      .finally(() => active && setLoadedFor(equipment.id));
    return () => {
      active = false;
    };
  }, [equipment]);

  const handleSave = async () => {
    if (!equipment) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/equipments/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId: equipment.id, startDate, endDate, jumlahUnit, alasan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan jadwal servis');
      showToast({ title: 'Jadwal Servis Disimpan', message: `${equipment.nama}: ${startDate} s/d ${endDate}`, type: 'success' });
      setAlasan('');
      await load(equipment.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!equipment) return;
    const res = await fetch(`/api/admin/equipments/maintenance?id=${id}`, { method: 'DELETE' });
    if (res.ok) await load(equipment.id);
  };

  return (
    <Dialog open={Boolean(equipment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full rounded-2xl p-0 overflow-hidden bg-white border border-slate-200">
        <DialogHeader className="px-5 py-4 border-b border-slate-100">
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-600" />
            Jadwal Servis: {equipment?.nama}
          </DialogTitle>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Unit yang diservis tidak bisa disewa pada tanggal tersebut dan tampil sebagai &quot;Servis&quot; di kalender.
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="block font-semibold text-slate-600 mb-1">Mulai</span>
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="block font-semibold text-slate-600 mb-1">Selesai</span>
              <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <label className="block">
              <span className="block font-semibold text-slate-600 mb-1">Unit</span>
              <input
                type="number"
                min={1}
                max={equipment?.stokUnit || 1}
                value={jumlahUnit}
                onChange={(e) => setJumlahUnit(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block col-span-2">
              <span className="block font-semibold text-slate-600 mb-1">Alasan</span>
              <input
                type="text"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Ganti oli, servis rutin..."
                className={inputCls}
              />
            </label>
          </div>
          {error && <p className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px]">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !alasan.trim()}
            className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Blokir Jadwal untuk Servis
          </button>

          <div className="pt-3 border-t border-slate-100">
            <div className="font-semibold text-slate-700 mb-2">Jadwal servis mendatang</div>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : list.length === 0 ? (
              <p className="text-slate-400">Belum ada jadwal servis.</p>
            ) : (
              <ul className="space-y-1.5">
                {list.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">
                        {m.startDate}
                        {m.endDate !== m.startDate ? ` s/d ${m.endDate}` : ''} • {m.jumlahUnit} unit
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{m.alasan}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      title="Hapus jadwal servis"
                      className="w-7 h-7 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
