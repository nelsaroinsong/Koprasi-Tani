'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Search,
  Satellite,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  X,
  Compass,
  Plus,
  Minus,
} from 'lucide-react';
import {
  MINAHASA_UTARA_KECAMATAN,
  isMinahasaUtaraAddress,
} from '@/lib/address-validation';
import { applyBaseLayer, buildBaseMapStyle, MAP_MAX_ZOOM } from '@/lib/map-tiles';
import 'maplibre-gl/dist/maplibre-gl.css';

function detectMinahasaUtaraDistrict(address: string | null | undefined): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const kec of MINAHASA_UTARA_KECAMATAN) {
    if (lower.includes(kec.toLowerCase())) {
      return kec;
    }
  }
  return null;
}

interface LocationMapPreviewProps {
  value: string;
  onChange: (newValue: string) => void;
  onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  rows?: number;
  strictMinahasaUtara?: boolean;
  defaultCenterQuery?: string;
}

interface SearchSuggestion {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category?: string;
}

interface NearbyPlaceChip {
  name: string;
  address: string;
  category?: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

// Koordinat presisi untuk 10 Kecamatan di Kabupaten Minahasa Utara
const KECAMATAN_COORDS: Record<string, { lat: number; lng: number }> = {
  Kalawat: { lat: 1.4390, lng: 124.9315 },
  Airmadidi: { lat: 1.4233, lng: 124.9814 },
  Kauditan: { lat: 1.4167, lng: 125.0667 },
  Dimembe: { lat: 1.4883, lng: 124.9750 },
  Talawaan: { lat: 1.5167, lng: 124.9500 },
  Kema: { lat: 1.3750, lng: 125.0750 },
  'Likupang Timur': { lat: 1.6833, lng: 125.0500 },
  'Likupang Barat': { lat: 1.6333, lng: 124.9833 },
  'Likupang Selatan': { lat: 1.5833, lng: 125.0333 },
  Wori: { lat: 1.6000, lng: 124.8667 },
};

const DEFAULT_MINUT_CENTER = { lat: 1.4390, lng: 124.9315 }; // Kalawat / Airmadidi

export default function LocationMapPreview({
  value,
  onChange,
  onCoordinatesChange,
  label = 'Titik Lokasi & Alamat Lahan (Khusus Minahasa Utara)',
  placeholder = 'Geser peta ke titik lahan atau ketik nama desa/jalan di Kabupaten Minahasa Utara...',
  helperText,
  required = false,
  rows = 2,
  strictMinahasaUtara = true,
}: LocationMapPreviewProps) {
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [mapStyleMode, setMapStyleMode] = useState<'streets' | 'hybrid'>('hybrid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Koordinat aktual pin tengah peta
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>(() => {
    const detected = detectMinahasaUtaraDistrict(value);
    if (detected && KECAMATAN_COORDS[detected]) {
      return KECAMATAN_COORDS[detected];
    }
    return DEFAULT_MINUT_CENTER;
  });

  // Kartu 2-baris ala Grab (Title & Subtitle)
  const [locationTitle, setLocationTitle] = useState<string>('');
  const [locationSubtitle, setLocationSubtitle] = useState<string>('');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceChip[]>([]);

  // State pencarian autocomplete ala Grab
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const reverseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const programmaticTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastGeocodedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isProgrammaticMoveRef = useRef(false);

  // Simpan callback terbaru di dalam ref agar useEffect MapLibre TIDAK pernah re-init saat value berubah
  const onChangeRef = useRef(onChange);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  const cleanValue = value.trim();

  // Deteksi Kecamatan yang sedang terpilih
  const selectedDistrict = useMemo(() => {
    return detectMinahasaUtaraDistrict(cleanValue);
  }, [cleanValue]);

  // Cek apakah alamat valid berada di Kabupaten Minahasa Utara
  const isAddressInMinut = useMemo(() => {
    if (!cleanValue) return null;
    return isMinahasaUtaraAddress(cleanValue);
  }, [cleanValue]);

  // Sinkronisasi title & subtitle awal dari value jika belum ada
  useEffect(() => {
    if (cleanValue && !locationTitle) {
      const parts = cleanValue.split(',').map((s) => s.trim());
      const firstPart = parts[0];
      const isValidTitle = Boolean(firstPart && /[a-zA-Z]/.test(firstPart));
      setLocationTitle(isValidTitle ? firstPart : 'Titik Lahan Pertanian');
      setLocationSubtitle(parts.slice(1).join(', ') || cleanValue);
    }
  }, [cleanValue, locationTitle]);

  // Fungsi reverse geocode dari koordinat tengah peta (dengan AbortController & deduplikasi jarak)
  const performReverseGeocode = useCallback(
    async (
      lat: number,
      lng: number,
      options?: { force?: boolean; preferredTitle?: string; preferredAddress?: string }
    ) => {
      // Cegah request berulang jika koordinat masih di titik yang sama (< 2 meter)
      if (!options?.force && lastGeocodedCoordsRef.current) {
        const dLat = Math.abs(lat - lastGeocodedCoordsRef.current.lat);
        const dLng = Math.abs(lng - lastGeocodedCoordsRef.current.lng);
        if (dLat < 0.00002 && dLng < 0.00002) {
          return;
        }
      }

      lastGeocodedCoordsRef.current = { lat, lng };
      setPinCoords({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      onCoordinatesChangeRef.current?.({ lat, lng });

      // Batalkan request reverse geocode sebelumnya yang masih berjalan
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Jika pengguna baru saja memilih dari Search atau Chip, langsung tampilkan namanya tanpa kedip
      if (options?.preferredTitle) {
        setLocationTitle(options.preferredTitle);
      }
      if (options?.preferredAddress) {
        setLocationSubtitle(options.preferredAddress);
        onChangeRef.current(options.preferredAddress);
      }

      setIsReverseGeocoding(true);
      setGpsError(null);

      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (res.ok) {
          const data = await res.json();
          if (controller.signal.aborted) return;

          if (data?.address) {
            setNearbyPlaces(Array.isArray(data.nearbyPlaces) ? data.nearbyPlaces : []);

            // Jika ada preferredTitle dari hasil klik Search/Chip, pertahankan nama tempat yang dipilih pengguna
            if (options?.preferredTitle) {
              setLocationTitle(options.preferredTitle);
              const enrichedAddress =
                options.preferredAddress &&
                options.preferredAddress.toLowerCase().includes('minahasa')
                  ? options.preferredAddress
                  : `${options.preferredTitle}, ${data.address}`;
              setLocationSubtitle(data.subtitle || enrichedAddress);
              onChangeRef.current(enrichedAddress);
            } else {
              const rawTitle = data.title || data.address.split(',')[0];
              const safeTitle =
                rawTitle && /[a-zA-Z]/.test(rawTitle)
                  ? rawTitle
                  : 'Titik Lahan Pertanian';
              setLocationTitle(safeTitle);
              setLocationSubtitle(data.subtitle || data.address);
              onChangeRef.current(data.address);
            }
            return;
          }
        }
        if (!options?.preferredAddress) {
          const fallbackText = `Titik Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          setLocationTitle('Titik Koordinat Lahan');
          setLocationSubtitle(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          onChangeRef.current(fallbackText);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (!options?.preferredAddress) {
          const fallbackText = `Titik Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          setLocationTitle('Titik Koordinat Lahan');
          setLocationSubtitle(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          onChangeRef.current(fallbackText);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsReverseGeocoding(false);
        }
      }
    },
    []
  );

  const performReverseGeocodeRef = useRef(performReverseGeocode);
  useEffect(() => {
    performReverseGeocodeRef.current = performReverseGeocode;
  }, [performReverseGeocode]);

  // Inisialisasi MapLibre HANYA SEKALI saat mount (tidak tergantung pada `value`)
  useEffect(() => {
    let map: any;
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const maplibregl = await import('maplibre-gl');
      if (typeof maplibregl.setWorkerUrl === 'function') {
        maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      }
      if (!isMounted || !mapContainerRef.current) return;

      const initCoords = pinCoords;

      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: buildBaseMapStyle('hybrid'),
        center: [initCoords.lng, initCoords.lat],
        zoom: 16,
        attributionControl: { compact: true },
        maxZoom: MAP_MAX_ZOOM,
      });

      mapInstanceRef.current = map;

      map.on('load', () => {
        if (!isMounted) return;
        try {
          map.resize();
        } catch {}
      });

      // Saat pengguna mulai menggeser peta (abaikan jika ini gerakan flyTo/easeTo otomatis)
      map.on('movestart', () => {
        if (!isMounted || isProgrammaticMoveRef.current) return;
        setIsMapDragging(true);
      });

      // Update angka koordinat secara live saat peta bergerak
      map.on('move', () => {
        if (!isMounted) return;
        const center = map.getCenter();
        setPinCoords({
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        });
      });

      // Saat peta berhenti digeser -> jalankan reverse geocoding dengan debounce 350ms
      map.on('moveend', () => {
        if (!isMounted) return;
        setIsMapDragging(false);

        if (isProgrammaticMoveRef.current) {
          return;
        }

        const center = map.getCenter();
        if (reverseTimeoutRef.current) {
          clearTimeout(reverseTimeoutRef.current);
        }
        reverseTimeoutRef.current = setTimeout(() => {
          performReverseGeocodeRef.current(center.lat, center.lng);
        }, 350);
      });

      // Tap / Klik di titik mana saja pada peta -> geser pin tengah ke titik tersebut (Grab-style)
      map.on('click', (e: any) => {
        if (!isMounted) return;
        const clickedLat = e.lngLat.lat;
        const clickedLng = e.lngLat.lng;
        isProgrammaticMoveRef.current = true;
        if (programmaticTimeoutRef.current) {
          clearTimeout(programmaticTimeoutRef.current);
        }
        map.easeTo({
          center: [clickedLng, clickedLat],
          duration: 420,
        });
        programmaticTimeoutRef.current = setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 550);
        performReverseGeocodeRef.current(clickedLat, clickedLng, { force: true });
      });

      // Jika saat pertama kali dimuat alamat masih kosong, deteksi otomatis titik awal
      if (!value || value.trim().length === 0) {
        performReverseGeocodeRef.current(initCoords.lat, initCoords.lng);
      } else {
        onCoordinatesChangeRef.current?.(initCoords);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (reverseTimeoutRef.current) {
        clearTimeout(reverseTimeoutRef.current);
      }
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
    // Sengaja hanya dijalankan sekali saat mount agar peta TIDAK pernah ke-reset saat value berubah!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ResizeObserver agar MapLibre otomatis menyesuaikan dimensi saat dialog modal dibuka / resize layar
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Sinkronisasi layer Peta Jalan vs Satelit Hybrid
  useEffect(() => {
    applyBaseLayer(mapInstanceRef.current, mapStyleMode);
  }, [mapStyleMode]);

  // Resize peta saat keluar/masuk mode Fullscreen Mobile
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      try {
        map.resize();
      } catch {}
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Live Search Autocomplete (Grab-style search bar)
  const handleSearchInputChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Saat pengguna memilih hasil pencarian lokasi
  const handleSelectSearchSuggestion = (item: SearchSuggestion) => {
    setShowSuggestions(false);
    setSearchQuery(item.name);
    setGpsError(null);

    if (reverseTimeoutRef.current) {
      clearTimeout(reverseTimeoutRef.current);
    }
    if (programmaticTimeoutRef.current) {
      clearTimeout(programmaticTimeoutRef.current);
    }

    if (mapInstanceRef.current) {
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.flyTo({
        center: [item.lng, item.lat],
        zoom: 17.2,
        duration: 850,
        essential: true,
      });
      programmaticTimeoutRef.current = setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1050);
    }

    performReverseGeocode(item.lat, item.lng, {
      force: true,
      preferredTitle: item.name,
      preferredAddress: item.displayName,
    });
  };

  // Pilih Kecamatan -> Terbangkan peta ke Kecamatan tersebut
  const handleSelectDistrict = (kecamatan: string) => {
    setGpsError(null);
    setShowSuggestions(false);
    const coords = KECAMATAN_COORDS[kecamatan];
    if (coords && mapInstanceRef.current) {
      if (reverseTimeoutRef.current) {
        clearTimeout(reverseTimeoutRef.current);
      }
      if (programmaticTimeoutRef.current) {
        clearTimeout(programmaticTimeoutRef.current);
      }
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.flyTo({
        center: [coords.lng, coords.lat],
        zoom: 15.8,
        duration: 850,
        essential: true,
      });
      programmaticTimeoutRef.current = setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1050);
      performReverseGeocode(coords.lat, coords.lng, { force: true });
    } else {
      onChange(`Kec. ${kecamatan}, Kab. Minahasa Utara, Sulawesi Utara`);
    }
  };

  // Deteksi lokasi via GPS perangkat
  const handleDetectMyLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Browser tidak mendukung deteksi lokasi GPS.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (reverseTimeoutRef.current) {
          clearTimeout(reverseTimeoutRef.current);
        }
        if (programmaticTimeoutRef.current) {
          clearTimeout(programmaticTimeoutRef.current);
        }
        if (mapInstanceRef.current) {
          isProgrammaticMoveRef.current = true;
          mapInstanceRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 17.5,
            duration: 850,
            essential: true,
          });
          programmaticTimeoutRef.current = setTimeout(() => {
            isProgrammaticMoveRef.current = false;
          }, 1050);
        }
        performReverseGeocode(latitude, longitude, { force: true }).finally(() => {
          setIsDetectingGps(false);
        });
      },
      (err) => {
        setIsDetectingGps(false);
        if (err.code === 1) {
          setGpsError('Izin GPS ditolak. Geser peta atau cari nama desa.');
        } else {
          setGpsError('Sinyal GPS lemah. Geser peta secara manual ke titik lahan.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleZoomIn = () => {
    if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current);
    isProgrammaticMoveRef.current = true;
    mapInstanceRef.current?.zoomIn({ duration: 220 });
    programmaticTimeoutRef.current = setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 300);
  };

  const handleZoomOut = () => {
    if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current);
    isProgrammaticMoveRef.current = true;
    mapInstanceRef.current?.zoomOut({ duration: 220 });
    programmaticTimeoutRef.current = setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 300);
  };

  const externalGoogleMapsUrl = `https://www.google.com/maps?q=${pinCoords.lat},${pinCoords.lng}`;

  return (
    <div className="w-full max-w-full min-w-0 space-y-2.5">
      {/* Header Label + Tombol GPS & Fullscreen */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="block text-[11px] font-bold text-[#526046] uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDetectMyLocation}
            disabled={isDetectingGps}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f4f5f1] hover:bg-[#e8ece2] text-[#1a2610] border border-[#dce1d6] text-[11px] font-bold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isDetectingGps ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mencari GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 text-[#233414]" />
                <span>Titik GPS Saya</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#233414] hover:bg-[#1a2610] text-[#D4F63D] text-[11px] font-bold transition-colors cursor-pointer"
            title="Perbesar Peta Layar Penuh"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Peta Penuh</span>
          </button>
        </div>
      </div>

      {/* Wrapper Peta (Mendukung Mode Normal & Mode Layar Penuh Mobile ala Grab) */}
      <div
        className={
          isFullscreen
            ? 'fixed inset-0 z-[100] bg-[#f4f5f1] flex flex-col justify-between w-full max-w-full min-w-0'
            : 'relative rounded-2xl overflow-hidden border border-[#dce1d6] bg-[#eef0ea] w-full max-w-full min-w-0'
        }
      >
        {/* Top Floating Search Bar + Kecamatan Chips */}
        <div
          className={
            isFullscreen
              ? 'relative z-20 bg-white/95 backdrop-blur-md border-b border-[#dce1d6] px-3.5 pt-3 pb-2.5 space-y-2 shadow-sm w-full max-w-full min-w-0'
              : 'relative z-20 bg-white border-b border-[#dce1d6] p-2.5 space-y-2 w-full max-w-full min-w-0'
          }
        >
          <div className="flex items-center gap-2">
            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="w-9 h-9 rounded-xl bg-[#f4f5f1] hover:bg-[#e4e8dd] flex items-center justify-center text-[#1a2610] shrink-0 cursor-pointer"
                aria-label="Tutup Peta Penuh"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Search Input Autocomplete */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#526046] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSuggestions(true);
                }}
                placeholder="Cari desa, kelurahan, atau jalan di Minahasa Utara..."
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#f4f5f1] border border-[#dce1d6] text-xs font-semibold text-[#1a2610] placeholder:text-[#7c8772] focus:outline-none focus:bg-white focus:border-[#233414] transition-all"
              />
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 text-[#526046] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7c8772] hover:text-[#1a2610] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}

              {/* Dropdown Autocomplete Suggestions */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-[#dce1d6] shadow-lg overflow-hidden z-30 max-h-56 overflow-y-auto divide-y divide-[#f0f2ec]">
                  {searchResults.map((item) => (
                    <button
                      key={item.placeId}
                      type="button"
                      onClick={() => handleSelectSearchSuggestion(item)}
                      className="w-full px-3 py-2.5 text-left hover:bg-[#f4f5f1] flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#233414] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1a2610] truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-[#526046] line-clamp-1">
                          {item.displayName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Scroll Kecamatan Quick Jump */}
          {strictMinahasaUtara && (
            <div className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <span className="text-[10px] font-bold text-[#7c8772] uppercase tracking-wider shrink-0 mr-0.5">
                Kecamatan:
              </span>
              {MINAHASA_UTARA_KECAMATAN.map((kec) => {
                const isSelected = selectedDistrict === kec;
                return (
                  <button
                    key={kec}
                    type="button"
                    onClick={() => handleSelectDistrict(kec)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#233414] text-white border-[#233414]'
                        : 'bg-[#f4f5f1] text-[#526046] border-[#dce1d6] hover:text-[#1a2610]'
                    }`}
                  >
                    {kec}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Kanvas Peta Interaktif MapLibre */}
        <div
          style={
            isFullscreen
              ? { flex: '1 1 0%', minHeight: '62vh', width: '100%', maxWidth: '100%' }
              : { height: '285px', minHeight: '285px', width: '100%', maxWidth: '100%' }
          }
          className={
            isFullscreen
              ? 'relative flex-1 w-full max-w-full min-w-0 min-h-[62vh] bg-[#e5e8e0] overflow-hidden'
              : 'relative w-full max-w-full min-w-0 min-h-[285px] bg-[#e5e8e0] overflow-hidden'
          }
        >
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

          {/* Pin Tengah Peta Ala Grab / Gojek (Presisi Terkunci di Titik Tengah 50% 50%) */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div
              className={`relative flex flex-col items-center transition-transform duration-150 ${
                isMapDragging ? '-translate-y-4 scale-105' : '-translate-y-2 scale-100'
              }`}
            >
              {/* Floating Label di Atas Pin */}
              <div className="mb-1 px-2.5 py-1 rounded-full bg-[#1a2610]/95 text-white text-[10px] font-bold shadow-md whitespace-nowrap flex items-center gap-1.5 border border-white/25">
                {isReverseGeocoding ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-[#D4F63D]" />
                    <span>Mendeteksi titik...</span>
                  </>
                ) : isMapDragging ? (
                  <span>Lepas untuk kunci titik</span>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4F63D]" />
                    <span>Titik Lahan</span>
                  </>
                )}
              </div>

              {/* Pin Marker Kontras Tinggi dengan Halo Putih */}
              <div className="w-9 h-9 rounded-full bg-[#233414] border-[2.5px] border-white shadow-[0_4px_14px_rgba(0,0,0,0.45)] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#D4F63D]" />
              </div>
              <div className="w-0.5 h-2.5 bg-white shadow-sm -mt-0.5" />
              <div
                className={`rounded-full bg-black/45 transition-all duration-150 ${
                  isMapDragging ? 'w-4 h-1.5 blur-[1px]' : 'w-2.5 h-1'
                }`}
              />
            </div>
          </div>

          {/* Toggle Layer Satelit vs Peta Jalan (Kiri Atas Peta) */}
          <div className="absolute top-2.5 left-2.5 z-10 inline-flex rounded-xl bg-white/95 backdrop-blur-sm p-0.5 border border-[#dce1d6] shadow-sm">
            <button
              type="button"
              onClick={() => setMapStyleMode('hybrid')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                mapStyleMode === 'hybrid'
                  ? 'bg-[#233414] text-white'
                  : 'text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <Satellite className="w-3 h-3" />
              <span>Satelit</span>
            </button>
            <button
              type="button"
              onClick={() => setMapStyleMode('streets')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                mapStyleMode === 'streets'
                  ? 'bg-[#233414] text-white'
                  : 'text-[#526046] hover:text-[#1a2610]'
              }`}
            >
              <MapIcon className="w-3 h-3" />
              <span>Peta</span>
            </button>
          </div>

          {/* Tombol Cepat Peta Penuh di Dalam Peta (Kanan Atas Peta) */}
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white border border-[#dce1d6] shadow-sm text-[10px] font-bold text-[#1a2610] transition-colors cursor-pointer"
              title="Perbesar Peta Layar Penuh"
            >
              <Maximize2 className="w-3 h-3 text-[#233414]" />
              <span>Layar Penuh</span>
            </button>
          )}

          {/* Kontrol Zoom & GPS Cepat (Kanan Bawah Peta) */}
          <div className="absolute bottom-9 right-2.5 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleDetectMyLocation}
              disabled={isDetectingGps}
              className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white border border-[#dce1d6] shadow-sm flex items-center justify-center text-[#1a2610] cursor-pointer"
              title="Pusatkan ke GPS Saya"
            >
              {isDetectingGps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#233414]" />
              ) : (
                <Compass className="w-4 h-4 text-[#233414]" />
              )}
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

          {/* Pill Koordinat Presisi (Kiri Bawah Peta) */}
          <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a2610]/85 backdrop-blur-sm text-white text-[10px] font-mono">
              {pinCoords.lat.toFixed(5)}, {pinCoords.lng.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Bottom Sheet / Kartu Ringkasan Titik Lokasi ala Grab */}
        <div
          className={
            isFullscreen
              ? 'relative z-20 bg-white border-t border-[#dce1d6] p-4 space-y-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]'
              : 'bg-white border-t border-[#dce1d6] p-3 space-y-2'
          }
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  isAddressInMinut === false
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-[#f4f5f1] text-[#233414] border border-[#dce1d6]'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-black text-[#1a2610] truncate">
                    {locationTitle && /[a-zA-Z]/.test(locationTitle)
                      ? locationTitle
                      : cleanValue && /[a-zA-Z]/.test(cleanValue.split(',')[0])
                      ? cleanValue.split(',')[0]
                      : isReverseGeocoding
                      ? 'Mendeteksi titik lokasi...'
                      : 'Titik Lahan Pertanian'}
                  </p>
                  {isReverseGeocoding && (
                    <Loader2 className="w-3 h-3 animate-spin text-[#526046] shrink-0" />
                  )}
                  {strictMinahasaUtara && cleanValue.length >= 4 && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isAddressInMinut
                          ? 'bg-[#eef4e8] text-[#233414]'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {isAddressInMinut ? (
                        <>
                          <Check className="w-2.5 h-2.5" />
                          <span>Minahasa Utara</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>Luar Area Minut</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#526046] line-clamp-2 mt-0.5 leading-snug">
                  {locationSubtitle || cleanValue || 'Tap atau geser peta untuk mengunci titik koordinat kebun'}
                </p>
              </div>
            </div>

            <a
              href={externalGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f4f5f1] hover:bg-[#e5e9df] text-[10px] font-bold text-[#233414] shrink-0 transition-colors"
              title="Lihat titik di Google Maps"
            >
              <span>Maps</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Rekomendasi Tempat / PT / Jalan Terdekat di Sekitar Pin (Grab-Style Quick Snap) */}
          {nearbyPlaces.length > 0 && (
            <div className="pt-1.5 border-t border-[#f0f2ec] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-[#7c8772] shrink-0">
                Sekitar Pin:
              </span>
              {nearbyPlaces.map((place, idx) => {
                const isCurrentTitle =
                  locationTitle.toLowerCase().includes(place.name.toLowerCase());
                return (
                  <button
                    key={`${place.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (reverseTimeoutRef.current) {
                        clearTimeout(reverseTimeoutRef.current);
                      }
                      if (programmaticTimeoutRef.current) {
                        clearTimeout(programmaticTimeoutRef.current);
                      }
                      if (mapInstanceRef.current) {
                        isProgrammaticMoveRef.current = true;
                        mapInstanceRef.current.flyTo({
                          center: [place.lng, place.lat],
                          zoom: 17.5,
                          duration: 750,
                          essential: true,
                        });
                        programmaticTimeoutRef.current = setTimeout(() => {
                          isProgrammaticMoveRef.current = false;
                        }, 950);
                      }
                      performReverseGeocode(place.lat, place.lng, {
                        force: true,
                        preferredTitle: place.name,
                        preferredAddress: place.address,
                      });
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer border ${
                      isCurrentTitle
                        ? 'bg-[#233414] text-[#D4F63D] border-[#233414]'
                        : 'bg-[#f4f5f1] hover:bg-[#e7ebe0] text-[#1a2610] border-[#dce1d6]'
                    }`}
                  >
                    <span className="truncate max-w-[180px]">{place.name}</span>
                    <span className="opacity-70 font-mono text-[9px]">
                      ({place.distanceMeters}m)
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tombol Konfirmasi saat di Mode Layar Penuh Mobile */}
          {isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              disabled={strictMinahasaUtara && isAddressInMinut === false}
              className="w-full py-3 rounded-xl bg-[#233414] hover:bg-[#1a2610] disabled:bg-stone-300 disabled:text-stone-500 text-[#D4F63D] font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              {strictMinahasaUtara && isAddressInMinut === false
                ? 'Titik Berada di Luar Kabupaten Minahasa Utara'
                : 'Konfirmasi Titik Lokasi Ini'}
            </button>
          )}
        </div>
      </div>

      {/* Textarea Alamat Lengkap (Dapat Disempurnakan Manual) */}
      <div className="space-y-1">
        {/* Detail Teks Alamat (Otomatis dari Peta / Bisa Diedit) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-[#526046] uppercase tracking-wider truncate">
            Detail Alamat Lahan (Otomatis / Bisa Diedit)
          </span>
          {selectedDistrict && (
            <span className="text-[10px] font-bold text-[#233414] shrink-0">
              Kec. {selectedDistrict}
            </span>
          )}
        </div>
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (gpsError) setGpsError(null);
          }}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl bg-[#f4f5f1] border text-xs sm:text-sm font-semibold text-[#1a2610] focus:outline-none focus:bg-white transition-all resize-none ${
            strictMinahasaUtara && cleanValue.length >= 4 && isAddressInMinut === false
              ? 'border-red-400 focus:border-red-600 bg-red-50/40'
              : 'border-[#dce1d6] focus:border-[#233414]'
          }`}
        />
      </div>

      {/* Pesan Error Singkat bila di luar Minut atau GPS gagal */}
      {(gpsError || (strictMinahasaUtara && cleanValue.length >= 4 && isAddressInMinut === false)) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>
            {gpsError ||
              'Lokasi di luar Kabupaten Minahasa Utara. Geser pin peta ke wilayah Minut (Kalawat, Airmadidi, Dimembe, Kauditan, Talawaan, Kema, Likupang, atau Wori).'}
          </span>
        </div>
      )}

      {helperText && !gpsError && isAddressInMinut !== false && (
        <p className="text-[11px] text-[#526046] leading-relaxed">{helperText}</p>
      )}
    </div>
  );
}
