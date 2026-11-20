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
import { createKoperasiPinElement } from '@/lib/koperasi-map-pin';
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
  // Ringkasan nama tempat di titik pin (hasil reverse geocode)
  const [pinPlace, setPinPlace] = useState<{ title: string; subtitle: string } | null>(null);
  // Saran alamat dari pin baru saat admin sudah mengetik alamat sendiri (agar tidak tertimpa diam-diam)
  const [suggestedAddress, setSuggestedAddress] = useState<string | null>(null);
  // Data terakhir yang tersimpan di server, untuk mendeteksi perubahan yang belum disimpan
  const [savedSnapshot, setSavedSnapshot] = useState<{
    address: string;
    phone: string;
    lat: number;
    lng: number;
  } | null>(null);
  const addressEditedRef = useRef(false);

  const setAddressValue = useCallback((value: string, editedByUser: boolean) => {
    addressEditedRef.current = editedByUser;
    setAddress(value);
  }, []);

  const isPhoneValid = !phone.trim() || /^(\+62|62|0)8\d{7,12}$/.test(phone.trim());
  const isDirty =
    !!savedSnapshot &&
    (savedSnapshot.address !== address.trim() ||
      savedSnapshot.phone !== phone.trim() ||
      Math.abs(savedSnapshot.lat - coordinates.lat) > 1e-6 ||
      Math.abs(savedSnapshot.lng - coordinates.lng) > 1e-6);

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

        const loadedAddress = (data?.alamat || initialAddress || DEFAULT_ADDRESS).trim();
        const parts = loadedAddress.replace(/^Koperasi Sinar Pagi Sejahtera\s*—\s*/, '').split(',');
        setPinPlace({
          title: parts[0]?.trim() || 'Titik koperasi',
          subtitle: parts.slice(1).join(',').trim(),
        });
        setSavedSnapshot({
          address: loadedAddress,
          phone: (data?.telepon || DEFAULT_PHONE).trim(),
          lat: Math.max(-90, Math.min(90, targetLat)),
          lng: Math.max(-180, Math.min(180, targetLng)),
        });
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
  // - Jika admin belum mengetik alamat sendiri: alamat langsung diisi dari pin.
  // - Jika admin sudah mengetik: tampilkan saran (tidak menimpa diam-diam).
  // - force: tombol "Isi dari pin" -> selalu timpa.
  const reverseGeocode = useCallback(
    async (lat: number, lng: number, options?: { force?: boolean }) => {
      const applyAddress = (addr: string) => {
        if (options?.force || !addressEditedRef.current) {
          addressEditedRef.current = false;
          setAddress(addr);
          setSuggestedAddress(null);
        } else {
          setSuggestedAddress(addr);
        }
      };
      const coordText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      try {
        setIsReverseGeocoding(true);
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (res.ok && data?.address) {
          setPinPlace({
            title: data.title || String(data.address).split(',')[0],
            subtitle: data.subtitle || data.address,
          });
          applyAddress(`Koperasi Sinar Pagi Sejahtera — ${data.address}`);
        } else {
          setPinPlace({ title: 'Titik koordinat', subtitle: coordText });
          applyAddress(`Koperasi Sinar Pagi Sejahtera — Titik GPS (${coordText})`);
        }
      } catch {
        setPinPlace({ title: 'Titik koordinat', subtitle: coordText });
        applyAddress(`Koperasi Sinar Pagi Sejahtera — Titik GPS (${coordText})`);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    []
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

      // Pin "Kantor Koperasi" (helper bersama, lihat lib/koperasi-map-pin.ts)
      const markerEl = createKoperasiPinElement({ draggable: true });

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
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Kembalikan pin & alamat ke titik awal bawaan (Kolongan, Kalawat)? Perubahan belum tersimpan sampai Anda menekan Simpan.')
    ) {
      return;
    }
    setAddressValue(DEFAULT_ADDRESS, false);
    setSuggestedAddress(null);
    setPinPlace({ title: 'Jl. Raya Kolongan', subtitle: 'Kec. Kalawat, Kabupaten Minahasa Utara, Sulawesi Utara' });
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
        setAddressValue(`Koperasi Sinar Pagi Sejahtera — ${best.displayName}`, false);
        setSuggestedAddress(null);
        setPinPlace({ title: best.name, subtitle: best.displayName });
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
    setAddressValue(`Koperasi Sinar Pagi Sejahtera — ${item.displayName}`, false);
    setSuggestedAddress(null);
    setPinPlace({ title: item.name, subtitle: item.displayName });
    setSearchPlaceQuery(item.name);
    setIsSearchDropdownOpen(false);
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
    if (!isPhoneValid) {
      showToast({
        title: 'Nomor WhatsApp Belum Benar',
        message: 'Gunakan format nomor Indonesia, contoh: 081234567890.',
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

      setSavedSnapshot({
        address: cleanAddress,
        phone: phone.trim() || DEFAULT_PHONE,
        lat: coordinates.lat,
        lng: coordinates.lng,
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

  const layerOptions: { id: LayerType; label: string; icon: React.ElementType }[] = [
    { id: 'hybrid', label: 'Satelit', icon: Layers },
    { id: 'streets', label: 'Peta', icon: MapIcon },
    { id: 'terrain', label: 'Medan', icon: Mountain },
  ];

  const renderSaveButton = () => (
    <button
      type="button"
      onClick={handleSave}
      disabled={isSaving || !isDirty}
      className={`h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed`}
      title={isDirty ? 'Simpan lokasi koperasi' : 'Belum ada perubahan'}
    >
      {isSaving ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Menyimpan...</span>
        </>
      ) : (
        <>
          <Save className="w-3.5 h-3.5" />
          <span>Simpan Lokasi</span>
        </>
      )}
    </button>
  );

  const renderStepBadge = (n: number) => (
    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10.5px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E5E7EB] p-1.5" style={HATCHED_BG_STYLE}>
        {/* 1. Header: judul + status simpan + aksi utama */}
        <div className="px-3 pt-2 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Lokasi Kantor & Gudang Koperasi
                </h1>
                {isDirty ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Belum disimpan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                    <Check className="w-3 h-3" />
                    Tersimpan
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Titik ini ditampilkan ke pembeli & penyewa alat sebagai tempat pengambilan barang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition shadow-2xs"
            >
              Batal
            </button>
            {renderSaveButton()}
          </div>
        </div>

        {/* 2. Workspace: Peta (kiri, utama) | Form langkah demi langkah (kanan) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
          {/* PETA */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
            <div
              ref={mapWrapperRef}
              className="relative flex-1 bg-[#e5e8e0] min-h-[420px] sm:min-h-[520px]"
            >
              <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

              {isLoadingInitial && (
                <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] flex items-center justify-center gap-2 text-xs text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat lokasi tersimpan...
                </div>
              )}

              {/* Pencarian mengambang di atas peta */}
              <div ref={searchBoxRef} className="absolute top-3 left-3 right-14 sm:right-auto sm:w-[380px] z-20">
                <form onSubmit={handleSearchPlace} className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchPlaceQuery}
                    onChange={(e) => setSearchPlaceQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setIsSearchDropdownOpen(true);
                    }}
                    placeholder="Cari desa, jalan, atau tempat..."
                    className="w-full h-10 pl-9 pr-20 text-[13px] bg-white border border-slate-200 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900/80 transition text-slate-800"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchPlaceQuery && !isSearchingPlace && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchPlaceQuery('');
                          setSearchResults([]);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        title="Bersihkan"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSearchingPlace || !searchPlaceQuery.trim()}
                      className="h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center transition cursor-pointer disabled:opacity-30"
                    >
                      {isSearchingPlace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
                    </button>
                  </div>
                </form>

                {isSearchDropdownOpen && searchResults.length > 0 && (
                  <div className="mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.placeId}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full px-3 py-2.5 text-left hover:bg-slate-50 transition flex items-start gap-2.5 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-[#233414] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 truncate">{item.name}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{item.displayName}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kontrol kanan atas: zoom, pusatkan, layar penuh */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                <div className="bg-white/95 border border-slate-200/90 rounded-xl shadow-md overflow-hidden flex flex-col divide-y divide-slate-100">
                  <button type="button" onClick={handleZoomIn} className="w-9 h-9 text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer" title="Perbesar">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={handleZoomOut} className="w-9 h-9 text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer" title="Perkecil">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-white/95 border border-slate-200/90 rounded-xl shadow-md overflow-hidden flex flex-col divide-y divide-slate-100">
                  <button type="button" onClick={handleCenterOnMarker} className="w-9 h-9 text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer" title="Pusatkan ke pin">
                    <Crosshair className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={handleToggleFullscreen} className="w-9 h-9 text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer" title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}>
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Kiri bawah: pilihan tampilan peta */}
              <div className="absolute bottom-3 left-3 z-10 inline-flex rounded-xl bg-white/95 p-0.5 border border-slate-200/90 shadow-md">
                {layerOptions.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSwitchLayer(id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      activeLayer === id ? 'bg-[#233414] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Kanan bawah: pakai GPS perangkat */}
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={isDetectingGPS}
                className="absolute bottom-3 right-3 z-10 h-9 px-3 rounded-xl bg-white/95 hover:bg-white border border-slate-200/90 shadow-md text-[11.5px] font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                title="Pindahkan pin ke lokasi perangkat Anda saat ini"
              >
                {isDetectingGPS ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-[#233414]" />}
                <span>{isDetectingGPS ? 'Mendeteksi...' : 'Lokasi Saya'}</span>
              </button>
            </div>

            {/* Petunjuk singkat di bawah peta */}
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center gap-2 text-[11.5px] text-slate-600">
              <Navigation className="w-3.5 h-3.5 text-[#233414] shrink-0" />
              <span>
                <b className="font-semibold text-slate-800">Seret pin</b> atau <b className="font-semibold text-slate-800">klik di peta</b> untuk memindahkan titik koperasi.
              </span>
            </div>
          </div>

          {/* FORM */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-5">
            {/* Langkah 1: Titik terpilih */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                {renderStepBadge(1)}
                <h2 className="text-[13px] font-semibold text-slate-900">Titik di peta</h2>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#233414] flex items-center justify-center shrink-0">
                    {isReverseGeocoding ? (
                      <Loader2 className="w-4 h-4 text-[#D4F63D] animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 text-[#D4F63D]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">
                      {isReverseGeocoding ? 'Membaca alamat titik...' : pinPlace?.title || 'Titik koperasi'}
                    </div>
                    <div className="text-[11.5px] text-slate-500 line-clamp-2">
                      {pinPlace?.subtitle || 'Geser pin untuk membaca alamat otomatis.'}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11.5px] text-slate-600 tabular-nums">
                    {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy('COORDS')}
                      className="h-7 px-2 rounded-md text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'COORDS' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Salin
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-2 rounded-md text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Google Maps
                    </a>
                  </div>
                </div>
              </div>

              <details className="group">
                <summary className="list-none cursor-pointer text-[11.5px] font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 select-none">
                  <Plus className="w-3 h-3 group-open:rotate-45 transition-transform" />
                  Punya koordinat dari Google Maps? Masukkan manual
                </summary>
                <div className="mt-2 flex items-stretch gap-2">
                  <input
                    type="text"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyManualCoords()}
                    className="min-w-0 flex-1 h-9 px-2.5 text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                    placeholder="Latitude, mis. 1.433400"
                    aria-label="Latitude"
                  />
                  <input
                    type="text"
                    value={lngInput}
                    onChange={(e) => setLngInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyManualCoords()}
                    className="min-w-0 flex-1 h-9 px-2.5 text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                    placeholder="Longitude, mis. 124.931200"
                    aria-label="Longitude"
                  />
                  <button
                    type="button"
                    onClick={handleApplyManualCoords}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[11.5px] font-semibold cursor-pointer shadow-2xs shrink-0"
                  >
                    Terapkan
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Bisa juga tempel &quot;lat, lng&quot; sekaligus di kolom pertama.</p>
              </details>
            </section>

            {/* Langkah 2: Alamat */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {renderStepBadge(2)}
                  <label htmlFor="warehouse-address" className="text-[13px] font-semibold text-slate-900">
                    Alamat yang dilihat pembeli <span className="text-red-500">*</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => reverseGeocode(coordinates.lat, coordinates.lng, { force: true })}
                  disabled={isReverseGeocoding}
                  className="h-7 px-2 rounded-md text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Isi ulang alamat dari posisi pin"
                >
                  <RefreshCw className={`w-3 h-3 ${isReverseGeocoding ? 'animate-spin' : ''}`} />
                  Isi dari pin
                </button>
              </div>

              {suggestedAddress && suggestedAddress !== address && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11.5px] text-amber-900">
                  <div className="font-semibold">Pin dipindah. Pakai alamat dari titik baru?</div>
                  <div className="mt-0.5 text-amber-800/90 line-clamp-2">{suggestedAddress}</div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAddressValue(suggestedAddress, false);
                        setSuggestedAddress(null);
                      }}
                      className="h-7 px-2.5 rounded-md bg-amber-900 hover:bg-amber-950 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Pakai alamat ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestedAddress(null)}
                      className="h-7 px-2.5 rounded-md border border-amber-300 bg-white text-amber-900 text-[11px] font-medium cursor-pointer"
                    >
                      Tetap pakai alamat saya
                    </button>
                  </div>
                </div>
              )}

              <textarea
                id="warehouse-address"
                rows={3}
                value={address}
                onChange={(e) => setAddressValue(e.target.value, true)}
                placeholder="Contoh: Koperasi Sinar Pagi Sejahtera — Jl. Raya Kolongan, Kec. Kalawat, Kab. Minahasa Utara"
                className={`w-full text-[13px] px-3 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-1 transition resize-none leading-relaxed text-slate-800 ${
                  address.trim() ? 'border-slate-200 focus:ring-slate-900 focus:border-slate-900' : 'border-red-300 focus:ring-red-500'
                }`}
              />
              <p className={`text-[11px] ${address.trim() ? 'text-slate-400' : 'text-red-500'}`}>
                {address.trim()
                  ? 'Terisi otomatis dari pin. Tambahkan patokan agar mudah ditemukan, mis. "samping masjid, pagar hijau".'
                  : 'Alamat wajib diisi.'}
              </p>
            </section>

            {/* Langkah 3: Kontak */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                {renderStepBadge(3)}
                <label htmlFor="warehouse-phone" className="text-[13px] font-semibold text-slate-900">
                  WhatsApp petugas gudang
                </label>
              </div>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="warehouse-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="08xxxxxxxxxx"
                  className={`w-full h-10 pl-9 pr-3 text-[13px] bg-white border rounded-xl focus:outline-none focus:ring-1 transition text-slate-800 font-medium tabular-nums ${
                    isPhoneValid ? 'border-slate-200 focus:ring-slate-900 focus:border-slate-900' : 'border-red-300 focus:ring-red-500'
                  }`}
                />
              </div>
              <p className={`text-[11px] ${isPhoneValid ? 'text-slate-400' : 'text-red-500'}`}>
                {isPhoneValid
                  ? 'Dihubungi pembeli untuk janji pengambilan barang atau serah terima alat.'
                  : 'Format nomor belum benar. Contoh: 081234567890.'}
              </p>
            </section>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetDefault}
                disabled={isSaving}
                className="text-[11.5px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                title="Kembalikan pin ke titik awal bawaan (Kolongan, Kalawat)"
              >
                <RotateCcw className="w-3 h-3" />
                Kembalikan ke titik awal
              </button>
              {renderSaveButton()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
