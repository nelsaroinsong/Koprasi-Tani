'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Avatar } from '@humation/react';
import { humation1, manifestJson } from '@humation/assets-humation-1';
import {
  X,
  Sparkles,
  Check,
  Loader2,
  RefreshCw,
  Palette,
  Smile,
  Shirt,
  Glasses,
  Gem,
} from 'lucide-react';

interface HumationAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
  userEmail?: string;
  currentAvatarUrl?: string;
}

// Preset Warna Pilihan
const COLOR_PRESETS = {
  skin: [
    { label: 'Putih Cerah', value: 'FFFFFF' },
    { label: 'Kuning Langsat', value: 'FCE2C4' },
    { label: 'Sawo Matang', value: 'E5BA93' },
    { label: 'Cokelat Hangat', value: 'C68A56' },
    { label: 'Eksotis Gelap', value: '8D5524' },
  ],
  hair: [
    { label: 'Hitam Alami', value: '1A1A1A' },
    { label: 'Cokelat Tua', value: '4A2E18' },
    { label: 'Cokelat Muda', value: '8D5B2E' },
    { label: 'Pirang Hangat', value: 'E1B057' },
    { label: 'Abu-Abu Elegan', value: '9CA3AF' },
    { label: 'Merah Bata', value: '9E3D24' },
  ],
  clothes: [
    { label: 'Hijau Daun (Koperasi)', value: '15803D' },
    { label: 'Hijau Emerald', value: '059669' },
    { label: 'Biru Laut', value: '1D4ED8' },
    { label: 'Navy Gelap', value: '1E293B' },
    { label: 'Kuning Kunyit', value: 'D97706' },
    { label: 'Merah Terakota', value: 'B91C1C' },
    { label: 'Putih Bersih', value: 'FFFFFF' },
    { label: 'Abu-Abu Muda', value: 'E2E8F0' },
  ],
  background: [
    { label: 'Krem Lembut', value: 'F6F5F4' },
    { label: 'Mint Segar', value: 'E8F5E9' },
    { label: 'Biru Langit', value: 'E0F2FE' },
    { label: 'Kuning Pagi', value: 'FEF3C7' },
    { label: 'Merah Muda Pucat', value: 'FCE7F3' },
    { label: 'Abu-Abu Minimalis', value: 'F1F5F9' },
  ],
};

export default function HumationAvatarModal({
  isOpen,
  onClose,
  onSelectAvatar,
  userEmail,
  currentAvatarUrl,
}: HumationAvatarModalProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Bagian-bagian yang dipilih
  const [selections, setSelections] = useState<Record<string, string>>({
    head: 'hm1-p-000001',
    body: 'hm1-p-000025',
    bottom: 'hm1-p-000033',
    item: 'hm1-p-000045', // Sprout 🌱 (tunas cocok dengan tema pertanian)
    glasses: 'hm1-p-000056', // None
  });

  // Pilihan warna
  const [colors, setColors] = useState<Record<string, string>>({
    hair: '1A1A1A',
    skin: 'FCE2C4',
    clothes: '15803D',
    bottom: '1E293B',
  });

  const [backgroundColor, setBackgroundColor] = useState<string>('E8F5E9');
  const [activeTab, setActiveTab] = useState<'head' | 'body' | 'glasses' | 'item' | 'color'>('head');
  const [isSavingToR2, setIsSavingToR2] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Kelompokkan part dari manifestJson
  const partsBySlot = useMemo(() => {
    const grouped: Record<string, Array<{ id: string; name: string }>> = {
      head: [],
      body: [],
      bottom: [],
      glasses: [],
      item: [],
    };

    if (manifestJson?.parts) {
      for (const part of manifestJson.parts) {
        if (grouped[part.selectionSlot]) {
          grouped[part.selectionSlot].push({
            id: part.id,
            name: part.name || part.id,
          });
        }
      }
    }
    return grouped;
  }, []);

  // Fungsi Randomize / Acak Karakter
  const handleRandomize = useCallback(() => {
    const randomPick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    setSelections({
      head: randomPick(partsBySlot.head)?.id || 'hm1-p-000001',
      body: randomPick(partsBySlot.body)?.id || 'hm1-p-000025',
      bottom: randomPick(partsBySlot.bottom)?.id || 'hm1-p-000033',
      glasses: randomPick(partsBySlot.glasses)?.id || 'hm1-p-000056',
      item: Math.random() > 0.4 ? randomPick(partsBySlot.item)?.id || 'hm1-p-000041' : 'hm1-p-000041',
    });

    setColors({
      hair: randomPick(COLOR_PRESETS.hair).value,
      skin: randomPick(COLOR_PRESETS.skin).value,
      clothes: randomPick(COLOR_PRESETS.clothes).value,
      bottom: '1E293B',
    });

    setBackgroundColor(randomPick(COLOR_PRESETS.background).value);
  }, [partsBySlot]);

  // Fungsi Render SVG ke PNG & Upload ke Cloudflare R2
  const handleSaveAndUpload = async () => {
    if (!svgRef.current) return;

    try {
      setIsSavingToR2(true);
      setErrorMsg(null);

      // 1. Ekstrak SVG XML
      const svgElement = svgRef.current;
      const serializer = new XMLSerializer();
      let svgXml = serializer.serializeToString(svgElement);

      if (!svgXml.includes('xmlns=')) {
        svgXml = svgXml.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      }

      // 2. Render SVG ke HTML Canvas lalu konversi ke Blob PNG
      const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const size = 512; // Ukuran resolusi tajam 512x512
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              URL.revokeObjectURL(blobUrl);
              reject(new Error('Canvas konteks 2D tidak tersedia'));
              return;
            }
            ctx.drawImage(img, 0, 0, size, size);
            URL.revokeObjectURL(blobUrl);

            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Gagal merender gambar PNG dari avatar'));
            }, 'image/png');
          } catch (e) {
            URL.revokeObjectURL(blobUrl);
            reject(e);
          }
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Gagal memuat elemen SVG untuk diekspor'));
        };
        img.src = blobUrl;
      });

      // 3. Buat objek File dan kirim ke Cloudflare R2 via /api/upload/profile
      const file = new File([pngBlob], `humation-avatar-${Date.now()}.png`, {
        type: 'image/png',
      });

      const formData = new FormData();
      formData.append('file', file);
      if (userEmail) {
        formData.append('email', userEmail);
      }
      if (currentAvatarUrl) {
        formData.append('oldUrl', currentAvatarUrl);
      }

      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah avatar ke Cloudflare R2');
      }

      // Berhasil, kembalikan URL R2 ke halaman Onboarding
      onSelectAvatar(data.url);
      onClose();
    } catch (err: any) {
      console.error('Error saat menyimpan avatar Humation ke R2:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan avatar.');
    } finally {
      setIsSavingToR2(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Kustomisasi Avatar Humation
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Generator avatar lokal mandiri &bull; Tersimpan ke Cloudflare R2
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 2 Kolom (Preview Kiri, Pilihan Kanan) */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto flex-1">
          {/* Kolom Kiri: Live Preview & Tombol Acak */}
          <div className="md:col-span-5 flex flex-col items-center justify-center gap-3 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70">
            <div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border-4 border-white shadow-md overflow-hidden flex items-center justify-center transition-all"
              style={{ backgroundColor: `#${backgroundColor}` }}
            >
              <Avatar
                ref={svgRef}
                assets={humation1}
                selections={selections}
                colors={colors}
                background={backgroundColor}
                crop="avatar"
                size={176}
                title="Preview Avatar"
              />
            </div>

            <button
              type="button"
              onClick={handleRandomize}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Acak Karakter</span>
            </button>

            {/* Pilihan Warna Latar Belakang */}
            <div className="w-full pt-2 border-t border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 text-center">
                Warna Latar
              </span>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.background.map((bg) => (
                  <button
                    key={bg.value}
                    type="button"
                    onClick={() => setBackgroundColor(bg.value)}
                    className={`w-6 h-6 rounded-full border-2 transition cursor-pointer shadow-2xs ${
                      backgroundColor === bg.value
                        ? 'border-emerald-600 ring-2 ring-emerald-600/30 scale-110'
                        : 'border-white hover:scale-105'
                    }`}
                    style={{ backgroundColor: `#${bg.value}` }}
                    title={bg.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Tab Kategori & Pemilih Item */}
          <div className="md:col-span-7 flex flex-col min-w-0">
            {/* Navigasi Tab */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('head')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  activeTab === 'head'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                <span>Rambut ({partsBySlot.head.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('body')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  activeTab === 'body'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Pakaian ({partsBySlot.body.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('glasses')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  activeTab === 'glasses'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Glasses className="w-3.5 h-3.5" />
                <span>Kacamata</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('item')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  activeTab === 'item'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Gem className="w-3.5 h-3.5" />
                <span>Aksesoris</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('color')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  activeTab === 'color'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Warna</span>
              </button>
            </div>

            {/* Konten Tab */}
            <div className="py-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {/* Tab: Gaya Rambut (Head) */}
              {activeTab === 'head' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {partsBySlot.head.map((part) => {
                    const isSelected = selections.head === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelections((prev) => ({ ...prev, head: part.id }))}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between text-xs font-semibold ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="capitalize truncate">{part.name.replace(/-/g, ' ')}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab: Pakaian (Body) */}
              {activeTab === 'body' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {partsBySlot.body.map((part) => {
                    const isSelected = selections.body === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelections((prev) => ({ ...prev, body: part.id }))}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between text-xs font-semibold ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="capitalize truncate">{part.name.replace(/-/g, ' ')}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab: Kacamata (Glasses) */}
              {activeTab === 'glasses' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {partsBySlot.glasses.map((part) => {
                    const isSelected = selections.glasses === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelections((prev) => ({ ...prev, glasses: part.id }))}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between text-xs font-semibold ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="capitalize truncate">{part.name.replace(/-/g, ' ')}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab: Aksesoris (Item) */}
              {activeTab === 'item' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {partsBySlot.item.map((part) => {
                    const isSelected = selections.item === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelections((prev) => ({ ...prev, item: part.id }))}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between text-xs font-semibold ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="capitalize truncate">{part.name.replace(/-/g, ' ')}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab: Warna Pilihan (Hair, Skin, Clothes) */}
              {activeTab === 'color' && (
                <div className="space-y-4">
                  {/* Warna Rambut */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Warna Rambut
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.hair.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColors((prev) => ({ ...prev, hair: c.value }))}
                          className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                            colors.hair === c.value
                              ? 'border-emerald-600 ring-2 ring-emerald-600/40 scale-110'
                              : 'border-white hover:scale-105'
                          }`}
                          style={{ backgroundColor: `#${c.value}` }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Warna Kulit */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Warna Kulit
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.skin.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColors((prev) => ({ ...prev, skin: c.value }))}
                          className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                            colors.skin === c.value
                              ? 'border-emerald-600 ring-2 ring-emerald-600/40 scale-110'
                              : 'border-white hover:scale-105'
                          }`}
                          style={{ backgroundColor: `#${c.value}` }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Warna Baju */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Warna Pakaian
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.clothes.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColors((prev) => ({ ...prev, clothes: c.value }))}
                          className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                            colors.clothes === c.value
                              ? 'border-emerald-600 ring-2 ring-emerald-600/40 scale-110'
                              : 'border-white hover:scale-105'
                          }`}
                          style={{ backgroundColor: `#${c.value}` }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="px-5 py-2 bg-red-50 text-red-700 text-xs border-t border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingToR2}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSaveAndUpload}
            disabled={isSavingToR2}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isSavingToR2 ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Gunakan Avatar Ini</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
