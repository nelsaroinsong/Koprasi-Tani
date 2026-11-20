/**
 * Google Maps Platform RESMI (butuh GOOGLE_MAPS_API_KEY di .env, aktifkan Geocoding API & Places API (New)).
 * Tanpa key, semua fungsi mengembalikan null/[] dan pemanggil memakai OpenStreetMap (Photon/Nominatim).
 */

const KEY = process.env.GOOGLE_MAPS_API_KEY;
export const hasGoogleMapsKey = Boolean(KEY);

const PLACES_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName';

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface OfficialPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
}

/** Alamat dari koordinat (Geocoding API) */
export async function googleReverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!KEY) return null;
  return withTimeout(4000, async (signal) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=id&key=${KEY}`,
      { signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data?.results) ? data.results.find((r: any) => !r.plus_code || r.types?.includes('street_address')) || data.results[0] : null;
    return first?.formatted_address || null;
  });
}

function mapPlaces(data: any): OfficialPlace[] {
  return (Array.isArray(data?.places) ? data.places : [])
    .filter((p: any) => p?.location && p?.displayName?.text)
    .map((p: any) => ({
      id: p.id,
      name: p.displayName.text,
      address: p.formattedAddress || p.displayName.text,
      lat: p.location.latitude,
      lng: p.location.longitude,
      category: p.primaryTypeDisplayName?.text,
    }));
}

/** Tempat di sekitar titik (Places API New - Nearby Search) */
export async function googleNearbyPlaces(lat: number, lng: number, radiusMeters = 300): Promise<OfficialPlace[]> {
  if (!KEY) return [];
  const res = await withTimeout(4000, async (signal) => {
    const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY!, 'X-Goog-FieldMask': PLACES_FIELDS },
      body: JSON.stringify({
        maxResultCount: 10,
        languageCode: 'id',
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
      }),
      signal,
    });
    return r.ok ? mapPlaces(await r.json()) : [];
  });
  return res || [];
}

/** Cari tempat dengan kata kunci, diutamakan sekitar Minahasa Utara (Places API New - Text Search) */
export async function googleTextSearch(query: string): Promise<OfficialPlace[]> {
  if (!KEY) return [];
  const res = await withTimeout(4000, async (signal) => {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY!, 'X-Goog-FieldMask': PLACES_FIELDS },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'id',
        regionCode: 'ID',
        maxResultCount: 8,
        locationBias: { circle: { center: { latitude: 1.46, longitude: 124.96 }, radius: 40000 } },
      }),
      signal,
    });
    return r.ok ? mapPlaces(await r.json()) : [];
  });
  return res || [];
}
