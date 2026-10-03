'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, LocateFixed, Loader2, ExternalLink, X, Map as MapIcon } from 'lucide-react';

interface LocationMapPreviewProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const QUICK_AREAS = [
  'Kolongan, Kalawat',
  'Airmadidi Atas',
  'Kauditan',
  'Dimembe',
  'Wori',
  'Likupang',
];

export default function LocationMapPreview({
  value,
  onChange,
  label = 'Lokasi Lahan Kebun (Minahasa Utara)',
  placeholder = 'Contoh: Desa Kolongan, Kec. Kalawat',
  required = false,
  className = '',
}: LocationMapPreviewProps) {
  const [debouncedLocation, setDebouncedLocation] = useState(value);
  const [isDetecting, setIsDetecting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Debounce 500ms agar iframe maps tidak terus me-refresh saat pengguna mengetik cepat
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocation(value);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [value]);

  // Siapkan query pencarian untuk Google Maps Embed
  const mapQuery = useMemo(() => {
    const trimmed = debouncedLocation?.trim();
    if (!trimmed || trimmed.length < 3) return null;

    // Pastikan diarahkan ke Minahasa Utara, Sulawesi Utara jika belum tertera
    const lower = trimmed.toLowerCase();
    const hasMinahasa = lower.includes('minahasa') || lower.includes('sulut') || lower.includes('sulawesi');
    return hasMinahasa ? trimmed : `${trimmed}, Minahasa Utara, Sulawesi Utara`;
  }, [debouncedLocation]);

  // Handle Deteksi Lokasi Otomatis via Geolocation GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Perangkat Anda tidak mendukung fitur deteksi GPS.');
      return;
    }

    setIsDetecting(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.address) {
              onChange(data.address);
              return;
            }
          }
          // Fallback koordinat jika geocode nama desa tidak berhasil
          onChange(`Titik Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } catch {
          onChange(`Titik Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        if (err.code === 1) {
          setGpsError('Izin akses lokasi GPS ditolak oleh browser.');
        } else {
          setGpsError('Gagal mendeteksi koordinat GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label & Tombol GPS */}
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs sm:text-sm font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={isDetecting}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition border border-emerald-200 cursor-pointer disabled:opacity-50"
          title="Gunakan titik GPS saat ini"
        >
          {isDetecting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
              <span>Mencari GPS...</span>
            </>
          ) : (
            <>
              <LocateFixed className="w-3 h-3 text-emerald-700" />
              <span>Deteksi GPS</span>
            </>
          )}
        </button>
      </div>

      {/* Input Field dengan Icon */}
      <div className="relative">
        <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (gpsError) setGpsError(null);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400"
          required={required}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
            title="Hapus input lokasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Pesan Error GPS jika ada */}
      {gpsError && (
        <p className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
          {gpsError} Silakan ketik nama desa/kecamatan secara manual.
        </p>
      )}

      {/* Rekomendasi Chip Wilayah Minahasa Utara jika belum diisi */}
      {!value && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Saran cepat:</span>
          {QUICK_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => onChange(`Desa ${area}`)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition cursor-pointer"
            >
              +{area}
            </button>
          ))}
        </div>
      )}

      {/* PREVIEW MAPS: Ditampilkan jika lokasi sudah diisi */}
      {mapQuery && (
        <div className="mt-2 rounded-xl overflow-hidden border border-emerald-200/80 bg-slate-50 shadow-2xs transition-all duration-300">
          {/* Header Bar Peta */}
          <div className="px-3 py-1.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold truncate max-w-[70%]">
              <MapIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Preview Peta: {debouncedLocation}</span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs hover:bg-emerald-100/50 transition shrink-0"
              title="Buka peta lengkap di Google Maps"
            >
              <span>Buka Maps</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Iframe Peta Interaktif */}
          <div className="relative w-full h-44 sm:h-52 bg-slate-100">
            <iframe
              title={`Peta Lokasi ${debouncedLocation}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen={false}
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              className="w-full h-full"
            />
          </div>

          {/* Footer Bar Peta */}
          <div className="px-3 py-1 bg-white text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100">
            <span>🗺️ Titik estimasi lahan di Minahasa Utara</span>
            <span className="text-[9px] text-slate-400">Dapat digeser & di-zoom</span>
          </div>
        </div>
      )}
    </div>
  );
}
