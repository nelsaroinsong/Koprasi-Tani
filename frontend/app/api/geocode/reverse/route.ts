import { googleNearbyPlaces, googleReverseGeocode, googleTextSearch } from '@/lib/google-maps-official';
import { NextResponse } from 'next/server';

// Daftar koordinat 10 Kecamatan di Kabupaten Minahasa Utara
const KECAMATAN_MINUT_COORDS = [
  { name: 'Kalawat', lat: 1.4390, lng: 124.9315 },
  { name: 'Airmadidi', lat: 1.4233, lng: 124.9814 },
  { name: 'Kauditan', lat: 1.4167, lng: 125.0667 },
  { name: 'Dimembe', lat: 1.4883, lng: 124.9750 },
  { name: 'Talawaan', lat: 1.5167, lng: 124.9500 },
  { name: 'Kema', lat: 1.3750, lng: 125.0750 },
  { name: 'Likupang Timur', lat: 1.6833, lng: 125.0500 },
  { name: 'Likupang Barat', lat: 1.6333, lng: 124.9833 },
  { name: 'Likupang Selatan', lat: 1.5833, lng: 125.0333 },
  { name: 'Wori', lat: 1.6000, lng: 124.8667 },
];

export interface NearbyPlaceCandidate {
  name: string;
  address: string;
  category?: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  streetName?: string;
}

function findClosestMinutKecamatan(lat: number, lng: number): string {
  let closest = KECAMATAN_MINUT_COORDS[0];
  let minDistance = Infinity;

  for (const kec of KECAMATAN_MINUT_COORDS) {
    const dLat = lat - kec.lat;
    const dLng = lng - kec.lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = kec;
    }
  }

  return closest.name;
}

/**
 * Evaluasi batas geografis apakah titik koordinat berada di dalam Kabupaten Minahasa Utara
 * (mengecualikan Kota Manado, Kota Bitung pusat/selatan, Kota Tomohon, dan Kab. Minahasa induk).
 */
function checkIsMinahasaUtaraCoordinate(lat: number, lng: number): boolean {
  const isManadoCore =
    lat >= 1.435 && lat <= 1.565 && lng >= 124.78 && lng <= 124.895;
  const isMinahasaSouth = lat < 1.39 && lng < 125.01;
  const isBitungCore =
    lat >= 1.38 && lat <= 1.52 && lng >= 125.115 && lng <= 125.28;

  if (isManadoCore || isMinahasaSouth || isBitungCore) {
    return false;
  }

  return lat >= 1.33 && lat <= 1.88 && lng >= 124.75 && lng <= 125.18;
}

/**
 * Bersihkan Plus Code (contoh: "CWXP+VP, " atau "FWG6+6HG ") di dalam string alamat Google Maps
 */
function cleanGooglePlusCodes(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}\b\s*,?\s*/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*|\s*,\s*$/g, '')
    .trim();
}

/**
 * Ekstrak nama jalan / lorong / jaga dari teks alamat lengkap
 */
function extractStreetOrJagaFromAddress(addr: string): string {
  if (!addr) return '';
  const matchJl = addr.match(
    /\b((?:Jl\.|Jln\.|Jalan|Lorong|Lrg\.|Komp\.|Komplek|Perum|Perumahan)\s+[A-Za-z0-9\s.\-/]+?)(?=,|$)/i
  );
  if (matchJl && matchJl[1]) {
    return matchJl[1].trim();
  }
  const matchJaga = addr.match(/\b(Jaga\s+[0-9IVX]+)\b/i);
  if (matchJaga && matchJaga[1]) {
    return matchJaga[1].trim();
  }
  return '';
}

/**
 * 1. Alamat presisi di titik pin melalui Google Geocoding API RESMI (bila GOOGLE_MAPS_API_KEY diset).
 *    Tanpa key -> null, lalu memakai POI terdekat / OpenStreetMap (Photon) di bawah.
 */
async function fetchExactGoogleMapsAddress(
  lat: number,
  lng: number
): Promise<{ exactAddress: string; title: string; subtitle: string } | null> {
  const formatted = await googleReverseGeocode(lat, lng);
  if (!formatted) return null;
  const cleaned = cleanGooglePlusCodes(formatted);
  if (!cleaned || cleaned.length < 5 || !/[a-zA-Z]/.test(cleaned)) return null;
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  return { exactAddress: cleaned, title: parts[0] || cleaned, subtitle: parts.slice(1).join(', ') || cleaned };
}

/**
 * 2. Tempat di sekitar pin melalui Google Places API (New) RESMI (bila GOOGLE_MAPS_API_KEY diset).
 *    Tanpa key -> daftar kosong (chip tempat sekitar tidak ditampilkan).
 */
async function fetchNearbyMapPlaces(lat: number, lng: number): Promise<NearbyPlaceCandidate[]> {
  const places = await googleNearbyPlaces(lat, lng, 380);
  return places
    .map((p) => {
      const cleanAddr = cleanGooglePlusCodes(p.address);
      return {
        name: p.name.trim(),
        address: cleanAddr || p.name.trim(),
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        distanceMeters: Math.round(Math.hypot((p.lat - lat) * 111320, (p.lng - lng) * 111120)),
        streetName: extractStreetOrJagaFromAddress(cleanAddr) || undefined,
      };
    })
    .filter((p) => p.distanceMeters <= 380)
    .sort((x, y) => x.distanceMeters - y.distanceMeters);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Parameter lat dan lng wajib disertakan.' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Koordinat tidak valid.' },
        { status: 400 }
      );
    }

    const isMinutByCoord = checkIsMinahasaUtaraCoordinate(latitude, longitude);

    const isCoordinateString = (str: string | null | undefined): boolean => {
      if (!str) return true;
      const s = str.trim();
      return !/[a-zA-Z]/.test(s) || /^[-0-9.,\s]+$/.test(s);
    };

    // Jalankan secara paralel:
    // 1. Exact Google Maps Street/POI Reverse Geocode (presisi jalan & nomor rumah)
    // 2. Nearby Places (chip tempat sekitar pin)
    const [exactGoogle, nearbyPlaces] = await Promise.all([
      fetchExactGoogleMapsAddress(latitude, longitude),
      fetchNearbyMapPlaces(latitude, longitude),
    ]);

    let title = '';
    let subtitle = '';
    let formattedAddress = '';

    const closestPlace = nearbyPlaces[0] || null;
    const nearbyStreet = nearbyPlaces.find((p) => p.streetName)?.streetName || '';

    // Hanya gunakan exactGoogle jika bukan deretan angka koordinat mentah
    if (exactGoogle && !isCoordinateString(exactGoogle.exactAddress)) {
      title = exactGoogle.title;
      subtitle = exactGoogle.subtitle;
      formattedAddress = exactGoogle.exactAddress;

      // Jika Google mengembalikan nama PT (misal "PT Boffe Coconut Indonesia") tapi belum ada nama jalan lorongnya,
      // sedangkan di sekitar ada nama jalan lokal (misal "Jl. Kuwil - Kalawat"), sisipkan agar makin lengkap!
      const hasStreetInExact = /\b(jl\.|jln\.|jalan|lorong|perum)/i.test(formattedAddress);
      if (!hasStreetInExact && nearbyStreet) {
        const parts = formattedAddress.split(',').map((s) => s.trim());
        parts.splice(1, 0, nearbyStreet);
        formattedAddress = parts.join(', ');
        subtitle = `${nearbyStreet} • ${exactGoogle.subtitle}`;
      }

      // Sebaliknya, jika Google mengembalikan nama jalan (misal "Jl. Karombasan Selatan 4 No.29"),
      // namun tepat di titik pin (<= 25 meter) ada POI spesifik, tambahkan info POI di subtitle!
      if (
        closestPlace &&
        closestPlace.distanceMeters <= 25 &&
        !title.toLowerCase().includes(closestPlace.name.toLowerCase())
      ) {
        subtitle = `Dekat ${closestPlace.name} • ${subtitle}`;
      }
    } else if (closestPlace && closestPlace.distanceMeters <= 250) {
      // Fallback ke POI terdekat jika Google exact embed timeout atau titik kebun kosong
      title = closestPlace.name;
      formattedAddress = closestPlace.address;
      subtitle = closestPlace.address.split(',').slice(1).join(', ').trim() || closestPlace.address;
    } else {
      // Fallback ke Photon Komoot (OpenStreetMap) untuk nama desa/waduk/kecamatan presisi
      try {
        const pRes = await fetch(
          `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`
        );
        if (pRes.ok) {
          const pData = await pRes.json();
          const props = pData?.features?.[0]?.properties;
          if (props) {
            const pName = props.name || '';
            const pStreet = props.street && props.street !== pName ? props.street : '';
            const pDistrict = props.district || '';
            const pCity = props.city && props.city !== pDistrict ? props.city : '';
            const pCounty =
              props.county || (isMinutByCoord ? 'Kab. Minahasa Utara' : '');
            const pState = props.state || 'Sulawesi Utara';

            const titleCandidate = pName || pStreet || pCity || pDistrict;
            if (titleCandidate && !isCoordinateString(titleCandidate)) {
              title = titleCandidate;
            }

            const parts = [pName, pStreet, pCity, pDistrict, pCounty, pState].filter(
              (p) => Boolean(p) && !isCoordinateString(p)
            );
            const uniqueParts = parts.filter((item, idx) => parts.indexOf(item) === idx);
            if (uniqueParts.length > 0) {
              formattedAddress = uniqueParts.join(', ');
              subtitle = uniqueParts.slice(1).join(', ') || formattedAddress;
            }
          }
        }
      } catch {}
    }

    // Jika masih kosong atau hanya koordinat mentah, fallback ke nama Kecamatan terdekat Minahasa Utara
    if (!formattedAddress || isCoordinateString(formattedAddress)) {
      if (isMinutByCoord) {
        const kec = findClosestMinutKecamatan(latitude, longitude);
        title = closestPlace ? closestPlace.name : `Lahan Pertanian Kec. ${kec}`;
        subtitle = `Kec. ${kec}, Kab. Minahasa Utara, Sulawesi Utara`;
        formattedAddress = closestPlace
          ? `${closestPlace.name}, Kec. ${kec}, Kab. Minahasa Utara, Sulawesi Utara`
          : `Lahan Pertanian (${latitude.toFixed(5)}, ${longitude.toFixed(5)}), Kec. ${kec}, Kab. Minahasa Utara, Sulawesi Utara`;
      } else {
        title = `Titik Koordinat GPS`;
        subtitle = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        formattedAddress = `Titik Lokasi GPS (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
      }
    }

    // Pastikan title & subtitle tidak berupa koordinat mentah jika di Minut
    if (isMinutByCoord) {
      const kec = findClosestMinutKecamatan(latitude, longitude);
      if (isCoordinateString(title)) {
        title = closestPlace ? closestPlace.name : `Lahan Kebun Kec. ${kec}`;
      }
      if (isCoordinateString(subtitle)) {
        subtitle = `Kec. ${kec}, Kab. Minahasa Utara, Sulawesi Utara`;
      }
    }

    // Pastikan apakah alamat yang dihasilkan berada di Kabupaten Minahasa Utara
    const addrLower = formattedAddress.toLowerCase();
    const isManadoOrOutside =
      addrLower.includes('kota manado') ||
      addrLower.includes('kota bitung') ||
      addrLower.includes('kota tomohon') ||
      addrLower.includes('minahasa selatan') ||
      addrLower.includes('minahasa tenggara');

    const finalIsMinut =
      addrLower.includes('minahasa utara') || (!isManadoOrOutside && isMinutByCoord);

    return NextResponse.json({
      success: true,
      title: title || formattedAddress.split(',')[0],
      subtitle: subtitle || formattedAddress,
      address: formattedAddress,
      latitude,
      longitude,
      isMinahasaUtara: finalIsMinut,
      nearbyPlaces: nearbyPlaces.slice(0, 6),
    });
  } catch (err: any) {
    console.error('Error reverse geocoding:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mendeteksi alamat lokasi.' },
      { status: 500 }
    );
  }
}
