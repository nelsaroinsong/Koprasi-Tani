'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CustomDatePickerProps {
  value: string; // Format 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  minDate?: string; // Format 'YYYY-MM-DD', default to today
  maxDate?: string; // Format 'YYYY-MM-DD'
  /** Tanggal tambahan yang tidak bisa dipilih (mis. unit sewa penuh) */
  isDateDisabled?: (dateStr: string) => boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_FULL_NAMES_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

/**
 * Format string 'YYYY-MM-DD' menjadi objek { year, monthIndex (0-11), day }
 * Menghindari bug konversi UTC timezone pada Date parsing native.
 */
function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1] - 1, day: parts[2] };
}

function formatDateString(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayString(): string {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function CustomDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  isDateDisabled,
  label,
  placeholder = 'Pilih tanggal...',
  required = false,
  className,
  buttonClassName,
  disabled = false,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Ambil tanggal hari ini sebagai referensi
  const todayStr = useMemo(() => getTodayString(), []);
  const effectiveMinDate = minDate !== undefined ? minDate : todayStr;
  const checkDisabled = (dateStr: string) =>
    (effectiveMinDate ? dateStr < effectiveMinDate : false) ||
    (maxDate ? dateStr > maxDate : false) ||
    Boolean(isDateDisabled?.(dateStr));

  // Nilai tanggal aktif yang dipilih
  const parsedValue = useMemo(() => parseDateParts(value), [value]);

  // Bulan dan Tahun yang sedang ditampilkan di kalender
  const [viewYear, setViewYear] = useState(() => parsedValue?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedValue?.month ?? new Date().getMonth());

  // Sinkronisasi view month saat value berubah dari luar
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [value, parsedValue]);

  // Format teks tanggal yang ramah dibaca (e.g. "Selasa, 27 Okt 2026")
  const formattedDisplay = useMemo(() => {
    if (!parsedValue) return placeholder;
    const d = new Date(parsedValue.year, parsedValue.month, parsedValue.day);
    const dayName = DAY_FULL_NAMES_ID[d.getDay()] || '';
    const monthName = MONTH_NAMES_ID[parsedValue.month]?.slice(0, 3) || '';
    return `${dayName}, ${parsedValue.day} ${monthName} ${parsedValue.year}`;
  }, [parsedValue, placeholder]);

  // Label relatif (e.g. "Hari Ini", "Besok")
  const relativeBadge = useMemo(() => {
    if (!value) return null;
    if (value === todayStr) return 'Hari ini';
    const valParts = parseDateParts(value);
    const todayParts = parseDateParts(todayStr);
    if (!valParts || !todayParts) return null;

    const valMs = new Date(valParts.year, valParts.month, valParts.day).getTime();
    const todayMs = new Date(todayParts.year, todayParts.month, todayParts.day).getTime();
    const diffDays = Math.round((valMs - todayMs) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Besok';
    if (diffDays === 2) return 'Lusa';
    if (diffDays > 2 && diffDays <= 7) return `+${diffDays} hari`;
    return null;
  }, [value, todayStr]);

  // Generate daftar hari untuk grid kalender
  const calendarGrid = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Minggu
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      year: number;
      month: number;
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    // Hari dari bulan sebelumnya
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = totalDaysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = formatDateString(y, m, d);
      cells.push({
        year: y,
        month: m,
        day: d,
        dateStr,
        isCurrentMonth: false,
        isSelected: dateStr === value,
        isToday: dateStr === todayStr,
        isDisabled: checkDisabled(dateStr),
      });
    }

    // Hari bulan aktif
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = formatDateString(viewYear, viewMonth, d);
      cells.push({
        year: viewYear,
        month: viewMonth,
        day: d,
        dateStr,
        isCurrentMonth: true,
        isSelected: dateStr === value,
        isToday: dateStr === todayStr,
        isDisabled: checkDisabled(dateStr),
      });
    }

    // Hari bulan berikutnya agar genap kelipatan 7 (35 atau 42 cells)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = formatDateString(y, m, n);
      cells.push({
        year: y,
        month: m,
        day: n,
        dateStr,
        isCurrentMonth: false,
        isSelected: dateStr === value,
        isToday: dateStr === todayStr,
        isDisabled: checkDisabled(dateStr),
      });
    }

    return cells;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, value, todayStr, effectiveMinDate, maxDate, isDateDisabled]);

  // Navigasi bulan
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Cek apakah tombol prev month perlu di-disable (jika minDate di bulan yang sama)
  const isPrevMonthDisabled = useMemo(() => {
    if (!effectiveMinDate) return false;
    const minParts = parseDateParts(effectiveMinDate);
    if (!minParts) return false;
    return (
      viewYear < minParts.year ||
      (viewYear === minParts.year && viewMonth <= minParts.month)
    );
  }, [viewYear, viewMonth, effectiveMinDate]);

  // Pilih tanggal
  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  // Quick Preset Helper
  const handleQuickPreset = (offsetDays: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offsetDays);
    const nextStr = formatDateString(base.getFullYear(), base.getMonth(), base.getDate());
    onChange(nextStr);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setIsOpen(false);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[11px] font-bold text-[#526046] uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={label || 'Pilih tanggal'}
            className={cn(
              'w-full flex items-center justify-between px-3.5 py-2.5 bg-[#f4f5f1] hover:bg-[#eaede5] border border-[#dce1d6] rounded-xl text-xs sm:text-sm font-semibold text-[#1a2610] transition-all cursor-pointer focus:outline-none focus:bg-white focus:border-[#233414] focus:ring-2 focus:ring-[#233414]/10 disabled:opacity-60 disabled:cursor-not-allowed group',
              isOpen && 'bg-white border-[#233414] ring-2 ring-[#233414]/10',
              buttonClassName
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  'w-7 h-7 rounded-lg bg-white border border-[#dce1d6] flex items-center justify-center text-[#233414] group-hover:bg-[#233414] group-hover:text-[#D4F63D] transition-colors shrink-0',
                  isOpen && 'bg-[#233414] text-[#D4F63D]'
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-left truncate">
                <span
                  className={cn(
                    'block font-bold truncate',
                    !value ? 'text-[#7c8772]' : 'text-[#1a2610]'
                  )}
                >
                  {formattedDisplay}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {relativeBadge && (
                <span className="px-2 py-0.5 rounded-md bg-[#e2f2c8] text-[#233414] text-[10px] font-extrabold uppercase tracking-wide">
                  {relativeBadge}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-[#7c8772] transition-transform duration-200',
                  isOpen && 'rotate-180 text-[#233414]'
                )}
              />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[328px] sm:w-[348px] max-w-[calc(100vw-32px)] p-3.5 sm:p-4 rounded-2xl border border-[#dce1d6] bg-white shadow-[0_16px_36px_rgba(0,0,0,0.12)] z-50 animate-in fade-in-0 zoom-in-95"
        >
          {/* Quick Preset Buttons (Pilihan Instan ala Grab/Modern App) */}
          <div className="flex items-center gap-1.5 pb-3 border-b border-[#f0f2ec] overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleQuickPreset(0)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer border',
                value === todayStr
                  ? 'bg-[#233414] text-[#D4F63D] border-[#233414]'
                  : 'bg-[#f4f5f1] hover:bg-[#e8ece2] text-[#1a2610] border-[#dce1d6]'
              )}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(1)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f4f5f1] hover:bg-[#e8ece2] text-[#1a2610] border border-[#dce1d6] transition-all shrink-0 cursor-pointer"
            >
              Besok
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(2)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f4f5f1] hover:bg-[#e8ece2] text-[#1a2610] border border-[#dce1d6] transition-all shrink-0 cursor-pointer"
            >
              Lusa
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(7)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f4f5f1] hover:bg-[#e8ece2] text-[#1a2610] border border-[#dce1d6] transition-all shrink-0 cursor-pointer"
            >
              +1 Minggu
            </button>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between pt-3 pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#1a2610] tracking-tight">
                {MONTH_NAMES_ID[viewMonth]} {viewYear}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={isPrevMonthDisabled}
                aria-label="Bulan sebelumnya"
                className="w-7 h-7 rounded-lg hover:bg-[#f4f5f1] disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-[#1a2610] transition cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Bulan berikutnya"
                className="w-7 h-7 rounded-lg hover:bg-[#f4f5f1] flex items-center justify-center text-[#1a2610] transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES_ID.map((day, idx) => (
              <span
                key={day}
                className={cn(
                  'text-[10px] font-black uppercase tracking-wider py-1',
                  idx === 0 ? 'text-red-500' : 'text-[#7c8772]'
                )}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid (7 Columns) */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, idx) => {
              const isCellSelected = cell.dateStr === value;
              const isCellToday = cell.dateStr === todayStr;

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className={cn(
                    'h-9 sm:h-9.5 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer',
                    // Default font color
                    !cell.isCurrentMonth && 'text-stone-300 font-normal',
                    cell.isCurrentMonth && !cell.isDisabled && 'text-[#1a2610] hover:bg-[#f0f4ea]',
                    // Disabled style
                    cell.isDisabled &&
                      'text-stone-300 opacity-40 cursor-not-allowed line-through hover:bg-transparent',
                    // Today style (unselected)
                    isCellToday &&
                      !isCellSelected &&
                      'border border-[#233414] font-black text-[#233414]',
                    // Selected style
                    isCellSelected &&
                      'bg-[#233414] text-white font-black shadow-sm scale-102 hover:bg-[#1a2610]'
                  )}
                >
                  <span>{cell.day}</span>
                  {/* Indicator dot untuk hari ini jika tidak dipilih */}
                  {isCellToday && !isCellSelected && (
                    <span className="w-1 h-1 rounded-full bg-[#233414] -mt-0.5" />
                  )}
                  {/* Indicator dot untuk selected */}
                  {isCellSelected && (
                    <span className="w-1 h-1 rounded-full bg-[#D4F63D] -mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Bar: Info Terpilih & Reset ke Hari Ini */}
          <div className="mt-3 pt-2.5 border-t border-[#f0f2ec] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => handleQuickPreset(0)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#526046] hover:text-[#233414] cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Hari Ini</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-[#233414] hover:bg-[#1a2610] text-[#D4F63D] text-[11px] font-bold transition cursor-pointer"
            >
              Terapkan
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
