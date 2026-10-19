'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Map,
  MapMarker,
  MarkerContent,
  MapControls,
  MapGeoJSON,
  useMap,
} from '@/components/ui/map';
import type { MapRef } from '@/components/ui/map';
import {
  Compass,
  MapPin,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Store,
  Tractor,
  Building2,
  ZoomIn,
  Check,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Koordinat Geografis Presisi
// Disesuaikan agar seluruh kepulauan Indonesia (Sabang sampai Merauke) tampak utuh dan proporsional
const INDONESIA_CENTER: [number, number] = [118.5, -2.5];
const INDONESIA_ZOOM = 3.2;

// Batas Sabang - Merauke untuk fitBounds otomatis dengan margin luas (Sabang di barat hingga Merauke di timur)
const INDONESIA_FIT_BOUNDS: [[number, number], [number, number]] = [
  [93.5, -12.5], // Barat Daya (Sumatra / Samudera Hindia)
  [142.5, 7.5],  // Timur Laut (Papua / Miangas)
];

const SULUT_MARKER_COORDS: [number, number] = [124.95, 1.45];
const MINUT_CENTER_COORDS: [number, number] = [124.99, 1.44];
const MINUT_ZOOM = 10.5;

const KOPERASI_COORDS: [number, number] = [124.9825, 1.4285];

// Batas wilayah gerak kamera
const INDONESIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [80.0, -20.0],
  [158.0, 18.0],
];

// Palette warna blok provinsi nusantara selaras agribisnis (seperti contoh Gambar 2 Brazil)
const INDO_PROVINCE_COLOR_MAP: Record<string, string> = {
  'DI. ACEH': '#78a666',
  'SUMATERA UTARA': '#8db872',
  'SUMATERA BARAT': '#6ca054',
  'RIAU': '#9ec380',
  'JAMBI': '#85b068',
  'SUMATERA SELATAN': '#70a969',
  'BENGKULU': '#5b8a4f',
  'LAMPUNG': '#9ec380',
  'BANGKA BELITUNG': '#b7d591',
  'DKI JAKARTA': '#46743c',
  'JAWA BARAT': '#85b068',
  'JAWA TENGAH': '#6ca054',
  'DAERAH ISTIMEWA YOGYAKARTA': '#5b8a4f',
  'JAWA TIMUR': '#78a666',
  'PROBANTEN': '#9ec380',
  'BALI': '#b7d591',
  'NUSATENGGARA BARAT': '#85b068',
  'NUSA TENGGARA TIMUR': '#9ec380',
  'KALIMANTAN BARAT': '#78a666',
  'KALIMANTAN TENGAH': '#8db872',
  'KALIMANTAN SELATAN': '#6ca054',
  'KALIMANTAN TIMUR': '#5b8a4f',
  'SULAWESI UTARA': '#D4F63D', // Highlight Utama (Neon Lime Koperasi)
  'SULAWESI TENGAH': '#70a969',
  'SULAWESI SELATAN': '#85b068',
  'SULAWESI TENGGARA': '#9ec380',
  'GORONTALO': '#5b8a4f',
  'MALUKU': '#8db872',
  'MALUKU UTARA': '#78a666',
  'IRIAN JAYA BARAT': '#9ec380',
  'IRIAN JAYA TENGAH': '#78a666',
  'IRIAN JAYA TIMUR': '#6ca054',
};

// Expression MapLibre GL untuk mewarnai setiap provinsi secara dinamis
const INDO_FILL_COLOR_EXPRESSION: any = [
  'match',
  ['get', 'Propinsi'],
  ...Object.entries(INDO_PROVINCE_COLOR_MAP).flat(),
  '#70a969',
];

// Komponen Pembantu Pengontrol Kamera Peta
function MapCameraController({
  activeView,
}: {
  activeView: 'indonesia' | 'sulut-minut';
}) {
  const { map } = useMap();
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (!map) return;

    try {
      map.setMaxBounds(INDONESIA_MAX_BOUNDS);
      map.setMinZoom(2.2);
      map.setMaxZoom(16.5);

      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
        map.fitBounds(INDONESIA_FIT_BOUNDS, {
          padding: { top: 60, bottom: 45, left: 45, right: 45 },
          duration: 0,
        });

        const handleResize = () => {
          if (activeView === 'indonesia') {
            map.fitBounds(INDONESIA_FIT_BOUNDS, {
              padding: { top: 60, bottom: 45, left: 45, right: 45 },
              duration: 0,
            });
          }
        };
        map.on('resize', handleResize);
        return () => {
          map.off('resize', handleResize);
        };
      }

      if (activeView === 'sulut-minut') {
        map.flyTo({
          center: MINUT_CENTER_COORDS,
          zoom: MINUT_ZOOM,
          pitch: 32,
          bearing: -8,
          duration: 2800,
          essential: true,
        });
      } else {
        map.fitBounds(INDONESIA_FIT_BOUNDS, {
          padding: { top: 60, bottom: 45, left: 45, right: 45 },
          pitch: 0,
          bearing: 0,
          duration: 2400,
          essential: true,
        });
      }
    } catch {}
  }, [map, activeView]);

  return null;
}

export default function IndonesiaMapSection() {
  const mapRef = useRef<MapRef | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [activeView, setActiveView] = useState<'indonesia' | 'sulut-minut'>('indonesia');
  const [isFlying, setIsFlying] = useState(false);
  const [showKoperasiCard, setShowKoperasiCard] = useState(false);

  // Data GeoJSON presisi batas pulau & kabupaten
  const [indoGeoData, setIndoGeoData] = useState<any>(null);
  const [sulutGeoData, setSulutGeoData] = useState<any>(null);
  const [minutGeoData, setMinutGeoData] = useState<any>(null);

  // Ambil data GeoJSON resmi beresolusi tinggi saat komponen dipasang
  useEffect(() => {
    // 1. Seluruh wilayah kepulauan Indonesia (34 provinsi resmi)
    fetch('/data/indonesia_geojson.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setIndoGeoData(data);
      })
      .catch(() => {});

    // 2. Batas presisi daratan Provinsi Sulawesi Utara (mengikuti lekukan garis pantai pulau)
    fetch('/data/sulut_geojson.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSulutGeoData({ type: 'FeatureCollection', features: [data] });
      })
      .catch(() => {});

    // 3. Batas presisi Kabupaten Minahasa Utara
    fetch('/data/minut_geojson.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMinutGeoData({ type: 'FeatureCollection', features: [data] });
      })
      .catch(() => {});
  }, []);

  // GSAP Entrance Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 85%',
          once: true,
        },
      });

      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
        );
      }

      if (mapContainerRef.current) {
        tl.fromTo(
          mapContainerRef.current,
          { opacity: 0, y: 35, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out' },
          '-=0.4'
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Animasi Smooth Kamera Menuju Sulawesi Utara & Minahasa Utara
  const handleZoomToSulut = useCallback(() => {
    if (isFlying || activeView === 'sulut-minut') return;

    setIsFlying(true);
    setShowKoperasiCard(false);
    setActiveView('sulut-minut');

    const timer = setTimeout(() => {
      setIsFlying(false);
      setShowKoperasiCard(true);
    }, 2600);

    return () => clearTimeout(timer);
  }, [isFlying, activeView]);

  // Animasi Kembali ke Tampilan Seluruh Indonesia
  const handleResetToIndonesia = useCallback(() => {
    if (isFlying || activeView === 'indonesia') return;

    setIsFlying(true);
    setShowKoperasiCard(false);
    setActiveView('indonesia');

    const timer = setTimeout(() => {
      setIsFlying(false);
    }, 2300);

    return () => clearTimeout(timer);
  }, [isFlying, activeView]);

  return (
    <section
      ref={sectionRef}
      id="peta-wilayah-operasional"
      className="bg-[#f4f5f1] py-10 sm:py-16 border-b border-slate-200/60 overflow-hidden"
    >
      <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10">
        
        {/* Section Header: Left Label & Right Title */}
        <div
          ref={headerRef}
          className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-6 pb-6 sm:pb-8 border-b border-slate-200/60 will-change-transform"
        >
          <div className="md:w-1/4">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase leading-relaxed block">
              PETA JANGKAUAN &amp;<br />PUSAT OPERASIONAL
            </span>
          </div>
          <div className="md:w-3/4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal text-slate-900 tracking-tight leading-snug">
                Dari Minahasa Utara untuk Nusantara
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl font-light leading-relaxed">
                Pusat sentra kemitraan petani, gudang komoditas segar, dan sewa alsintan modern Koperasi Sinar Pagi Sejahtera berbasis di Minahasa Utara, Sulawesi Utara.
              </p>
            </div>

            {/* View Switcher Chips (Mobile & Desktop) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 bg-white/90 backdrop-blur-md p-1 rounded-full border border-slate-200 shadow-2xs">
              <button
                id="btn-switch-indonesia"
                type="button"
                onClick={handleResetToIndonesia}
                disabled={isFlying || activeView === 'indonesia'}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeView === 'indonesia'
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                🇮🇩 Seluruh Indonesia
              </button>
              <button
                id="btn-switch-minut"
                type="button"
                onClick={handleZoomToSulut}
                disabled={isFlying || activeView === 'sulut-minut'}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  activeView === 'sulut-minut'
                    ? 'bg-[#344d15] text-white shadow-2xs font-semibold'
                    : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50'
                }`}
              >
                <span>📍 Minahasa Utara</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Map Container - Background Hijau Hutan Pekat Selaras Gambar 2 (Brazil) */}
        <div
          ref={mapContainerRef}
          className="mt-6 sm:mt-8 relative w-full h-[480px] sm:h-[540px] lg:h-[620px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-emerald-950/40 bg-[#162e22] will-change-transform"
        >
          {/* MapLibre GL Interactive Map (mapcn) dengan mode blank: murni vektor kepulauan Indonesia tanpa negara luar */}
          <Map
            blank
            ref={mapRef}
            className="w-full h-full"
            center={INDONESIA_CENTER}
            zoom={INDONESIA_ZOOM}
            minZoom={2.0}
            maxZoom={16.5}
            maxBounds={INDONESIA_MAX_BOUNDS}
          >
            <MapCameraController activeView={activeView} />

            {/* 1. Base Layer Kepulauan Indonesia: Blok Warna Provinsi Presisi (Seperti Contoh Gambar 2 Brazil) */}
            {indoGeoData && activeView === 'indonesia' && (
              <MapGeoJSON
                id="indonesia-provinces-layer"
                data={indoGeoData}
                fillPaint={{
                  'fill-color': INDO_FILL_COLOR_EXPRESSION,
                  'fill-opacity': 0.95,
                }}
                linePaint={{
                  'line-color': '#0d1e15',
                  'line-width': 1.0,
                  'line-opacity': 0.95,
                }}
              />
            )}

            {/* 2. Highlight Poligon Presisi Sulawesi Utara (Mengikuti Garis Pantai Pulau) */}
            {sulutGeoData && (
              <MapGeoJSON
                id="sulut-exact-layer"
                data={sulutGeoData}
                fillPaint={{
                  'fill-color': activeView === 'indonesia' ? '#D4F63D' : '#1f422e',
                  'fill-opacity': activeView === 'indonesia' ? 1.0 : 0.5,
                }}
                linePaint={{
                  'line-color': activeView === 'indonesia' ? '#0f2617' : '#2d613e',
                  'line-width': activeView === 'indonesia' ? 2.8 : 1.2,
                  'line-opacity': 1,
                }}
              />
            )}

            {/* 3. Highlight Poligon Presisi Kabupaten Minahasa Utara (Batas Resmi Kabupaten & Pesisir Likupang/Kema) */}
            {minutGeoData && activeView === 'sulut-minut' && (
              <MapGeoJSON
                id="minut-exact-layer"
                data={minutGeoData}
                fillPaint={{
                  'fill-color': '#344d15',
                  'fill-opacity': 0.7,
                }}
                linePaint={{
                  'line-color': '#D4F63D',
                  'line-width': 3.5,
                  'line-opacity': 1,
                }}
              />
            )}

            {/* 5. Marker & Callout Sulawesi Utara saat Mode Seluruh Indonesia */}
            {activeView === 'indonesia' && (
              <MapMarker
                longitude={SULUT_MARKER_COORDS[0]}
                latitude={SULUT_MARKER_COORDS[1]}
                onClick={handleZoomToSulut}
              >
                <MarkerContent className="group flex items-center gap-2 select-none">
                  {/* Pulsing Beacon Rings */}
                  <div className="relative flex items-center justify-center">
                    <span className="absolute -inset-3 rounded-full bg-emerald-500/40 animate-ping" />
                    <span className="absolute -inset-1.5 rounded-full bg-[#D4F63D]/70 animate-pulse" />
                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-800 to-emerald-600 border-2 border-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MapPin className="w-4 h-4 text-[#D4F63D] stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Eye-catching "Klik di sini" Callout Tag */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomToSulut();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 hover:bg-black text-white text-xs font-medium shadow-xl border border-white/20 backdrop-blur-md transition-all group-hover:scale-105 active:scale-95 group-hover:border-[#D4F63D] cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#D4F63D] animate-ping shrink-0" />
                    <span className="font-semibold text-[#D4F63D]">Sulawesi Utara</span>
                    <span className="text-white/60 text-[11px]">—</span>
                    <span className="text-white font-medium text-[11px] underline underline-offset-2 decoration-[#D4F63D]">
                      Klik di sini
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4F63D] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </MarkerContent>
              </MapMarker>
            )}

            {/* 5. Marker Koperasi Sinar Pagi Sejahtera di Minahasa Utara */}
            {activeView === 'sulut-minut' && (
              <MapMarker
                longitude={KOPERASI_COORDS[0]}
                latitude={KOPERASI_COORDS[1]}
                onClick={() => setShowKoperasiCard((prev) => !prev)}
              >
                <MarkerContent className="flex flex-col items-center cursor-pointer group">
                  {/* Top Tag Label */}
                  <div className="mb-1.5 px-2.5 py-1 rounded-full bg-[#344d15] text-[#D4F63D] text-[11px] font-bold shadow-lg border border-[#D4F63D]/40 flex items-center gap-1 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-3 h-3 text-[#D4F63D]" />
                    <span>Koperasi Sinar Pagi Sejahtera</span>
                  </div>

                  {/* Pulsing Pin */}
                  <div className="relative flex items-center justify-center">
                    <span className="absolute -inset-3 rounded-full bg-emerald-500/40 animate-ping" />
                    <div className="relative w-10 h-10 rounded-full bg-emerald-700 border-2 border-white shadow-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Building2 className="w-5 h-5 text-[#D4F63D]" />
                    </div>
                  </div>
                </MarkerContent>
              </MapMarker>
            )}

            {/* Map Controls (Zoom in, Zoom out) */}
            <MapControls position="bottom-right" showZoom={true} />
          </Map>

          {/* Detailed Floating Koperasi Card when Minahasa Utara is Active */}
          {activeView === 'sulut-minut' && showKoperasiCard && (
            <div className="absolute bottom-4 left-3 sm:left-4 right-3 sm:right-auto z-10 sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-xl border border-emerald-100 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#344d15] text-[#D4F63D] flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Kantor Pusat
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          Minahasa Utara
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight mt-0.5">
                        Koperasi Sinar Pagi Sejahtera
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKoperasiCard(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    aria-label="Tutup info kartu"
                  >
                    ×
                  </button>
                </div>

                <p className="text-xs text-slate-600 font-light leading-relaxed mt-2.5">
                  Sentra agribisnis terpadu: melayani penimbangan komoditas hasil panen petani, pangkalan sewa alat mesin pertanian (alsintan), serta penyaluran hasil tani ke pasar regional.
                </p>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100">
                  <Link
                    href="/toko"
                    className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Katalog Komoditas</span>
                  </Link>
                  <Link
                    href="/sewa-alat"
                    className="py-2 px-3 rounded-xl bg-[#344d15] hover:bg-[#283b10] text-[#D4F63D] text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Tractor className="w-3.5 h-3.5" />
                    <span>Sewa Alat Mesin</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
