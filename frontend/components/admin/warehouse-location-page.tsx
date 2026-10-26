'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  MapPin,
  LocateFixed,
  Search,
  Loader2,
  Save,
  Info,
  ExternalLink,
  Layers,
  Compass,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Crosshair,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';

interface WarehouseLocationPageProps {
  initialAddress?: string;
  onBack: () => void;
}

// Koordinat awal default (Desa Kolongan, Kec. Kalawat, Minahasa Utara)
const DEFAULT_LAT = 1.4334;
const DEFAULT_LNG = 124.9312;
const DEFAULT_ADDRESS =
  'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara';

type LayerType = 'hybrid' | 'streets' | 'terrain';

export function WarehouseLocationPage({ initialAddress, onBack }: WarehouseLocationPageProps) {
  const { showToast } = useToast();

  const [address, setAddress] = useState(initialAddress || DEFAULT_ADDRESS);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  const [activeLayer, setActiveLayer] = useState<LayerType>('hybrid');
  const [searchPlaceQuery, setSearchPlaceQuery] = useState('');
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markerInstanceRef = useRef<MapLibreMarker | null>(null);
  const activeLayerRef = useRef<LayerType>('hybrid');

  // Parse koordinat jika ada di string initialAddress (misal "Titik GPS (1.433400, 124.931200)")
  useEffect(() => {
    if (initialAddress) {
      const match = initialAddress.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (match) {
        const parsedLat = parseFloat(match[1]);
        const parsedLng = parseFloat(match[2]);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          setCoordinates({ lat: parsedLat, lng: parsedLng });
        }
      }
    }
  }, [initialAddress]);

  // Reverse Geocoding ke API Koperasi / Nominatim untuk mendapatkan nama jalan/desa
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        setIsReverseGeocoding(true);
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (res.ok && data?.address) {
          const cleanAddr = `Koperasi Sinar Pagi Sejahtera — ${data.address}`;
          setAddress(cleanAddr);
          showToast({
            title: 'Alamat Diperbarui dari Peta',
            message: data.address,
            type: 'info',
          });
        } else {
          const fallback = `Koperasi Sinar Pagi Sejahtera — Titik GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
          setAddress(fallback);
        }
      } catch (err) {
        console.error('Reverse geocode error:', err);
        const fallback = `Koperasi Sinar Pagi Sejahtera — Titik GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        setAddress(fallback);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [showToast]
  );

  // Inisialisasi Peta MapLibre GL dengan Google Satellite/Hybrid & Roadmap Tiles (Bebas Watermark & Sangat Detail)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const maplibregl = await import('maplibre-gl');

      if (!isMounted || !mapContainerRef.current) return;

      const initialLat = coordinates.lat;
      const initialLng = coordinates.lng;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            // Google Hybrid: High-Res Aerial Satellite + Jalan + Nama Gedung & Landmark
            'google-hybrid': {
              type: 'raster',
              tiles: [
                'https://mt0.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}',
                'https://mt1.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}',
                'https://mt2.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}',
                'https://mt3.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}',
              ],
              tileSize: 256,
              maxzoom: 21,
            },
            // Google Roadmap: Peta Jalan Vektor Bersih
            'google-streets': {
              type: 'raster',
              tiles: [
                'https://mt0.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}',
                'https://mt1.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}',
                'https://mt2.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}',
                'https://mt3.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}',
              ],
              tileSize: 256,
              maxzoom: 21,
            },
            // Google Terrain: Kontur & Relief Fisik
            'google-terrain': {
              type: 'raster',
              tiles: [
                'https://mt0.google.com/vt/lyrs=p&hl=id&x={x}&y={y}&z={z}',
                'https://mt1.google.com/vt/lyrs=p&hl=id&x={x}&y={y}&z={z}',
                'https://mt2.google.com/vt/lyrs=p&hl=id&x={x}&y={y}&z={z}',
                'https://mt3.google.com/vt/lyrs=p&hl=id&x={x}&y={y}&z={z}',
              ],
              tileSize: 256,
              maxzoom: 21,
            },
          },
          layers: [
            {
              id: 'streets-layer',
              type: 'raster',
              source: 'google-streets',
              layout: { visibility: activeLayerRef.current === 'streets' ? 'visible' : 'none' },
            },
            {
              id: 'terrain-layer',
              type: 'raster',
              source: 'google-terrain',
              layout: { visibility: activeLayerRef.current === 'terrain' ? 'visible' : 'none' },
            },
            {
              id: 'hybrid-layer',
              type: 'raster',
              source: 'google-hybrid',
              layout: { visibility: activeLayerRef.current === 'hybrid' ? 'visible' : 'none' },
            },
          ],
        },
        center: [initialLng, initialLat],
        zoom: 16.5,
        pitch: 0,
        maxPitch: 65,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Custom Marker Element yang Modern & Tajam dengan Efek Radar Pulse
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-warehouse-pin-wrapper cursor-grab active:cursor-grabbing select-none';
      markerEl.style.width = '42px';
      markerEl.style.height = '48px';
      markerEl.style.position = 'relative';
      markerEl.style.transform = 'translate(-50%, -100%)';

      markerEl.innerHTML = `
        <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 22px; height: 8px; background: rgba(5, 150, 105, 0.45); border-radius: 50%; filter: blur(1.5px); animation: pulse 2s infinite;"></div>
        <div style="position: relative; width: 42px; height: 48px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.4)); transition: transform 0.15s ease;">
          <svg viewBox="0 0 24 28" width="42" height="48" fill="none">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 16 12 16s12-7.5 12-16c0-6.627-5.373-12-12-12z" fill="#059669" stroke="#ffffff" stroke-width="1.8"/>
            <circle cx="12" cy="11.5" r="7" fill="#ffffff"/>
            <path d="M8.5 15V11.5L12 8.5L15.5 11.5V15C15.5 15.3 15.3 15.5 15 15.5H9C8.7 15.5 8.5 15.3 8.5 15Z" fill="#059669"/>
          </svg>
        </div>
      `;

      const marker = new maplibregl.Marker({
        element: markerEl,
        draggable: true,
      })
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      markerInstanceRef.current = marker;

      // Event saat marker selesai digeser (dragend)
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        setCoordinates({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });

      // Event saat peta diklik langsung
      map.on('click', (e: any) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]);
        setCoordinates({ lat, lng });
        reverseGeocode(lat, lng);
      });

      map.on('load', () => {
        setIsMapReady(true);
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Ganti Layer Tampilan Peta (Satelit Hybrid, Peta Jalan, Medan)
  const handleSwitchLayer = (layer: LayerType) => {
    setActiveLayer(layer);
    activeLayerRef.current = layer;
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded()) {
      map.setLayoutProperty('streets-layer', 'visibility', layer === 'streets' ? 'visible' : 'none');
      map.setLayoutProperty('terrain-layer', 'visibility', layer === 'terrain' ? 'visible' : 'none');
      map.setLayoutProperty('hybrid-layer', 'visibility', layer === 'hybrid' ? 'visible' : 'none');
    }
  };

  // Navigasi Peta: Zoom In
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn({ duration: 300 });
    }
  };

  // Navigasi Peta: Zoom Out
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut({ duration: 300 });
    }
  };

  // Navigasi Peta: Reset Orientasi & Pitch ke Utara
  const handleResetOrientation = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        bearing: 0,
        pitch: 0,
        duration: 500,
      });
    }
  };

  // Navigasi Peta: Pusatkan Kamera ke Pin Gudang
  const handleCenterOnMarker = () => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      const pos = markerInstanceRef.current.getLngLat();
      mapInstanceRef.current.flyTo({
        center: [pos.lng, pos.lat],
        zoom: 17,
        essential: true,
      });
    }
  };

  // Toggle Fullscreen Peta
  const handleToggleFullscreen = () => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => mapInstanceRef.current?.resize(), 200);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => mapInstanceRef.current?.resize(), 200);
      });
    }
  };

  // Deteksi GPS Geolocation Peramban Pengguna
  const handleDetectCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast({
        title: 'GPS Tidak Didukung',
        message: 'Peramban Anda tidak mendukung deteksi posisi GPS.',
        type: 'error',
      });
      return;
    }

    setIsDetectingGPS(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoordinates({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current && markerInstanceRef.current) {
          markerInstanceRef.current.setLngLat([longitude, latitude]);
          mapInstanceRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 17.5,
            essential: true,
          });
        }

        reverseGeocode(latitude, longitude);
        setIsDetectingGPS(false);

        showToast({
          title: 'Lokasi GPS Ditemukan',
          message: 'Peta telah digeser ke posisi GPS perangkat Anda saat ini.',
          type: 'success',
        });
      },
      (err) => {
        setIsDetectingGPS(false);
        if (err.code === 1) {
          showToast({
            title: 'Izin GPS Ditolak',
            message: 'Silakan izinkan akses lokasi pada peramban Anda.',
            type: 'warning',
          });
          return;
        }
        showToast({
          title: 'Gagal Mendeteksi GPS',
          message: 'Pastikan sinyal GPS aktif atau geser pin peta secara manual.',
          type: 'error',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Pencarian Tempat / Desa via Nominatim Search API
  const handleSearchPlace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchPlaceQuery.trim();
    if (!query) return;

    try {
      setIsSearchingPlace(true);
      const searchQueryFull = query.toLowerCase().includes('minahasa')
        ? query
        : `${query}, Minahasa Utara, Sulawesi Utara, Indonesia`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          searchQueryFull
        )}&limit=1&accept-language=id`,
        {
          headers: {
            'User-Agent': 'KoperasiSinarPagiSejahtera/1.0',
          },
        }
      );

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const place = data[0];
        const newLat = parseFloat(place.lat);
        const newLng = parseFloat(place.lon);

        setCoordinates({ lat: newLat, lng: newLng });

        if (mapInstanceRef.current && markerInstanceRef.current) {
          markerInstanceRef.current.setLngLat([newLng, newLat]);
          mapInstanceRef.current.flyTo({
            center: [newLng, newLat],
            zoom: 16.5,
            essential: true,
          });
        }

        setAddress(`Koperasi Sinar Pagi Sejahtera — ${place.display_name}`);

        showToast({
          title: 'Lokasi Ditemukan',
          message: place.display_name,
          type: 'success',
        });
      } else {
        showToast({
          title: 'Tempat Tidak Ditemukan',
          message: 'Coba gunakan kata kunci desa, kecamatan, atau jalan yang lebih spesifik.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Gagal Mencari Lokasi',
        message: err.message || 'Terjadi gangguan saat menghubungi server pencarian lokasi.',
        type: 'error',
      });
    } finally {
      setIsSearchingPlace(false);
    }
  };

  // Simpan Alamat & Koordinat ke Database Koperasi (/api/koperasi/info)
  const handleSave = async () => {
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      showToast({
        title: 'Alamat Tidak Boleh Kosong',
        message: 'Mohon masukkan alamat lengkap gudang serah terima.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/koperasi/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alamat: cleanAddress }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan alamat gudang.');
      }

      showToast({
        title: 'Titik Lokasi Gudang Disimpan',
        message: 'Alamat serah terima barang dan pickup point berhasil diperbarui.',
        type: 'success',
      });

      // Kembali ke halaman katalog komoditas
      onBack();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan Alamat',
        message: err.message || 'Terjadi gangguan saat menyimpan ke database.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Tombol Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#ECEEF2] p-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
            title="Kembali ke Katalog Komoditas"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Titik Lokasi & Alamat Gudang Koperasi
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Gudang Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tentukan titik pengambilan barang bagi pembeli dan serah terima hasil panen dari petani dengan mengarahkan pin pada peta satelit/jalan.
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Titik Gudang</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Grid Konten Utama: Panel Form (Kiri) & Interactive Map (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Panel Kiri: Form Alamat & Kontrol GPS (5 Kolom) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card Form Alamat */}
          <div className="bg-white border border-[#ECEEF2] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Detail Alamat Fisik
                </h3>
              </div>
              {isReverseGeocoding && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Membaca alamat...
                </span>
              )}
            </div>

            {/* Input Alamat Fisik Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alamat Gudang / Pickup Point <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara"
                className="w-full text-xs sm:text-[13px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition resize-none leading-relaxed text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Alamat ini akan ditampilkan kepada pembeli pada etalase toko dan informasi serah terima barang.
              </p>
            </div>

            {/* Koordinat GPS Display */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Koordinat GPS Terpilih
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-700 tabular-nums">
                  <span className="text-[10px] text-slate-400 block">Latitude</span>
                  {coordinates.lat.toFixed(6)}
                </div>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-700 tabular-nums">
                  <span className="text-[10px] text-slate-400 block">Longitude</span>
                  {coordinates.lng.toFixed(6)}
                </div>
              </div>
            </div>

            {/* Tombol Deteksi Lokasi Sekarang (GPS) */}
            <div>
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={isDetectingGPS}
                className="w-full h-10 px-4 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {isDetectingGPS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    <span>Mendeteksi Posisi GPS...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-4 h-4 text-emerald-600" />
                    <span>Gunakan Lokasi GPS Saya Saat Ini</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                Pastikan izin akses lokasi peramban diaktifkan jika berada langsung di lokasi fisik gudang.
              </p>
            </div>
          </div>

          {/* Petunjuk Interaktif */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cara Menentukan Titik Gudang di Peta:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11.5px] text-amber-800/90 pl-1 leading-relaxed">
              <li>
                <strong>Klik Peta:</strong> Klik langsung di area peta atau atap bangunan gudang untuk memindahkan pin.
              </li>
              <li>
                <strong>Tarik (Drag) Pin:</strong> Geser pin hijau hingga tepat berada di depan gerbang atau pintu gudang.
              </li>
              <li>
                <strong>Mode Satelit:</strong> Gunakan tampilan satelit untuk melihat atap gedung, jalan masuk, dan lingkungan sekitar secara nyata.
              </li>
            </ul>
          </div>
        </div>

        {/* Panel Kanan: Interactive Detailed Map View (7 Kolom) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Search Bar Tempat di Atas Peta */}
          <div className="bg-white border border-[#ECEEF2] p-2.5 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPlaceQuery}
                onChange={(e) => setSearchPlaceQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchPlace()}
                placeholder="Cari desa, kecamatan, jalan, atau landmark di Minahasa Utara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearchPlace()}
              disabled={isSearchingPlace || !searchPlaceQuery.trim()}
              className="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSearchingPlace ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mencari...</span>
                </>
              ) : (
                <span>Cari Lokasi</span>
              )}
            </button>
          </div>

          {/* Map Container & Floating Toolbars */}
          <div
            ref={mapWrapperRef}
            className="relative bg-slate-900 border border-[#ECEEF2] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[500px] h-[580px]"
          >
            {/* Map Element */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Top Controls: Layer Switcher (Satelit / Jalan / Medan) */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200/90 p-1 rounded-xl shadow-lg">
              <button
                type="button"
                onClick={() => handleSwitchLayer('hybrid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeLayer === 'hybrid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title="Tampilan Satelit Foto Udara Detail & Nama Jalan"
              >
                <span>🛰️ Satelit (Hybrid)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLayer('streets')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeLayer === 'streets'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title="Tampilan Peta Jalan Vektor"
              >
                <span>🗺️ Peta Jalan</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLayer('terrain')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeLayer === 'terrain'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title="Tampilan Kontur & Topografi"
              >
                <span>⛰️ Medan</span>
              </button>
            </div>

            {/* Floating Top Left Helper Badge */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 py-1.5 px-3 rounded-full shadow-md text-[11px] font-semibold text-slate-700 flex items-center gap-2 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Klik peta atau geser pin hijau untuk memindahkan titik</span>
              </div>
            </div>

            {/* Floating Right Navigation Controls (+ / - / Center / Compass / Fullscreen) */}
            <div className="absolute bottom-16 right-3 z-10 flex flex-col gap-1.5">
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-lg p-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-7 h-7 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                  title="Perbesar Peta (Zoom In)"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="h-px bg-slate-100" />
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-7 h-7 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                  title="Perkecil Peta (Zoom Out)"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-lg p-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={handleCenterOnMarker}
                  className="w-7 h-7 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-emerald-700 flex items-center justify-center transition cursor-pointer"
                  title="Pusatkan Kamera ke Pin Gudang"
                >
                  <Crosshair className="w-4 h-4 text-emerald-600" />
                </button>
                <button
                  type="button"
                  onClick={handleResetOrientation}
                  className="w-7 h-7 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                  title="Reset Orientasi ke Utara (Pitch 0°)"
                >
                  <Compass className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="w-7 h-7 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                  title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh Peta'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Floating External Google Maps Link */}
            <div className="absolute bottom-3 right-3 z-10">
              <a
                href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md transition hover:bg-slate-50 cursor-pointer"
                title="Buka titik koordinat ini langsung di Google Maps"
              >
                <span>Buka di Google Maps</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
