import { NextResponse } from 'next/server';

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

    let formattedAddress = '';
    let locationDetails: any = null;

    // 1. Coba OpenStreetMap Nominatim terlebih dahulu
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=id`,
        {
          headers: {
            'User-Agent': 'KoperasiSinarPagiSejahtera/1.0 (admin@sinarpagisejahtera.co.id)',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          locationDetails = addr;

          const street =
            addr.road ||
            addr.pedestrian ||
            addr.residential ||
            addr.suburb ||
            addr.hamlet ||
            addr.village ||
            '';

          const village = addr.village || addr.suburb || addr.neighbourhood || '';
          const district = addr.county || addr.city_district || addr.district || '';
          const cityOrRegency = addr.city || addr.town || addr.municipality || addr.county || '';
          const province = addr.state || '';
          const postcode = addr.postcode ? ` ${addr.postcode}` : '';

          const parts = [
            street,
            village && village !== street ? `Kel./Desa ${village}` : '',
            district ? `Kec. ${district}` : '',
            cityOrRegency ? cityOrRegency : '',
            province ? province : '',
          ].filter(Boolean);

          if (parts.length > 0) {
            formattedAddress = parts.join(', ') + postcode;
          } else if (data.display_name) {
            formattedAddress = data.display_name;
          }
        }
      }
    } catch (nominatimErr) {
      console.warn('Nominatim reverse geocode timeout or error, trying fallback:', nominatimErr);
    }

    // 2. Fallback: BigDataCloud Reverse Geocoding jika Nominatim gagal
    if (!formattedAddress) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data) {
            const parts = [
              data.locality,
              data.city,
              data.principalSubdivision,
              data.countryName,
            ].filter(Boolean);

            if (parts.length > 0) {
              formattedAddress = parts.join(', ');
            }
          }
        }
      } catch (bdcErr) {
        console.warn('BigDataCloud reverse geocode fallback error:', bdcErr);
      }
    }

    // 3. Fallback terakhir: Format titik koordinat GPS
    if (!formattedAddress) {
      formattedAddress = `Titik Lokasi GPS (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
    }

    return NextResponse.json({
      success: true,
      address: formattedAddress,
      latitude,
      longitude,
      details: locationDetails,
    });
  } catch (err: any) {
    console.error('Error reverse geocoding:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mendeteksi alamat lokasi.' },
      { status: 500 }
    );
  }
}
