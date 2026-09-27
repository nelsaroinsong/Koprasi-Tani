'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle2,
  Eye,
  Sliders,
  Palette,
  Volume2,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';

const DEFAULT_ITEMS = [
  'HASIL PANEN LANGSUNG DARI PETANI',
  'KOMODITAS KELAPA & JAGUNG UNGGULAN',
  'HARGA TRANSPARAN & BEBAS TENGKULAK',
  'SEWA ALAT & MESIN PERTANIAN LENGKAP',
  'PEMBERDAYAAN PETANI MINAHASA UTARA',
  'PEMBAYARAN CASH AMAN DI GUDANG KOPERASI',
  'KUALITAS FISIK TERVERIFIKASI',
  'KOPERASI SINAR PAGI SEJAHTERA',
];

const COLOR_PRESETS = [
  {
    id: 'forest',
    name: 'Hijau Hutan Koperasi (Rekomendasi)',
    desc: 'Elegan, menyatu harmonis dengan brand koperasi',
    bgClass: 'bg-[#133e2d]',
    textClass: 'text-emerald-50',
    dotClass: 'text-emerald-400',
    hex: '#133e2d',
  },
  {
    id: 'dark',
    name: 'Hitam Arang (Slate)',
    desc: 'Modern, kontras tinggi dan minimalis',
    bgClass: 'bg-[#0f172a]',
    textClass: 'text-slate-100',
    dotClass: 'text-emerald-400',
    hex: '#0f172a',
  },
  {
    id: 'lime',
    name: 'Neon Lime',
    desc: 'Terang dan menarik perhatian pengunjung',
    bgClass: 'bg-[#bbf43d]',
    textClass: 'text-slate-950',
    dotClass: 'text-slate-950',
    hex: '#bbf43d',
  },
  {
    id: 'harvest',
    name: 'Emas Panen (Harvest Gold)',
    desc: 'Nuansa hasil panen jagung & minyak kelapa murni',
    bgClass: 'bg-[#92400e]',
    textClass: 'text-amber-50',
    dotClass: 'text-amber-300',
    hex: '#92400e',
  },
];

export function TickerSettingsPanel() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // States
  const [isActive, setIsActive] = useState(true);
  const [speed, setSpeed] = useState(26);
  const [bgColor, setBgColor] = useState<'forest' | 'dark' | 'lime' | 'harvest'>('forest');
  const [items, setItems] = useState<string[]>(DEFAULT_ITEMS);
  const [newItemText, setNewItemText] = useState('');

  // Fetch initial settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/ticker');
        const data = await res.json();
        if (data.success && data.settings) {
          setIsActive(data.settings.isActive ?? true);
          setSpeed(data.settings.speed ?? 26);
          setBgColor(data.settings.bgColor || 'forest');
          if (Array.isArray(data.settings.items) && data.settings.items.length > 0) {
            setItems(data.settings.items);
          }
        }
      } catch (err) {
        console.error('Error load ticker settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newItemText.trim();
    if (!clean) return;

    setItems((prev) => [...prev, clean.toUpperCase()]);
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast({
        title: 'Minimal 1 Teks',
        message: 'Setidaknya harus ada satu kalimat berjalan di dalam pita ticker.',
        type: 'error',
      });
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleUpdateItemText = (index: number, val: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleResetDefault = () => {
    setIsActive(true);
    setSpeed(26);
    setBgColor('forest');
    setItems(DEFAULT_ITEMS);
    showToast({
      title: 'Direset ke Default',
      message: 'Pengaturan dikembalikan ke setelan awal. Klik Simpan untuk menerapkan.',
      type: 'info',
    });
  };

  const handleSave = async () => {
    const validItems = items.map((i) => i.trim()).filter((i) => i.length > 0);
    if (validItems.length === 0) {
      showToast({
        title: 'Teks Kosong',
        message: 'Mohon masukkan minimal satu kalimat informasi.',
        type: 'error',
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/ticker', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive,
          speed,
          bgColor,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan.');

      // Simpan langsung ke localStorage agar instan tanpa flicker saat refresh
      try {
        localStorage.setItem(
          'koperasi_ticker_settings',
          JSON.stringify({
            isActive,
            speed,
            bgColor,
            items: validItems,
          })
        );
        window.dispatchEvent(new Event('ticker_settings_updated'));
      } catch {}

      showToast({
        title: 'Pengaturan Berhasil Disimpan',
        message: 'Tampilan teks berjalan di landing page telah berhasil diperbarui.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan sistem.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentPreset = COLOR_PRESETS.find((p) => p.id === bgColor) || COLOR_PRESETS[0];
  const previewItems = [...items, ...items];

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        <p className="text-xs text-slate-500 font-medium">Memuat pengaturan teks berjalan...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-5 pb-12 min-w-0">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs w-full min-w-0">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pengaturan Konten Tampilan Web</span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Teks Berjalan Landing Page (Running Text)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Kelola kalimat pengumuman, kecepatan gerak, dan warna tampilan pita banner berjalan yang terletak tepat di bawah navbar halaman depan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 sm:px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Preview Box */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold text-slate-800 truncate">Pratinjau Langsung (Live Preview)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium shrink-0">
            Status: {isActive ? '🟢 Aktif Tayang' : '⚪ Dinonaktifkan'}
          </span>
        </div>

        {/* The Actual Preview Strip */}
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {isActive ? (
            <div
              className={`relative w-full min-w-0 overflow-hidden ${currentPreset.bgClass} ${currentPreset.textClass} py-1.5 border-b border-black/10 select-none`}
            >
              {/* Edge Fade */}
              <div
                className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, ${currentPreset.hex}, transparent)`,
                }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none"
                style={{
                  background: `linear-gradient(to left, ${currentPreset.hex}, transparent)`,
                }}
              />

              <div className="relative w-full min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                <div
                  className="animate-marquee-infinite items-center gap-5 sm:gap-8"
                  style={{ animationDuration: `${speed}s`, animationPlayState: 'running' }}
                >
                  {previewItems.map((item, idx) => (
                    <div key={`${item}-${idx}`} className="flex items-center gap-5 sm:gap-8 shrink-0">
                      <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap leading-tight">
                        {item}
                      </span>
                      <span className={`${currentPreset.dotClass} text-xs font-black shrink-0 leading-none`}>
                        •
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 italic">
              Pita banner teks berjalan saat ini sedang dinonaktifkan dan tidak akan muncul di halaman landing page.
            </div>
          )}
        </div>
      </div>

      {/* Grid Settings: Kecepatan & Warna */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-w-0">
        {/* Card: Status & Kecepatan */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 w-full min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800">Status & Kecepatan Bergerak</h2>
          </div>

          {/* Toggle Switch Aktif */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800">Tampilkan Banner di Landing Page</div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                Nyalakan untuk menampilkan pita banner di bawah navbar
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                isActive ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                  isActive ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Slider Kecepatan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-slate-700">Durasi Perputaran Teks:</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                {speed}s ({speed <= 18 ? 'Cepat' : speed <= 30 ? 'Normal' : 'Santai'})
              </span>
            </div>

            <input
              type="range"
              min={12}
              max={50}
              step={2}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Cepat (12s)</span>
              <span>Normal (26s)</span>
              <span>Lambat (50s)</span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSpeed(16)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition border ${
                  speed === 16
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cepat (16s)
              </button>
              <button
                type="button"
                onClick={() => setSpeed(26)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition border ${
                  speed === 26
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Normal (26s)
              </button>
              <button
                type="button"
                onClick={() => setSpeed(38)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition border ${
                  speed === 38
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Santai (38s)
              </button>
            </div>
          </div>
        </div>

        {/* Card: Pilihan Warna Tema */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 w-full min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Palette className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800">Warna Latar Belakang Banner</h2>
          </div>

          <div className="space-y-2">
            {COLOR_PRESETS.map((preset) => {
              const isSelected = bgColor === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setBgColor(preset.id as any)}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2.5 w-full min-w-0 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl shrink-0 shadow-2xs border border-black/10"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{preset.desc}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card: Manajemen Kalimat Teks Berjalan */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <h2 className="text-sm font-bold text-slate-800">Daftar Kalimat Informasi ({items.length} Kalimat)</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Teks otomatis ditampilkan dalam huruf kapital dan dipisahkan titik (•)
          </span>
        </div>

        {/* Input Tambah Teks Baru */}
        <form onSubmit={handleAddItem} className="flex gap-2 w-full min-w-0">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Ketik kalimat baru untuk ditambahkan ke banner..."
            className="flex-1 min-w-0 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-medium"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </form>

        {/* List of Ticker Items */}
        <div className="space-y-2 w-full min-w-0">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition w-full min-w-0"
            >
              <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">
                {idx + 1}
              </span>

              <input
                type="text"
                value={item}
                onChange={(e) => handleUpdateItemText(idx, e.target.value.toUpperCase())}
                className="flex-1 min-w-0 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition disabled:opacity-30 cursor-pointer"
                  title="Pindah ke atas"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === items.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition disabled:opacity-30 cursor-pointer"
                  title="Pindah ke bawah"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition cursor-pointer"
                  title="Hapus kalimat ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
