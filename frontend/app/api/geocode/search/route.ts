import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const headers = {
      'User-Agent': 'KoperasiSinarPagiSejahtera/1.0 (admin@sinarpagisejahtera.co.id)',
    };

    // 1. Coba cari dengan konteks Sulawesi Utara / Minahasa Utara terlebih dahulu jika belum disebut
    const hasRegion =
      q.toLowerCase().includes('minahasa') ||
      q.toLowerCase().includes('sulawesi') ||
      q.toLowerCase().includes('manado') ||
      q.toLowerCase().includes('bitung');

    const primaryQuery = hasRegion ? q : `${q}, Minahasa Utara, Sulawesi Utara, Indonesia`;

    let rawResults: any[] = [];

    try {
      const res1 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encodeURIComponent(
          primaryQuery
        )}&limit=5&accept-language=id&countrycodes=id`,
        { headers }
      );
      if (res1.ok) {
        const data1 = await res1.json();
        if (Array.isArray(data1)) {
          rawResults = data1;
        }
      }
    } catch {}

    // 2. Fallback: Jika tidak ditemukan di Minahasa Utara, cari di Sulawesi Utara / seluruh Indonesia
    if (rawResults.length === 0 && !hasRegion) {
      try {
        const res2 = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encodeURIComponent(
            `${q}, Sulawesi Utara, Indonesia`
          )}&limit=5&accept-language=id&countrycodes=id`,
          { headers }
        );
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2)) {
            rawResults = data2;
          }
        }
      } catch {}
    }

    if (rawResults.length === 0) {
      try {
        const res3 = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encodeURIComponent(
            q
          )}&limit=5&accept-language=id&countrycodes=id`,
          { headers }
        );
        if (res3.ok) {
          const data3 = await res3.json();
          if (Array.isArray(data3)) {
            rawResults = data3;
          }
        }
      } catch {}
    }

    const results = rawResults.map((item: any) => ({
      placeId: String(item.place_id),
      name: item.name || item.display_name?.split(',')[0] || q,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      category: item.category || item.type || 'lokasi',
    }));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: any) {
    console.error('Geocode search error:', err);
    return NextResponse.json({ success: false, results: [], error: err.message }, { status: 500 });
  }
}
