import { NextResponse } from 'next/server';

// Daftar cepat desa & kecamatan populer di Minahasa Utara untuk pencarian instan
const MINUT_QUICK_PLACES = [
  { name: 'Kolongan, Kec. Kalawat', displayName: 'Desa Kolongan, Kec. Kalawat, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4390, lng: 124.9315, category: 'Desa' },
  { name: 'Maumbi, Kec. Kalawat', displayName: 'Desa Maumbi, Kec. Kalawat, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4522, lng: 124.9125, category: 'Desa' },
  { name: 'Watutumou, Kec. Kalawat', displayName: 'Desa Watutumou, Kec. Kalawat, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4465, lng: 124.9220, category: 'Desa' },
  { name: 'Kawangkoan, Kec. Kalawat', displayName: 'Desa Kawangkoan, Kec. Kalawat, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4493, lng: 124.9367, category: 'Desa' },
  { name: 'Suwaan, Kec. Kalawat', displayName: 'Desa Suwaan, Kec. Kalawat, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4320, lng: 124.9430, category: 'Desa' },
  { name: 'Airmadidi Atas, Kec. Airmadidi', displayName: 'Kel. Airmadidi Atas, Kec. Airmadidi, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4268, lng: 124.9839, category: 'Kelurahan' },
  { name: 'Sarongsong, Kec. Airmadidi', displayName: 'Kel. Sarongsong, Kec. Airmadidi, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4185, lng: 124.9745, category: 'Kelurahan' },
  { name: 'Sukur, Kec. Airmadidi', displayName: 'Kel. Sukur, Kec. Airmadidi, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4342, lng: 124.9628, category: 'Kelurahan' },
  { name: 'Rap-Rap, Kec. Airmadidi', displayName: 'Kel. Rap-Rap, Kec. Airmadidi, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4120, lng: 124.9910, category: 'Kelurahan' },
  { name: 'Matungkas, Kec. Dimembe', displayName: 'Desa Matungkas, Kec. Dimembe, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4648, lng: 124.9685, category: 'Desa' },
  { name: 'Laikit, Kec. Dimembe', displayName: 'Desa Laikit, Kec. Dimembe, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4810, lng: 124.9740, category: 'Desa' },
  { name: 'Tatelu, Kec. Dimembe', displayName: 'Desa Tatelu, Kec. Dimembe, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.5015, lng: 124.9820, category: 'Desa' },
  { name: 'Kauditan I, Kec. Kauditan', displayName: 'Desa Kauditan I, Kec. Kauditan, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4167, lng: 125.0667, category: 'Desa' },
  { name: 'Kaima, Kec. Kauditan', displayName: 'Desa Kaima, Kec. Kauditan, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4210, lng: 125.0410, category: 'Desa' },
  { name: 'Tumaluntung, Kec. Kauditan', displayName: 'Desa Tumaluntung, Kec. Kauditan, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.4115, lng: 125.0250, category: 'Desa' },
  { name: 'Talawaan, Kec. Talawaan', displayName: 'Desa Talawaan, Kec. Talawaan, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.5167, lng: 124.9500, category: 'Desa' },
  { name: 'Mapanget, Kec. Talawaan', displayName: 'Desa Mapanget, Kec. Talawaan, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.5045, lng: 124.9310, category: 'Desa' },
  { name: 'Kema I, Kec. Kema', displayName: 'Desa Kema I, Kec. Kema, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.3750, lng: 125.0750, category: 'Desa' },
  { name: 'Likupang Dua, Kec. Likupang Timur', displayName: 'Desa Likupang Dua, Kec. Likupang Timur, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.6765, lng: 125.0552, category: 'Desa' },
  { name: 'Munte, Kec. Likupang Barat', displayName: 'Desa Munte, Kec. Likupang Barat, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.6333, lng: 124.9833, category: 'Desa' },
  { name: 'Kokoleh, Kec. Likupang Selatan', displayName: 'Desa Kokoleh, Kec. Likupang Selatan, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.5833, lng: 125.0333, category: 'Desa' },
  { name: 'Wori, Kec. Wori', displayName: 'Desa Wori, Kec. Wori, Kab. Minahasa Utara, Sulawesi Utara', lat: 1.6000, lng: 124.8667, category: 'Desa' },
];

function stripPlusCode(raw: string): string {
  return raw
    .replace(/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}\s*,?\s*/i, '')
    .trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const qLower = q.toLowerCase();

    // 1. Pencocokan cepat lokal untuk desa/kecamatan Minahasa Utara
    const localMatches = MINUT_QUICK_PLACES.filter(
      (item) =>
        item.name.toLowerCase().includes(qLower) ||
        item.displayName.toLowerCase().includes(qLower)
    ).map((item, idx) => ({
      placeId: `minut-local-${idx}`,
      name: item.name,
      displayName: item.displayName,
      lat: item.lat,
      lng: item.lng,
      category: item.category,
    }));

    // 2. Pencarian langsung ke Google Map Index (mencakup PT, Toko, Gereja, Sekolah, Jalan Lorong di Minut)
    const googleMapResults: typeof localMatches = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3800);
      const searchQ = qLower.includes('minahasa') ? q : `${q} Minahasa Utara`;
      const gUrl = `https://www.google.com/search?tbm=map&authuser=0&hl=id&gl=id&q=${encodeURIComponent(
        searchQ
      )}&pb=!4m12!1m3!1d15000!2d124.96!3d1.46!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i10!10b1`;

      const gRes = await fetch(gUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (gRes.ok) {
        const text = await gRes.text();
        if (text.startsWith(")]}'")) {
          const parsed = JSON.parse(text.slice(4));
          const list = parsed?.[0]?.[1];
          if (Array.isArray(list)) {
            for (const item of list) {
              const entry = item?.[14];
              if (!entry) continue;
              const name: string = entry[11] || '';
              const rawAddr: string = entry[18] || entry[39] || '';
              const lat: number = entry[9]?.[2];
              const lng: number = entry[9]?.[3];
              const category: string = entry[13]?.[0] || 'Tempat';

              if (!name || typeof lat !== 'number' || typeof lng !== 'number') continue;

              googleMapResults.push({
                placeId: `gmap-${entry[10] || Math.random().toString(36).slice(2, 7)}`,
                name: name.trim(),
                displayName: stripPlusCode(rawAddr) || `${name}, Minahasa Utara`,
                lat,
                lng,
                category,
              });
            }
          }
        }
      }
    } catch {}

    // 3. OpenStreetMap Nominatim
    const headers = {
      'User-Agent': 'KoperasiSinarPagiSejahtera/1.0 (admin@sinarpagisejahtera.co.id)',
    };

    const hasRegion =
      qLower.includes('minahasa') ||
      qLower.includes('sulawesi') ||
      qLower.includes('manado') ||
      qLower.includes('bitung');

    const primaryQuery = hasRegion ? q : `${q}, Minahasa Utara, Sulawesi Utara`;
    let rawResults: any[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res1 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encodeURIComponent(
          primaryQuery
        )}&viewbox=124.75,1.88,125.20,1.32&bounded=0&limit=5&accept-language=id&countrycodes=id`,
        { headers, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res1.ok) {
        const data1 = await res1.json();
        if (Array.isArray(data1)) {
          rawResults = data1;
        }
      }
    } catch {}

    const nominatimMapped = rawResults.map((item: any) => ({
      placeId: String(item.place_id),
      name: item.name || item.display_name?.split(',')[0] || q,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      category: item.category || item.type || 'lokasi',
    }));

    // Gabungkan hasil Google Map Index + Lokal Minut + Nominatim tanpa duplikat koordinat berdekatan
    const merged: typeof localMatches = [...googleMapResults, ...localMatches];
    for (const remote of nominatimMapped) {
      const isDuplicate = merged.some(
        (m) => Math.abs(m.lat - remote.lat) < 0.0015 && Math.abs(m.lng - remote.lng) < 0.0015
      );
      if (!isDuplicate) {
        merged.push(remote);
      }
    }

    return NextResponse.json({
      success: true,
      results: merged.slice(0, 8),
    });
  } catch (err: any) {
    console.error('Geocode search error:', err);
    return NextResponse.json({ success: false, results: [], error: err.message }, { status: 500 });
  }
}
