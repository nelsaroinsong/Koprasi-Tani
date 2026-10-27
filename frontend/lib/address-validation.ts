/**
 * Helper validasi alamat domisili dan lokasi lahan kebun:
 * Membatasi wilayah operasional HANYA di sekitar Kabupaten Minahasa Utara (Minut), Sulawesi Utara.
 */

// 10 Kecamatan Resmi di Kabupaten Minahasa Utara
export const MINAHASA_UTARA_KECAMATAN = [
  'Kalawat',
  'Airmadidi',
  'Kauditan',
  'Kema',
  'Dimembe',
  'Talawaan',
  'Likupang Timur',
  'Likupang Barat',
  'Likupang Selatan',
  'Wori',
] as const;

// Desa / Kelurahan / Area Spesifik di Minahasa Utara
export const MINAHASA_UTARA_AREAS = [
  'kolongan',
  'watutumou',
  'suwaan',
  'maumbi',
  'matungkas',
  'tatelu',
  'laikit',
  'paniki atas',
  'tumaluntung',
  'sawangan',
  'sarawet',
  'treman',
  'kaasar',
  'karegesan',
  'lembean',
  'tetey',
  'wasian',
  'marinsow',
  'pulisan',
  'kawangkoan kalawat',
  'kuwil',
  'kawiley',
  'paslaten',
  'tanggari',
  'sampiri',
  'gangga',
  'siladen',
  'mantehage',
  'nain',
  'makalisung',
  'lilang',
  'lansot',
  'batutambor',
  'kima bajo',
  'tiwoho',
  'budo',
  'tarabitan',
  'mubune',
  'maliambao',
  'jayakarsa',
  'kokoleh',
  'kaweruan',
  'wangurer',
  'rinondoran',
  'winuri',
  'resetlemen',
  'kaima',
  'watudambo',
  'airmadidi atas',
  'airmadidi bawah',
  'sarongsong',
  'rap-rap',
  'sukur',
  'wusa',
  'warisa',
  'teep',
  'kema i',
  'kema ii',
  'kema iii',
  'kalawat',
  'airmadidi',
  'kauditan',
  'dimembe',
  'talawaan',
  'likupang',
  'wori',
];

// Area luar Minahasa Utara yang sering dimasukkan (Kota Manado, Tomohon, Bitung, dsb)
export const NON_MINUT_AREAS = [
  'manado',
  'kota manado',
  'karombasan',
  'ranotana',
  'malalayang',
  'sario',
  'wanea',
  'wenang',
  'tikala',
  'paal dua',
  'paal 2',
  'paal iv',
  'paal 4',
  'tuminting',
  'singkil',
  'tingkulu',
  'teling',
  'kleak',
  'bahu',
  'paniki bawah',
  'mapanget barat',
  'batu kota',
  'winangun',
  'ranomuut',
  'kairagi',
  'taas',
  'dendengan',
  'sawangan manado',
  'tomohon',
  'kota tomohon',
  'bitung',
  'kota bitung',
  'kotamobagu',
  'tondano',
  'minahasa selatan',
  'minsel',
  'minahasa tenggara',
  'mitra',
  'amurang',
  'ratahan',
  'gorontalo',
  'makassar',
  'jakarta',
  'surabaya',
];

// Bounding box koordinat geografis Kabupaten Minahasa Utara
// Wilayah daratan Minut umumnya di utara Lat 1.34 dan timur Lng 124.89
const MINUT_GEO_BOUNDS = {
  minLat: 1.25,
  maxLat: 1.85,
  minLng: 124.75,
  maxLng: 125.25,
};

/**
 * Cek apakah titik koordinat berada di pusat perkotaan Kota Manado (termasuk Karombasan, Ranotana, dsb)
 */
export function isCoordinateInManado(lat: number, lng: number): boolean {
  // Area perkotaan Manado membentang di Latitude 1.43 - 1.53 dan Longitude 124.80 - 124.89
  return lat >= 1.43 && lat <= 1.53 && lng >= 124.80 && lng <= 124.89;
}

/**
 * Cek apakah koordinat GPS berada dalam wilayah Minahasa Utara
 */
export function isCoordinateInMinut(lat: number, lng: number): boolean {
  if (isCoordinateInManado(lat, lng)) {
    return false;
  }
  return (
    lat >= MINUT_GEO_BOUNDS.minLat &&
    lat <= MINUT_GEO_BOUNDS.maxLat &&
    lng >= MINUT_GEO_BOUNDS.minLng &&
    lng <= MINUT_GEO_BOUNDS.maxLng
  );
}

export interface AddressValidationResult {
  isValid: boolean;
  error?: string;
  cleanAddress: string;
}

/**
 * Mengecek apakah sebuah string alamat atau titik GPS berada di wilayah Minahasa Utara.
 */
export function isMinahasaUtaraAddress(address: string | null | undefined): boolean {
  if (!address || typeof address !== 'string') return false;
  const lower = address.toLowerCase().trim();
  if (lower.length < 3) return false;

  // 1. Cek jika mengandung area yang PASTI di luar Minahasa Utara (misal Karombasan, Ranotana, Manado, dsb)
  const isExcludedArea = NON_MINUT_AREAS.some((nonArea) => lower.includes(nonArea));
  if (isExcludedArea) {
    // Jika ada kata Minahasa Utara / Minut, pastikan bukan kelurahan khas Manado
    const isManadoUrban = [
      'karombasan',
      'ranotana',
      'malalayang',
      'sario',
      'wanea',
      'wenang',
      'tikala',
      'paal dua',
      'paal 2',
      'tuminting',
      'singkil',
      'tingkulu',
      'teling',
      'kleak',
      'bahu',
      'winangun',
      'ranomuut',
      'kairagi',
    ].some((m) => lower.includes(m));

    if (isManadoUrban) {
      return false; // Pasti di Kota Manado (misal Karombasan, Ranotana), BUKAN Minahasa Utara
    }

    // Jika mengandung 'manado' dan tidak menyebutkan kecamatan Minut
    const hasMinutDistrict = MINAHASA_UTARA_KECAMATAN.some((kec) =>
      lower.includes(kec.toLowerCase())
    );
    if (!hasMinutDistrict && !lower.includes('minahasa utara') && !lower.includes('minut')) {
      return false;
    }
  }

  // 2. Cek kata kunci eksplisit Minahasa Utara / Minut
  if (
    lower.includes('minahasa utara') ||
    lower.includes('minut') ||
    lower.includes('kab. minahasa utara') ||
    lower.includes('kabupaten minahasa utara')
  ) {
    return true;
  }

  // 3. Cek apakah menyebutkan salah satu dari 10 kecamatan resmi Minut
  const hasKecamatan = MINAHASA_UTARA_KECAMATAN.some((kec) =>
    lower.includes(kec.toLowerCase())
  );
  if (hasKecamatan) return true;

  // 4. Cek desa / kelurahan populer di Minahasa Utara
  const hasArea = MINAHASA_UTARA_AREAS.some((area) => lower.includes(area));
  if (hasArea) return true;

  // 5. Cek jika input berupa format titik koordinat GPS
  const coordsMatch = lower.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return isCoordinateInMinut(lat, lng);
    }
  }

  return false;
}

/**
 * Validasi alamat dengan feedback pesan error ramah pengguna.
 */
export function validateMinahasaUtaraAddress(
  address: string | null | undefined,
  isRequired = true
): AddressValidationResult {
  if (!address || typeof address !== 'string' || !address.trim()) {
    if (isRequired) {
      return {
        isValid: false,
        error: 'Alamat domisili / lokasi lahan wajib diisi.',
        cleanAddress: '',
      };
    }
    return { isValid: true, cleanAddress: '' };
  }

  const clean = address.trim();

  if (clean.length < 5) {
    return {
      isValid: false,
      error: 'Alamat terlalu singkat. Mohon ketik nama desa/kelurahan dan kecamatan lengkap.',
      cleanAddress: clean,
    };
  }

  if (!isMinahasaUtaraAddress(clean)) {
    const lower = clean.toLowerCase();
    const isManado = NON_MINUT_AREAS.some((area) => lower.includes(area));

    if (isManado) {
      return {
        isValid: false,
        error:
          'Lokasi terdeteksi di luar Kabupaten Minahasa Utara (area Kota Manado / sekitarnya). Layanan sewa alsintan koperasi hanya berlaku untuk wilayah Minut.',
        cleanAddress: clean,
      };
    }

    return {
      isValid: false,
      error:
        'Alamat wajib berada di wilayah Kabupaten Minahasa Utara (Minut), meliputi kecamatan: Kalawat, Airmadidi, Kauditan, Kema, Dimembe, Talawaan, Likupang, atau Wori.',
      cleanAddress: clean,
    };
  }

  return {
    isValid: true,
    cleanAddress: clean,
  };
}
