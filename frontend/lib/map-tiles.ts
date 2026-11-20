import type { StyleSpecification, Map as MapLibreMap } from 'maplibre-gl';

/**
 * Sumber ubin (tile) peta yang SAH dipakai.
 * - Dengan NEXT_PUBLIC_MAPTILER_KEY: MapTiler (jalan, satelit+label, medan) — ada paket gratis.
 * - Tanpa key: OpenStreetMap (jalan), Esri World Imagery + label (satelit), OpenTopoMap (medan).
 * Atribusi wajib ditampilkan (tombol "i" di pojok peta).
 */

export type BaseLayer = 'streets' | 'hybrid' | 'terrain';

const LAYER_ID: Record<BaseLayer, string> = {
  streets: 'base-streets',
  hybrid: 'base-hybrid',
  terrain: 'base-terrain',
};
const HYBRID_LABELS_ID = 'base-hybrid-labels';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export const MAP_MAX_ZOOM = 19;

export function buildBaseMapStyle(active: BaseLayer = 'hybrid'): StyleSpecification {
  const vis = (l: BaseLayer) => ({ visibility: (l === active ? 'visible' : 'none') as 'visible' | 'none' });

  if (MAPTILER_KEY) {
    const mt = (map: string, ext: 'png' | 'jpg') => [`https://api.maptiler.com/maps/${map}/256/{z}/{x}/{y}.${ext}?key=${MAPTILER_KEY}`];
    const attribution =
      '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a>';
    return {
      version: 8,
      sources: {
        streets: { type: 'raster', tiles: mt('streets-v2', 'png'), tileSize: 256, maxzoom: 20, attribution },
        hybrid: { type: 'raster', tiles: mt('hybrid', 'jpg'), tileSize: 256, maxzoom: 20, attribution },
        terrain: { type: 'raster', tiles: mt('outdoor-v2', 'png'), tileSize: 256, maxzoom: 20, attribution },
      },
      layers: [
        { id: LAYER_ID.streets, type: 'raster', source: 'streets', layout: vis('streets') },
        { id: LAYER_ID.terrain, type: 'raster', source: 'terrain', layout: vis('terrain') },
        { id: LAYER_ID.hybrid, type: 'raster', source: 'hybrid', layout: vis('hybrid') },
      ],
    };
  }

  return {
    version: 8,
    sources: {
      streets: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      },
      hybrid: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Citra &copy; Esri, Maxar, Earthstar Geographics',
      },
      hybridLabels: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
      },
      terrain: {
        type: 'raster',
        tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 17,
        attribution: '&copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA), &copy; OpenStreetMap',
      },
    },
    layers: [
      { id: LAYER_ID.streets, type: 'raster', source: 'streets', layout: vis('streets') },
      { id: LAYER_ID.terrain, type: 'raster', source: 'terrain', layout: vis('terrain') },
      { id: LAYER_ID.hybrid, type: 'raster', source: 'hybrid', layout: vis('hybrid') },
      { id: HYBRID_LABELS_ID, type: 'raster', source: 'hybridLabels', layout: vis('hybrid') },
    ],
  };
}

/** Ganti tampilan dasar peta (jalan / satelit / medan) */
export function applyBaseLayer(map: MapLibreMap | null | undefined, active: BaseLayer) {
  if (!map || !map.isStyleLoaded()) return;
  try {
    (Object.keys(LAYER_ID) as BaseLayer[]).forEach((l) => {
      if (map.getLayer(LAYER_ID[l])) map.setLayoutProperty(LAYER_ID[l], 'visibility', l === active ? 'visible' : 'none');
    });
    if (map.getLayer(HYBRID_LABELS_ID)) {
      map.setLayoutProperty(HYBRID_LABELS_ID, 'visibility', active === 'hybrid' ? 'visible' : 'none');
    }
  } catch {}
}
