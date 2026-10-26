'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  MapPin,
  LocateFixed,
  Search,
  Loader2,
  Save,
  ExternalLink,
  Layers,
  Compass,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Crosshair,
  Copy,
  Check,
  RefreshCw,
  RotateCcw,
  Phone,
  Store,
  X,
  Map as MapIcon,
  Mountain,
  Navigation,
} from 'lucide-react';
import { useToast } from '@/context/toast-context';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';

const HATCHED_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #F3F4F6, #F3F4F6 4px, #F9FAFB 4px, #F9FAFB 8px)',
};

interface WarehouseLocationPageProps {
  initialAddress?: string;
  onBack: () => void;
}

interface SearchResultItem {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: string;
}

// Koordinat awal default (Desa Kolongan, Kec. Kalawat, Minahasa Utara)
const DEFAULT_LAT = 1.4334;
const DEFAULT_LNG = 124.9312;
const DEFAULT_ADDRESS =
  'Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara';
const DEFAULT_PHONE = '081944078924';

type LayerType = 'hybrid' | 'streets' | 'terrain';

export function WarehouseLocationPage({ initialAddress, onBack }: WarehouseLocationPageProps) {
  const { showToast } = useToast();

  const [address, setAddress] = useState(initialAddress || DEFAULT_ADDRESS);
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });
  const [latInput, setLatInput] = useState(DEFAULT_LAT.toFixed(6));
  const [lngInput, setLngInput] = useState(DEFAULT_LNG.toFixed(6));
  const [zoomLevel, setZoomLevel] = useState(16.5);

  const [activeLayer, setActiveLayer] = useState<LayerType>('hybrid');
  const [searchPlaceQuery, setSearchPlaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedField, setCopiedField] = useState<'COORDS' | 'ADDRESS' | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markerInstanceRef = useRef<MapLibreMarker | null>(null);
  const activeLayerRef = useRef<LayerType>('hybrid');

  // Helper sinkronisasi state koordinat + input teks + posisi marker peta
  const updatePinPosition = useCallback(
    (lat: number, lng: number, shouldFly = false, targetZoom = 17) => {
      const clampedLat = Math.max(-90, Math.min(90, lat));
      const clampedLng = Math.max(-180, Math.min(180, lng));

      setCoordinates({ lat: clampedLat, lng: clampedLng });
      setLatInput(clampedLat.toFixed(6));
      setLngInput(clampedLng.toFixed(6));

      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLngLat([clampedLng, clampedLat]);
      }
      if (shouldFly && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo({
          center: [clampedLng, clampedLat],
          zoom: targetZoom,
          essential: true,
        });
      }
    },
    []
  );

  // Ambil data resmi alamat, telepon, dan koordinat dari server (/api/koperasi/info)
  useEffect(() => {
    let isActive = true;
    async function fetchWarehouseInfo() {
      try {
        setIsLoadingInitial(true);
        const res = await fetch('/api/koperasi/info');
        const data = await res.json();
        if (!isActive) return;

        if (data?.alamat) {
          setAddress(data.alamat);
        }
        if (data?.telepon) {
          setPhone(data.telepon);
        }

        let targetLat = DEFAULT_LAT;
        let targetLng = DEFAULT_LNG;

        if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
          targetLat = data.latitude;
          targetLng = data.longitude;
        } else {
          const addrToParse = data?.alamat || initialAddress || '';
          const match = addrToParse.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
          if (match) {
            const pLat = parseFloat(match[1]);
            const pLng = parseFloat(match[2]);
            if (!isNaN(pLat) && !isNaN(pLng)) {
              targetLat = pLat;
              targetLng = pLng;
            }
          }
        }

        updatePinPosition(targetLat, targetLng, true, 16.5);
      } catch (err) {
        console.warn('Gagal memuat info gudang awal:', err);
      } finally {
        if (isActive) setIsLoadingInitial(false);
      }
    }

    fetchWarehouseInfo();
    return () => {
      isActive = false;
    };
  }, [initialAddress, updatePinPosition]);

  // Tutup dropdown pencarian saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reverse Geocoding ke API Koperasi (/api/geocode/reverse) untuk membaca nama jalan/desa
  const reverseGeocode = useCallback(
    async (lat: number, lng: number, showNotification = true) => {
      try {
        setIsReverseGeocoding(true);
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (res.ok && data?.address) {
          const cleanAddr = `Koperasi Sinar Pagi Sejahtera — ${data.address}`;
          setAddress(cleanAddr);
          if (showNotification) {
            showToast({
              title: 'Alamat Diperbarui dari Peta',
              message: data.address,
              type: 'info',
            });
          }
        } else {
          const fallback = `Koperasi Sinar Pagi Sejahtera — Titik GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
          setAddress(fallback);
        }
      } catch {
        const fallback = `Koperasi Sinar Pagi Sejahtera — Titik GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        setAddress(fallback);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [showToast]
  );

  // Inisialisasi Peta MapLibre GL dengan Google Satellite/Hybrid & Roadmap Tiles
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const maplibregl = await import('maplibre-gl');
      if (typeof maplibregl.setWorkerUrl === 'function') {
        maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      }

      if (!isMounted || !mapContainerRef.current) return;

      const initialLat = coordinates.lat;
      const initialLng = coordinates.lng;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
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
        maxPitch: 60,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Custom Pin Gudang Presisi (Penting: Jangan set position/transform inline pada root markerEl agar tidak merusak posisi MapLibre)
      const markerEl = document.createElement('div');
      markerEl.className = 'cursor-grab active:cursor-grabbing select-none';
      markerEl.style.width = '42px';
      markerEl.style.height = '50px';

      markerEl.innerHTML = `
        <div style="position: relative; width: 42px; height: 50px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; bottom: 1px; left: 50%; transform: translateX(-50%); width: 20px; height: 7px; background: rgba(5, 150, 105, 0.5); border-radius: 9999px; filter: blur(1px);"></div>
          <svg viewBox="0 0 24 28" width="42" height="50" fill="none" style="filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45)); display: block;">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 16 12 16s12-7.5 12-16c0-6.627-5.373-12-12-12z" fill="#059669" stroke="#ffffff" stroke-width="1.8"/>
            <circle cx="12" cy="11.5" r="7" fill="#ffffff"/>
            <path d="M8.5 15V11.5L12 8.5L15.5 11.5V15C15.5 15.3 15.3 15.5 15 15.5H9C8.7 15.5 8.5 15.3 8.5 15Z" fill="#059669"/>
          </svg>
        </div>
      `;

      const marker = new maplibregl.Marker({
        element: markerEl,
        draggable: true,
        anchor: 'bottom',
      })
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      markerInstanceRef.current = marker;

      // Event saat marker selesai digeser (dragend)
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        setCoordinates({ lat: pos.lat, lng: pos.lng });
        setLatInput(pos.lat.toFixed(6));
        setLngInput(pos.lng.toFixed(6));
        reverseGeocode(pos.lat, pos.lng);
      });

      // Event saat peta diklik langsung
      map.on('click', (e: any) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]);
        setCoordinates({ lat, lng });
        setLatInput(lat.toFixed(6));
        setLngInput(lng.toFixed(6));
        reverseGeocode(lat, lng);
      });

      map.on('zoom', () => {
        setZoomLevel(map.getZoom());
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
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

  // Navigasi Peta
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn({ duration: 250 });
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut({ duration: 250 });
  const handleResetOrientation = () => {
    mapInstanceRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 400 });
  };
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

  // Terapkan input manual koordinat Latitude / Longitude
  const handleApplyManualCoords = () => {
    // Cek jika user menempelkan format gabungan "1.433400, 124.931200" di kolom Latitude
    if (latInput.includes(',')) {
      const parts = latInput.split(',');
      const pLat = parseFloat(parts[0].trim());
      const pLng = parseFloat(parts[1].trim());
      if (!isNaN(pLat) && !isNaN(pLng)) {
        updatePinPosition(pLat, pLng, true, 17);
        reverseGeocode(pLat, pLng);
        return;
      }
    }

    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);
    if (isNaN(parsedLat) || isNaN(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      showToast({
        title: 'Koordinat Tidak Valid',
        message: 'Masukkan nilai Latitude (-90 s/d 90) dan Longitude (-180 s/d 180) yang benar.',
        type: 'warning',
      });
      return;
    }

    updatePinPosition(parsedLat, parsedLng, true, 17);
    reverseGeocode(parsedLat, parsedLng);
  };

  // Salin ke Clipboard
  const handleCopy = async (type: 'COORDS' | 'ADDRESS') => {
    try {
      const text =
        type === 'COORDS'
          ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
          : address;
      await navigator.clipboard.writeText(text);
      setCopiedField(type);
      showToast({
        title: type === 'COORDS' ? 'Koordinat Disalin' : 'Alamat Disalin',
        message: text,
        type: 'success',
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  // Reset ke Lokasi Gudang Default (Kolongan, Kalawat)
  const handleResetDefault = () => {
    setAddress(DEFAULT_ADDRESS);
    updatePinPosition(DEFAULT_LAT, DEFAULT_LNG, true, 16.5);
    showToast({
      title: 'Titik Gudang Direset',
      message: 'Dikembalikan ke titik awal Desa Kolongan, Kec. Kalawat.',
      type: 'info',
    });
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
        updatePinPosition(latitude, longitude, true, 17.5);
        reverseGeocode(latitude, longitude);
        setIsDetectingGPS(false);

        showToast({
          title: 'Lokasi GPS Ditemukan',
          message: 'Pin gudang telah diarahkan ke posisi perangkat Anda saat ini.',
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
          message: 'Pastikan sinyal GPS aktif atau arahkan pin peta secara manual.',
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

  // Pencarian Tempat via Server Proxy (/api/geocode/search)
  const handleSearchPlace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchPlaceQuery.trim();
    if (!query) return;

    // Jika user memasukkan koordinat langsung di kotak pencarian (misal: "1.4334, 124.9312")
    const coordMatch = query.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (coordMatch) {
      const cLat = parseFloat(coordMatch[1]);
      const cLng = parseFloat(coordMatch[2]);
      if (!isNaN(cLat) && !isNaN(cLng)) {
        updatePinPosition(cLat, cLng, true, 17);
        reverseGeocode(cLat, cLng);
        setIsSearchDropdownOpen(false);
        return;
      }
    }

    try {
      setIsSearchingPlace(true);
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (res.ok && Array.isArray(data.results) && data.results.length > 0) {
        setSearchResults(data.results);
        setIsSearchDropdownOpen(true);

        // Langsung arahkan ke hasil paling relevan pertama
        const best = data.results[0];
        updatePinPosition(best.lat, best.lng, true, 16.5);
        setAddress(`Koperasi Sinar Pagi Sejahtera — ${best.displayName}`);
      } else {
        setSearchResults([]);
        setIsSearchDropdownOpen(false);
        showToast({
          title: 'Lokasi Tidak Ditemukan',
          message: 'Gunakan kata kunci nama jalan, desa, atau kecamatan yang lebih spesifik.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Gagal Mencari Lokasi',
        message: err.message || 'Terjadi gangguan saat menghubungi layanan pencarian peta.',
        type: 'error',
      });
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    updatePinPosition(item.lat, item.lng, true, 17);
    setAddress(`Koperasi Sinar Pagi Sejahtera — ${item.displayName}`);
    setSearchPlaceQuery(item.name);
    setIsSearchDropdownOpen(false);
    showToast({
      title: 'Titik Lokasi Dipilih',
      message: item.displayName,
      type: 'info',
    });
  };

  // Simpan Alamat, Telepon & Koordinat ke Database Koperasi (/api/koperasi/info)
  const handleSave = async () => {
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      showToast({
        title: 'Alamat Wajib Diisi',
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
        body: JSON.stringify({
          alamat: cleanAddress,
          telepon: phone.trim() || DEFAULT_PHONE,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan alamat gudang.');
      }

      showToast({
        title: 'Titik Lokasi Gudang Disimpan',
        message: 'Alamat serah terima barang & koordinat pickup point berhasil diperbarui.',
        type: 'success',
      });

      onBack();
    } catch (err: any) {
      showToast({
        title: 'Gagal Menyimpan Lokasi',
        message: err.message || 'Terjadi gangguan saat menyimpan ke database.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kravio Outer Double-Container Shell (Standar Industri Seluruh Halaman Admin) */}
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        {/* 1. Top Bar di Dalam Shell */}
        <div className="px-3 pt-2 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
              title="Kembali ke Katalog Komoditas"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <MapPin className="w-4 h-4 text-emerald-600 stroke-[2] shrink-0" />
              <h1 className="text-[13.5px] sm:text-sm font-semibold text-slate-900 tracking-tight truncate">
                Titik Lokasi & Alamat Gudang Koperasi
              </h1>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pickup Point Aktif
              </span>
            </div>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a
              href="/toko"
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-2.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1 shadow-2xs hover:bg-slate-50 transition"
              title="Lihat tampilan alamat di halaman toko pembeli"
            >
              <Store className="w-3 h-3 text-slate-500" />
              <span className="hidden md:inline">Lihat di Toko</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>

            <button
              type="button"
              onClick={handleResetDefault}
              disabled={isSaving}
              className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer shadow-2xs"
              title="Kembalikan ke titik gudang default (Kolongan, Kalawat)"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition shadow-2xs"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-60"
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

        {/* 2. Inner Split Workspace (Kiri: Form Detail Fisik & GPS | Kanan: Peta Interaktif) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
          {/* PANEL KIRI (5 Kolom): Konfigurasi Alamat, Koordinat Presisi & Kontak Gudang */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Sub-header Panel Kiri */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Konfigurasi Pickup Point
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Informasi resmi lokasi pengambilan pesanan & setoran panen
                  </p>
                </div>
                {(isReverseGeocoding || isLoadingInitial) && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Sinkronisasi...</span>
                  </span>
                )}
              </div>

              {/* A. Tombol Deteksi GPS Lokasi Saat Ini */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Berada di Lokasi Gudang?</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-snug">
                    Arahkan pin otomatis sesuai titik GPS perangkat Anda sekarang.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDetectCurrentLocation}
                  disabled={isDetectingGPS}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0 disabled:opacity-60"
                >
                  {isDetectingGPS ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mendeteksi...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>Gunakan GPS Saat Ini</span>
                    </>
                  )}
                </button>
              </div>

              {/* B. Input Alamat Lengkap Gudang */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Alamat Lengkap Gudang <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => reverseGeocode(coordinates.lat, coordinates.lng, true)}
                      disabled={isReverseGeocoding}
                      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200/70 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                      title="Baca ulang alamat jalan otomatis dari posisi pin di peta"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isReverseGeocoding ? 'animate-spin' : ''}`} />
                      <span>Baca dari Pin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy('ADDRESS')}
                      className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer"
                      title="Salin teks alamat"
                    >
                      {copiedField === 'ADDRESS' ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                      <span>Salin</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara"
                  className="w-full text-xs sm:text-[13px] px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition resize-none leading-relaxed text-slate-800"
                />
                <p className="text-[11px] text-slate-400">
                  Terisi otomatis saat pin digeser, atau dapat Anda sempurnakan secara manual (misal: tambah patokan gerbang/nomor bangunan).
                </p>
              </div>

              {/* C. Koordinat GPS Presisi (Editable + Copy + Apply) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Titik Koordinat GPS (Desimal)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy('COORDS')}
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedField === 'COORDS' ? (
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                    <span>Salin Lat, Lng</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <div className="relative">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider absolute left-2.5 top-1.5">
                        Latitude
                      </span>
                      <input
                        type="text"
                        value={latInput}
                        onChange={(e) => setLatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyManualCoords()}
                        className="w-full pt-5 pb-1.5 px-2.5 text-xs font-mono font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                        placeholder="1.433400"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-5">
                    <div className="relative">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider absolute left-2.5 top-1.5">
                        Longitude
                      </span>
                      <input
                        type="text"
                        value={lngInput}
                        onChange={(e) => setLngInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyManualCoords()}
                        className="w-full pt-5 pb-1.5 px-2.5 text-xs font-mono font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                        placeholder="124.931200"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex">
                    <button
                      type="button"
                      onClick={handleApplyManualCoords}
                      className="w-full h-full min-h-[38px] px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition cursor-pointer shadow-2xs flex items-center justify-center"
                      title="Arahkan peta ke koordinat yang diketik"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>

              {/* D. Kontak WhatsApp / Telepon Gudang */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nomor Kontak / WhatsApp Petugas Gudang</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081944078924"
                  className="w-full h-9 px-3 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition text-slate-800 font-medium tabular-nums"
                />
                <p className="text-[11px] text-slate-400">
                  Digunakan untuk koordinasi pengambilan pesanan pembeli dan jadwal serah terima alat/komoditas.
                </p>
              </div>
            </div>

            {/* Footer Ringkasan & Tombol Simpan di Panel Kiri */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                Pastikan titik pin berada tepat di akses jalan masuk gudang.
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 disabled:opacity-60"
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

          {/* PANEL KANAN (7 Kolom): Peta Satelit & Jalan Interaktif */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
            {/* Toolbar Atas Peta: Pencarian Lokasi + Switcher Mode Peta (Tidak Menutupi Peta) */}
            <div className="p-2.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {/* Search Box dengan Dropdown Autocomplete */}
              <div ref={searchBoxRef} className="relative flex-1">
                <form onSubmit={handleSearchPlace} className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchPlaceQuery}
                      onChange={(e) => setSearchPlaceQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) setIsSearchDropdownOpen(true);
                      }}
                      placeholder="Cari nama jalan, desa, kecamatan, atau tempel koordinat..."
                      className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition text-slate-800"
                    />
                    {searchPlaceQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchPlaceQuery('');
                          setSearchResults([]);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Bersihkan pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingPlace || !searchPlaceQuery.trim()}
                    className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    {isSearchingPlace ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Cari</span>
                    )}
                  </button>
                </form>

                {/* Dropdown Hasil Pencarian Tempat */}
                {isSearchDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.placeId}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 transition flex items-start gap-2.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {item.displayName}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
                          {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Segmented Layer Switcher (Tanpa Emoji, Standar Industri) */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleSwitchLayer('hybrid')}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    activeLayer === 'hybrid'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Citra Satelit Resolusi Tinggi dengan Nama Jalan"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Satelit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchLayer('streets')}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    activeLayer === 'streets'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Peta Jalan Vektor Standar"
                >
                  <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Peta Jalan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchLayer('terrain')}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    activeLayer === 'terrain'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Peta Kontur & Topografi Wilayah"
                >
                  <Mountain className="w-3.5 h-3.5 text-amber-600" />
                  <span>Medan</span>
                </button>
              </div>
            </div>

            {/* Area Kanvas Peta */}
            <div
              ref={mapWrapperRef}
              className="relative flex-1 bg-slate-900 min-h-[440px] sm:min-h-[480px]"
            >
              <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

              {/* Floating Right Navigation Controls (+ / - / Center Pin / Compass / Fullscreen) */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md p-1 flex flex-col gap-0.5">
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

                <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md p-1 flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={handleCenterOnMarker}
                    className="w-7 h-7 rounded-lg text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center transition cursor-pointer"
                    title="Pusatkan Kamera ke Pin Gudang"
                  >
                    <Crosshair className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetOrientation}
                    className="w-7 h-7 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                    title="Reset Orientasi ke Utara"
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
            </div>

            {/* Status Bar Bawah Peta: Koordinat Real-Time, Zoom & Link Google Maps */}
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Klik peta atau tarik pin untuk mengatur lokasi</span>
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)} (Z:{zoomLevel.toFixed(1)})
                </span>
              </div>

              <a
                href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                title="Buka titik koordinat ini di Google Maps"
              >
                <span>Buka di Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
