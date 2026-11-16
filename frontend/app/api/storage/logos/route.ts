import { NextResponse } from 'next/server';
import { getSetting, SETTING_KEYS } from '@/lib/app-settings';


export interface PartnerLogo {
  id: string;
  name: string;
  url: string;
  key?: string;
}

const DEFAULT_LOGOS: PartnerLogo[] = [
  {
    id: 'logo-icare',
    key: 'logo/logo-icare.webp',
    name: 'ICARE',
    url: '/api/storage/logo/logo-icare.webp',
  },
  {
    id: 'logo-polimdo',
    key: 'logo/logo polimdo.png',
    name: 'POLIMDO',
    url: '/api/storage/logo/logo polimdo.png',
  },
];

async function readLogosFromFile(): Promise<PartnerLogo[]> {
  try {
    const saved = await getSetting<PartnerLogo[]>(SETTING_KEYS.partnerLogos);
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (err) {
    console.warn('Error reading partner logos setting:', err);
  }
  return DEFAULT_LOGOS;
}

export const dynamic = 'force-dynamic';

// GET: Ambil daftar logo mitra pendukung (dipakai beranda). Logo disimpan di tabel app_settings (kunci partner_logos).
export async function GET() {
  try {
    const logos = await readLogosFromFile();
    return NextResponse.json(
      {
        success: true,
        total: logos.length,
        logos,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching logos:', error);
    return NextResponse.json({
      success: true,
      total: DEFAULT_LOGOS.length,
      logos: DEFAULT_LOGOS,
    });
  }
}
