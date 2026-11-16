'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { addDays, todayWita } from '@/lib/rental-schedule';

interface DayInfo {
  date: string;
  sisa: number;
  stokUnit: number;
  servis: boolean;
}

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MAX_MONTHS_AHEAD = 3;

function monthStart(dateOnly: string): string {
  return `${dateOnly.slice(0, 7)}-01`;
}
function shiftMonth(first: string, delta: number): string {
  const [y, m] = first.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}
function lastOfMonth(first: string): string {
  return addDays(shiftMonth(first, 1), -1);
}

/** Kalender ketersediaan unit per hari untuk satu alat */
export default function AvailabilityCalendar({ equipmentId }: { equipmentId: string }) {
  const today = useMemo(() => todayWita(), []);
  const [month, setMonth] = useState(() => monthStart(today));
  const [days, setDays] = useState<Record<string, DayInfo>>({});
  const [jedaHari, setJedaHari] = useState(0);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const loading = loadedMonth !== month;

  useEffect(() => {
    let active = true;
    const from = month < today ? today : month;
    const to = lastOfMonth(month);
    fetch(`/api/equipments/${equipmentId}/availability?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d?.days) return;
        setJedaHari(d.jedaHari || 0);
        setDays((prev) => {
          const next = { ...prev };
          for (const day of d.days as DayInfo[]) next[day.date] = day;
          return next;
        });
      })
      .catch(() => {})
      .finally(() => active && setLoadedMonth(month));
    return () => {
      active = false;
    };
  }, [equipmentId, month, today]);

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const last = Number(lastOfMonth(month).slice(8, 10));
    const out: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= last; d++) out.push(`${month.slice(0, 8)}${String(d).padStart(2, '0')}`);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month]);

  const canPrev = month > monthStart(today);
  const canNext = month < shiftMonth(monthStart(today), MAX_MONTHS_AHEAD - 1);
  const monthLabel = new Date(`${month}T00:00:00Z`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="rounded-2xl border border-[#dce1d6] bg-white p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#233414]" />
          <h3 className="text-xs sm:text-[13px] font-bold text-[#1a2610]">Jadwal Ketersediaan</h3>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#68785b]" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            disabled={!canPrev}
            aria-label="Bulan sebelumnya"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#233414] hover:bg-[#f0f4ea] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[#1a2610] min-w-[110px] text-center capitalize">{monthLabel}</span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={!canNext}
            aria-label="Bulan berikutnya"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#233414] hover:bg-[#f0f4ea] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] font-semibold text-[#68785b] pb-1">
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const info = days[date];
          const past = date < today;
          const full = info && info.sisa <= 0;
          const partial = info && info.sisa > 0 && info.sisa < info.stokUnit;
          const cls = past
            ? 'text-stone-300'
            : !info
            ? 'text-stone-400'
            : info.servis && full
            ? 'bg-slate-200 text-slate-500'
            : full
            ? 'bg-red-50 text-red-700 line-through'
            : partial
            ? 'bg-amber-50 text-amber-800'
            : 'bg-[#eef6e2] text-[#233414]';
          const title = past
            ? ''
            : !info
            ? ''
            : info.servis && full
            ? 'Servis / perawatan'
            : full
            ? 'Penuh'
            : `Tersisa ${info.sisa} dari ${info.stokUnit} unit`;
          return (
            <div
              key={date}
              title={title}
              className={`h-8 sm:h-9 rounded-lg text-[11px] sm:text-xs font-semibold flex flex-col items-center justify-center ${cls} ${
                date === today ? 'ring-1 ring-[#233414]' : ''
              }`}
            >
              <span>{Number(date.slice(8, 10))}</span>
              {!past && info && info.stokUnit > 1 && info.sisa > 0 && (
                <span className="text-[8.5px] leading-none font-medium opacity-80">{info.sisa}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[10.5px] text-[#526046]">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-[#eef6e2] border border-[#cfe2b4]" /> Tersedia
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200" /> Sisa sebagian
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200" /> Penuh
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300" /> Servis
        </span>
      </div>
      {jedaHari > 0 && (
        <p className="text-[10.5px] text-[#68785b] mt-1.5">
          Setiap sewa diberi jeda {jedaHari} hari untuk pengembalian & pengecekan unit.
        </p>
      )}
    </div>
  );
}
