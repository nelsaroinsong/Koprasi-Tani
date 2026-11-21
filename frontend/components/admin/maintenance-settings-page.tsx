'use client';

import React, { useEffect, useState } from 'react';
import {
  Wrench,
  ShieldAlert,
  CalendarClock,
  Repeat,
  Bell,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Power,
  Trash2,
} from 'lucide-react';
import {
  DAY_OF_WEEK_LABELS,
  DEFAULT_MAINTENANCE_CONFIG,
  formatWitaDateTime,
  formatWitaRange,
  isoToWitaInput,
  witaInputToIso,
  WITA_OFFSET_MS,
  type MaintenanceConfig,
  type MaintenanceEvaluation,
} from '@/lib/maintenance';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

const NOTICE_OPTIONS = [
  { value: 0, label: 'Tanpa banner sebelumnya' },
  { value: 1, label: '1 jam sebelum mulai' },
  { value: 3, label: '3 jam sebelum mulai' },
  { value: 6, label: '6 jam sebelum mulai' },
  { value: 12, label: '12 jam sebelum mulai' },
  { value: 24, label: '24 jam sebelum mulai' },
];

type Notice = { type: 'success' | 'error'; text: string } | null;

function witaNowParts() {
  const wita = new Date(Date.now() + WITA_OFFSET_MS);
  const yyyy = wita.getUTCFullYear();
  const mm = String(wita.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(wita.getUTCDate()).padStart(2, '0');
  const tomorrow = new Date(Date.UTC(yyyy, wita.getUTCMonth(), wita.getUTCDate() + 1));
  const ty = tomorrow.getUTCFullYear();
  const tm = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
  const td = String(tomorrow.getUTCDate()).padStart(2, '0');
  return { todayStr: `${yyyy}-${mm}-${dd}`, tomorrowStr: `${ty}-${tm}-${td}` };
}

export function MaintenanceSettingsPage() {
  const [config, setConfig] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE_CONFIG);
  const [status, setStatus] = useState<MaintenanceEvaluation | null>(null);

  // Input form ramah WITA
  const [forceEnabled, setForceEnabled] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [noticeHoursBefore, setNoticeHoursBefore] = useState(12);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringDay, setRecurringDay] = useState(0);
  const [recurringStart, setRecurringStart] = useState('01:00');
  const [recurringEnd, setRecurringEnd] = useState('02:00');
  const [title, setTitle] = useState(DEFAULT_MAINTENANCE_CONFIG.title);
  const [message, setMessage] = useState(DEFAULT_MAINTENANCE_CONFIG.message);
  const [contactInfo, setContactInfo] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const hydrateForm = (cfg: MaintenanceConfig) => {
    setConfig(cfg);
    setForceEnabled(cfg.forceEnabled);
    setStartInput(isoToWitaInput(cfg.startAt));
    setEndInput(isoToWitaInput(cfg.endAt));
    setNoticeHoursBefore(cfg.noticeHoursBefore);
    setRecurringEnabled(cfg.recurring.enabled);
    setRecurringDay(cfg.recurring.dayOfWeek);
    setRecurringStart(cfg.recurring.startTime);
    setRecurringEnd(cfg.recurring.endTime);
    setTitle(cfg.title);
    setMessage(cfg.message);
    setContactInfo(cfg.contactInfo || '');
  };

  useEffect(() => {
    let active = true;
    fetch('/api/admin/maintenance', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok || !data?.success) {
          setNotice({ type: 'error', text: data?.error || 'Gagal memuat pengaturan pemeliharaan.' });
          return;
        }
        hydrateForm(data.config);
        setStatus(data.status);
      })
      .catch(() => {
        if (active) setNotice({ type: 'error', text: 'Gagal terhubung ke server.' });
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleQuickPreset = (preset: 'TONIGHT_23' | 'TOMORROW_01' | 'IN_1_HOUR' | 'CLEAR') => {
    setNotice(null);
    if (preset === 'CLEAR') {
      setStartInput('');
      setEndInput('');
      return;
    }
    const { todayStr, tomorrowStr } = witaNowParts();
    if (preset === 'TONIGHT_23') {
      setStartInput(`${todayStr}T23:00`);
      setEndInput(`${tomorrowStr}T01:00`);
      return;
    }
    if (preset === 'TOMORROW_01') {
      setStartInput(`${tomorrowStr}T01:00`);
      setEndInput(`${tomorrowStr}T03:00`);
      return;
    }
    // 1 jam dari sekarang selama 1 jam
    const startMs = Date.now() + 60 * 60 * 1000;
    const endMs = startMs + 60 * 60 * 1000;
    setStartInput(isoToWitaInput(new Date(startMs).toISOString()));
    setEndInput(isoToWitaInput(new Date(endMs).toISOString()));
  };

  const handleSave = async (overrideForce?: boolean) => {
    setNotice(null);
    const nextForce = typeof overrideForce === 'boolean' ? overrideForce : forceEnabled;
    const startAtIso = startInput ? witaInputToIso(startInput) : null;
    const endAtIso = endInput ? witaInputToIso(endInput) : null;

    if ((startAtIso && !endAtIso) || (!startAtIso && endAtIso)) {
      setNotice({ type: 'error', text: 'Isi waktu mulai dan waktu selesai secara lengkap, atau kosongkan keduanya.' });
      return;
    }
    if (startAtIso && endAtIso && new Date(endAtIso).getTime() <= new Date(startAtIso).getTime()) {
      setNotice({ type: 'error', text: 'Waktu selesai harus lebih akhir daripada waktu mulai.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        forceEnabled: nextForce,
        startAt: startAtIso,
        endAt: endAtIso,
        noticeHoursBefore,
        recurring: {
          enabled: recurringEnabled,
          dayOfWeek: recurringDay,
          startTime: recurringStart,
          endTime: recurringEnd,
        },
        title: title.trim() || DEFAULT_MAINTENANCE_CONFIG.title,
        message: message.trim() || DEFAULT_MAINTENANCE_CONFIG.message,
        contactInfo: contactInfo.trim(),
      };

      const res = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Gagal menyimpan pengaturan pemeliharaan.');
      }

      hydrateForm(data.config);
      setStatus(data.status);
      setNotice({ type: 'success', text: data.message || 'Pengaturan pemeliharaan berhasil disimpan.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Gagal menyimpan pengaturan.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        <div className="bg-white rounded-xl border border-[#E5E7EB] py-16 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat pengaturan pemeliharaan...
        </div>
      </div>
    );
  }

  const phase = status?.phase || 'NORMAL';

  return (
    <div className="space-y-4 pb-8">
      {/* Header Utama & Status Live */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        <div className="px-3 pt-2 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-600 stroke-[1.8]" />
            <h2 className="text-[13.5px] font-semibold text-slate-800 tracking-tight">Pemeliharaan Sistem</h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                phase === 'MAINTENANCE'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : phase === 'ANNOUNCEMENT'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  phase === 'MAINTENANCE'
                    ? 'bg-rose-500 animate-pulse'
                    : phase === 'ANNOUNCEMENT'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-emerald-500'
                }`}
              />
              {phase === 'MAINTENANCE'
                ? 'Sedang Pemeliharaan'
                : phase === 'ANNOUNCEMENT'
                  ? 'Pengumuman Aktif'
                  : 'Sistem Online Normal'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => window.open('/maintenance', '_blank')}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            Pratinjau Halaman Pemeliharaan
          </button>
        </div>

        {/* Ringkasan Status Real-Time */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[13px] font-semibold text-slate-900">
              {phase === 'MAINTENANCE'
                ? 'Situs publik & transaksi sedang dikunci untuk pengguna'
                : phase === 'ANNOUNCEMENT'
                  ? 'Banner pemberitahuan sedang tampil di seluruh halaman web'
                  : 'Semua layanan toko, sewa alat, dan login berjalan normal'}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {phase === 'MAINTENANCE' && status?.activeWindow
                ? `Jadwal aktif: ${formatWitaRange(status.activeWindow.startAt, status.activeWindow.endAt)}. Panel Admin tetap bisa diakses penuh.`
                : status?.upcomingWindow
                  ? `Jadwal pemeliharaan berikutnya: ${formatWitaRange(status.upcomingWindow.startAt, status.upcomingWindow.endAt)}.`
                  : 'Belum ada jadwal pemeliharaan yang aktif. Anda bisa menjadwalkan waktu tertentu (WITA) atau mengaktifkan sakelar darurat di bawah.'}
            </p>
            {config.updatedAt && (
              <p className="text-[11px] text-slate-400">
                Terakhir diperbarui {formatWitaDateTime(config.updatedAt)}
                {config.updatedBy ? ` oleh ${config.updatedBy}` : ''}
              </p>
            )}
          </div>

          {/* Tombol Cepat Sakelar Darurat */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              const next = !forceEnabled;
              setForceEnabled(next);
              void handleSave(next);
            }}
            className={`h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition disabled:opacity-50 ${
              forceEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {forceEnabled ? 'Matikan Pemeliharaan Darurat' : 'Aktifkan Sekarang (Darurat)'}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {notice && (
        <div
          className={`rounded-xl px-3.5 py-2.5 border text-xs flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Grid 2 Kolom Pengaturan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KARTU 1: Jadwal Pemeliharaan Terjadwal (Sekali Jalan) */}
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-slate-600" />
              <h3 className="text-[12.5px] font-semibold text-slate-800">Jadwal Pemeliharaan (WITA)</h3>
            </div>
            {(startInput || endInput) && (
              <button
                type="button"
                onClick={() => handleQuickPreset('CLEAR')}
                className="text-[11px] font-medium text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Hapus jadwal
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem akan <b>otomatis</b> memunculkan banner pengumuman sebelum jam mulai, lalu mengunci web tepat saat jam mulai, dan membukanya kembali saat jam selesai.
            </p>

            {/* Preset Cepat */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Isi cepat:</span>
              <button
                type="button"
                onClick={() => handleQuickPreset('TONIGHT_23')}
                className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 cursor-pointer transition"
              >
                Malam ini 23:00–01:00
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('TOMORROW_01')}
                className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 cursor-pointer transition"
              >
                Besok 01:00–03:00
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('IN_1_HOUR')}
                className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 cursor-pointer transition"
              >
                1 jam lagi (durasi 1 jam)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
                  Mulai Pemeliharaan (WITA)
                </label>
                <input
                  type="datetime-local"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
                  Selesai Pemeliharaan (WITA)
                </label>
                <input
                  type="datetime-local"
                  value={endInput}
                  min={startInput || undefined}
                  onChange={(e) => setEndInput(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                Tampilkan Banner Notifikasi Sebelum Mulai
              </label>
              <select
                value={noticeHoursBefore}
                onChange={(e) => setNoticeHoursBefore(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                {NOTICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* KARTU 2: Jadwal Rutin Mingguan (Opsional) */}
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-slate-600" />
              <h3 className="text-[12.5px] font-semibold text-slate-800">Jadwal Rutin Mingguan</h3>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="text-[11px] font-medium text-slate-600">
                {recurringEnabled ? 'Aktif' : 'Nonaktif'}
              </span>
              <input
                type="checkbox"
                checked={recurringEnabled}
                onChange={(e) => setRecurringEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 rounded-full bg-slate-200 peer-checked:bg-slate-900 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <p className="text-xs text-slate-500 leading-relaxed">
              Cocok untuk perawatan rutin otomatis setiap minggu (misal backup database setiap <b>Minggu 01:00–02:00 WITA</b>).
            </p>

            <div className={`space-y-3 transition-opacity ${recurringEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Hari Rutin (WITA)</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                  {DAY_OF_WEEK_LABELS.map((dayName, idx) => (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => setRecurringDay(idx)}
                      className={`h-8 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                        recurringDay === idx
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {dayName.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Jam Mulai (WITA)</label>
                  <input
                    type="time"
                    value={recurringStart}
                    onChange={(e) => setRecurringStart(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 tabular-nums focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Jam Selesai (WITA)</label>
                  <input
                    type="time"
                    value={recurringEnd}
                    onChange={(e) => setRecurringEnd(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 tabular-nums focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* KARTU 3: Pesan Pemberitahuan & Pratinjau Banner */}
      <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-600" />
          <h3 className="text-[12.5px] font-semibold text-slate-800">Pesan Pemberitahuan untuk Pengguna</h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Judul Pemberitahuan</label>
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pemeliharaan Sistem Terjadwal"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                Kontak Bantuan Mendesak (Opsional)
              </label>
              <input
                type="text"
                maxLength={160}
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Contoh: WhatsApp Koperasi 0812-xxxx-xxxx"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Penjelasan Singkat</label>
            <textarea
              rows={3}
              maxLength={600}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Jelaskan secara singkat alasan pemeliharaan agar pengguna tenang..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 resize-none"
            />
          </div>

          {/* Pratinjau Kartu Pemberitahuan */}
          <div>
            <div className="text-[11px] font-medium text-slate-500 mb-1.5">
              Pratinjau Kartu Notifikasi (muncul mengambang di sudut bawah sebelum jam pemeliharaan)
            </div>
            <div className="max-w-md rounded-2xl bg-white border border-[#dce1d6] shadow-xs overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-[#233414] via-[#4a6b28] to-[#D4F63D]" />
              <div className="p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1a2610]">{title || DEFAULT_MAINTENANCE_CONFIG.title}</div>
                  <p className="mt-0.5 text-[11.5px] text-[#526046] leading-relaxed">
                    Layanan sementara tidak dapat digunakan pada{' '}
                    <b className="text-[#1a2610]">
                      {startInput && endInput
                        ? formatWitaRange(witaInputToIso(startInput), witaInputToIso(endInput))
                        : recurringEnabled
                          ? `Setiap ${DAY_OF_WEEK_LABELS[recurringDay]}, ${recurringStart} – ${recurringEnd} WITA`
                          : 'jadwal yang ditentukan (WITA)'}
                    </b>
                    .
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#233414] text-[#D4F63D] text-[10.5px] font-semibold">
                    <Clock className="w-3 h-3" /> Hitung mundur otomatis
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceEnabled}
                onChange={(e) => setForceEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>
                Paksa aktif sekarang juga (<b className="text-rose-600">mode darurat</b>)
              </span>
            </label>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="h-9 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
