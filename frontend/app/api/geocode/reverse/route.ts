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
 * 1. Mesin Utama Reverse Geocode Presisi Setara Google Maps Native:
 * Membaca alamat jalan/lorong/nomor rumah/nama PT tepat di koordinat yang dipilih pada ubin Google Maps!
 */
async function fetchExactGoogleMapsAddress(
  lat: number,
  lng: number
): Promise<{ exactAddress: string; title: string; subtitle: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3600);
    const dLat = Number((lat + 0.00004).toFixed(6));
    const url = `https://www.google.com/maps?saddr=${lat},${lng}&daddr=${dLat},${lng}&hl=id&output=embed`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const html = await res.text();

    // Pola array di initEmbed: [[[lat1,lng1],[lat2,lng2]],["Alamat 1","Alamat 2"]
    const match = html.match(
      /\[\[\[\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*\]\s*,\s*\[\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*\]\]\s*,\s*\[\s*"([^"]+)"/
    );

    if (match && match[1]) {
      const rawAddress = match[1].replace(/\\"/g, '"').trim();
      const cleaned = cleanGooglePlusCodes(rawAddress);
      if (cleaned && cleaned.length >= 5) {
        const parts = cleaned
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        const primaryTitle = parts[0] || cleaned;
        const secondarySubtitle = parts.slice(1).join(', ') || cleaned;
        return {
          exactAddress: cleaned,
          title: primaryTitle,
          subtitle: secondarySubtitle,
        };
      }
    }
  } catch {
    // Abaikan jika gagal dan lanjut ke fallback
  }
  return null;
}

/**
 * 2. Ambil daftar kandidat tempat terdekat (Sekitar Pin) dari Google Map Index
 * untuk ditampilkan sebagai chip cepat ala Grab.
 */
async function fetchNearbyMapPlaces(
  lat: number,
  lng: number
): Promise<NearbyPlaceCandidate[]> {
  const queries = ['perusahaan', 'Jl.', 'toko', 'gereja', 'sekolah', 'kantor', 'kost'];
  const candidateMap = new Map<string, NearbyPlaceCandidate>();

  await Promise.all(
    queries.map(async (q) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2800);
        const url = `https://www.google.com/search?tbm=map&authuser=0&hl=id&gl=id&q=${encodeURIComponent(
          q
        )}&pb=!4m12!1m3!1d75!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i12!10b1`;

        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) return;
        const text = await res.text();
        if (!text.startsWith(")]}'")) return;

        const parsed = JSON.parse(text.slice(4));
        const list = parsed?.[0]?.[1];
        if (!Array.isArray(list)) return;

        for (const item of list) {
          const entry = item?.[14];
          if (!entry) continue;

          const name: string = entry[11] || '';
          const rawAddr: string = entry[18] || entry[39] || '';
          const pLat: number = entry[9]?.[2];
          const pLng: number = entry[9]?.[3];
          const category: string = entry[13]?.[0] || '';

          if (!name || typeof pLat !== 'number' || typeof pLng !== 'number') continue;
          if (/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}$/i.test(name)) {
            continue;
          }

          const distMeters = Math.round(
            Math.hypot((pLat - lat) * 111320, (pLng - lng) * 111120)
          );

          if (distMeters > 380) continue;

          const cleanAddr = cleanGooglePlusCodes(rawAddr);
          const extractedStreet = extractStreetOrJagaFromAddress(cleanAddr);

          const key = name.toLowerCase().trim();
          const existing = candidateMap.get(key);
          if (!existing || distMeters < existing.distanceMeters) {
            candidateMap.set(key, {
              name: name.trim(),
              address: cleanAddr || name.trim(),
              category: category || undefined,
              lat: pLat,
              lng: pLng,
              distanceMeters: distMeters,
              streetName: extractedStreet || undefined,
            });
          }
        }
      } catch {}
    })
  );

  return Array.from(candidateMap.values()).sort(
    (a, b) => a.distanceMeters - b.distanceMeters
  );
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

    if (exactGoogle) {
      title = exactGoogle.title;
      subtitle = exactGoogle.subtitle;
      formattedAddress = exactGoogle.exactAddress;

      // Jika Google mengembalikan nama PT (misal "PT Boffe Coconut Indonesia") tapi belum ada nama jalan lorongnya,
      // sedangkan di sekitar ada nama jalan lokal (misal "Jl. kawangkoan"), sisipkan agar makin lengkap!
      const hasStreetInExact = /\b(jl\.|jln\.|jalan|lorong|perum)/i.test(formattedAddress);
      if (!hasStreetInExact && nearbyStreet) {
        const parts = formattedAddress.split(',').map((s) => s.trim());
        parts.splice(1, 0, nearbyStreet);
        formattedAddress = parts.join(', ');
        subtitle = `${nearbyStreet} • ${exactGoogle.subtitle}`;
      }

      // Sebaliknya, jika Google mengembalikan nama jalan (misal "Jl. Karombasan Selatan 4 No.29"),
      // namun tepat di titik pin (<= 22 meter) ada POI spesifik, tambahkan info POI di subtitle tanpa merusak nama jalan di Title!
      if (
        closestPlace &&
        closestPlace.distanceMeters <= 25 &&
        !title.toLowerCase().includes(closestPlace.name.toLowerCase())
      ) {
        subtitle = `Dekat ${closestPlace.name} • ${subtitle}`;
      }
    } else if (closestPlace) {
      // Fallback ke POI terdekat jika Google exact embed timeout
      title = closestPlace.name;
      formattedAddress = closestPlace.address;
      subtitle = closestPlace.address.split(',').slice(1).join(', ').trim() || closestPlace.address;
    } else {
      // Fallback terakhir ke Photon Komoot / Estimasi Kecamatan Minut
      try {
        const pRes = await fetch(
          `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`
        );
        if (pRes.ok) {
          const pData = await pRes.json();
          const props = pData?.features?.[0]?.properties;
          if (props) {
            const pStreet = props.street || props.name || '';
            const pDistrict = props.district || props.city || '';
            const pCounty =
              props.county || (isMinutByCoord ? 'Kab. Minahasa Utara' : '');
            const pState = props.state || 'Sulawesi Utara';
            title = pStreet || pDistrict || 'Titik Lokasi';
            const parts = [pStreet, pDistrict, pCounty, pState].filter(Boolean);
            formattedAddress = parts.join(', ');
            subtitle = parts.slice(1).join(', ');
          }
        }
      } catch {}
    }

    if (!formattedAddress) {
      if (isMinutByCoord) {
        const kec = findClosestMinutKecamatan(latitude, longitude);
        title = `Lahan Kebun Kec. ${kec}`;
        subtitle = `Kec. ${kec}, Kab. Minahasa Utara, Sulawesi Utara`;
        formattedAddress = `Lahan Pertanian (${latitude.toFixed(5)}, ${longitude.toFixed(5)}), Kec. ${kec}, Kab. Minahasa Utara, Sulawesi Utara`;
      } else {
        title = `Titik Koordinat GPS`;
        subtitle = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        formattedAddress = `Titik Lokasi GPS (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
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
