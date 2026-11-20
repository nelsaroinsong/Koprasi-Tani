'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Phone,
  ExternalLink,
  Pencil,
  Loader2,
  Satellite,
  Map as MapIcon,
  Plus,
  Minus,
  LocateFixed,
} from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { createKoperasiPinElement } from '@/lib/koperasi-map-pin';
import { applyBaseLayer, buildBaseMapStyle, MAP_MAX_ZOOM } from '@/lib/map-tiles';
import 'maplibre-gl/dist/maplibre-gl.css';

interface KoperasiInfo {
  namaKoperasi: string;
  alamat: string;
  telepon: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_ZOOM = 16.5;

/**
 * Kartu peta lokasi kantor / gudang Koperasi di Dashboard admin.
 * Tampilan & tile peta disamakan dengan peta pemilihan lahan di checkout Sewa Alat
 * (components/LocationMapPreview.tsx): Satelit Hybrid default, toggle Satelit/Peta,
 * kontrol zoom, dan pill koordinat.
 */
export function DashboardLocationMap() {
  const { setActiveTab } = useAdmin();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [info, setInfo] = useState<KoperasiInfo | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapStyleMode, setMapStyleMode] = useState<'streets' | 'hybrid'>('hybrid');

  useEffect(() => {
    let active = true;
    fetch('/api/koperasi/info')
      .then((res) => res.json())
      .then((data) => {
        if (active && typeof data?.latitude === 'number') setInfo(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Inisialisasi MapLibre setelah koordinat koperasi tersedia
  useEffect(() => {
    if (!info || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = await import('maplibre-gl');
      if (typeof maplibregl.setWorkerUrl === 'function') {
        maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      }
      if (cancelled || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: buildBaseMapStyle('hybrid'),
        center: [info.longitude, info.latitude],
        zoom: DEFAULT_ZOOM,
        attributionControl: { compact: true },
        maxZoom: MAP_MAX_ZOOM,
        // Scroll halaman dashboard tidak ikut men-zoom peta (zoom: tombol +/- atau Ctrl + scroll)
        cooperativeGestures: true,
      });
      mapRef.current = map;

      // Pin "Kantor Koperasi" (helper bersama, lihat lib/koperasi-map-pin.ts)
      const markerEl = createKoperasiPinElement();
      new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
        .setLngLat([info.longitude, info.latitude])
        .addTo(map);

      map.on('load', () => {
        if (cancelled) return;
        try {
          map.resize();
        } catch {}
        setIsMapReady(true);
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [info]);

  // Peta menyesuaikan ukuran saat sidebar dibuka/tutup atau layar di-resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      try {
        mapRef.current?.resize();
      } catch {}
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sinkronisasi layer Satelit Hybrid vs Peta Jalan
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    applyBaseLayer(map, mapStyleMode);
  }, [mapStyleMode, isMapReady]);

  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 250 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 250 });
  const handleRecenter = () => {
    if (!info) return;
    mapRef.current?.easeTo({ center: [info.longitude, info.latitude], zoom: DEFAULT_ZOOM, duration: 450 });
  };

  const mapsUrl = info
    ? `https://www.google.com/maps/search/?api=1&query=${info.latitude},${info.longitude}`
    : '#';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Kanvas Peta (tinggi eksplisit: maplibre-gl.css memaksa position:relative pada container) */}
      <div
        style={{ height: '300px', minHeight: '300px', width: '100%', maxWidth: '100%' }}
        className="relative w-full max-w-full min-w-0 bg-[#e5e8e0] overflow-hidden"
      >
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

        {!isMapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-[#526046] gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat peta lokasi koperasi...
          </div>
        )}

        {/* Toggle Layer Satelit vs Peta Jalan (Kiri Atas) */}
        <div className="absolute top-2.5 left-2.5 z-10 inline-flex rounded-xl bg-white/95 backdrop-blur-sm p-0.5 border border-[#dce1d6] shadow-sm">
          <button
            type="button"
            onClick={() => setMapStyleMode('hybrid')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              mapStyleMode === 'hybrid' ? 'bg-[#233414] text-white' : 'text-[#526046] hover:text-[#1a2610]'
            }`}
          >
            <Satellite className="w-3 h-3" />
            <span>Satelit</span>
          </button>
          <button
            type="button"
            onClick={() => setMapStyleMode('streets')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              mapStyleMode === 'streets' ? 'bg-[#233414] text-white' : 'text-[#526046] hover:text-[#1a2610]'
            }`}
          >
            <MapIcon className="w-3 h-3" />
            <span>Peta</span>
          </button>
        </div>

        {/* Kontrol Pusatkan & Zoom (Kanan Bawah) */}
        <div className="absolute bottom-9 right-2.5 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleRecenter}
            className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white border border-[#dce1d6] shadow-sm flex items-center justify-center text-[#1a2610] cursor-pointer"
            title="Pusatkan ke Kantor Koperasi"
          >
            <LocateFixed className="w-4 h-4 text-[#233414]" />
          </button>
          <div className="flex flex-col rounded-xl bg-white/95 border border-[#dce1d6] shadow-sm overflow-hidden divide-y divide-[#dce1d6]">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-8 h-7 flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] cursor-pointer"
              title="Perbesar"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-8 h-7 flex items-center justify-center text-[#1a2610] hover:bg-[#f4f5f1] cursor-pointer"
              title="Perkecil"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pill Koordinat (Kiri Bawah) */}
        {info && (
          <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a2610]/85 backdrop-blur-sm text-white text-[10px] font-mono">
              {info.latitude.toFixed(5)}, {info.longitude.toFixed(5)}
            </span>
          </div>
        )}
      </div>

      {/* Info alamat */}
      <div className="p-5 flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-200/90">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14.5px] font-semibold text-slate-900 tracking-tight">Lokasi Koperasi</h3>
              <p className="text-[12px] text-slate-500 truncate">
                {info?.namaKoperasi || 'Koperasi Sinar Pagi Sejahtera'}
              </p>
            </div>
          </div>

          <p className="text-[12.5px] text-slate-600 mt-4 leading-relaxed">
            {info?.alamat || 'Memuat alamat...'}
          </p>

          {info?.telepon && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500">
              <Phone className="w-3.5 h-3.5" />
              <span>{info.telepon}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11.5px] font-medium text-slate-700 hover:text-slate-900 transition shadow-2xs flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka di Google Maps
          </a>
          <button
            type="button"
            onClick={() => setActiveTab('Produk dan Layanan', 'Lokasi Gudang', { address: info?.alamat, from: 'dashboard' })}
            className="h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11.5px] font-medium text-slate-700 hover:text-slate-900 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Ubah Lokasi
          </button>
        </div>
      </div>
    </div>
  );
}
