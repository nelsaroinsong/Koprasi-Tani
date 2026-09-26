import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import { getCache, setCache, delCache } from '@/lib/redis';

const TICKER_SETTINGS_FILE = path.join(process.cwd(), 'data', 'ticker-settings.json');
const TICKER_CACHE_KEY = 'ticker:settings';

export interface TickerSettings {
  isActive: boolean;
  speed: number;
  bgColor: 'forest' | 'dark' | 'lime' | 'harvest';
  items: string[];
}

const DEFAULT_SETTINGS: TickerSettings = {
  isActive: true,
  speed: 26,
  bgColor: 'forest',
  items: [
    'HASIL PANEN LANGSUNG DARI PETANI',
    'KOMODITAS KELAPA & JAGUNG UNGGULAN',
    'HARGA TRANSPARAN & BEBAS TENGKULAK',
    'SEWA ALAT & MESIN PERTANIAN LENGKAP',
    'PEMBERDAYAAN PETANI MINAHASA UTARA',
    'PEMBAYARAN CASH AMAN DI GUDANG KOPERASI',
    'KUALITAS FISIK TERVERIFIKASI',
    'KOPERASI SINAR PAGI SEJAHTERA',
  ],
};

function readSettingsFromFile(): TickerSettings {
  try {
    if (fs.existsSync(TICKER_SETTINGS_FILE)) {
      const content = fs.readFileSync(TICKER_SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        isActive: typeof parsed.isActive === 'boolean' ? parsed.isActive : DEFAULT_SETTINGS.isActive,
        speed: typeof parsed.speed === 'number' ? parsed.speed : DEFAULT_SETTINGS.speed,
        bgColor: parsed.bgColor || DEFAULT_SETTINGS.bgColor,
        items: Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : DEFAULT_SETTINGS.items,
      };
    }
  } catch (err) {
    console.warn('Error reading ticker settings file:', err);
  }
  return DEFAULT_SETTINGS;
}

function writeSettingsToFile(settings: TickerSettings) {
  try {
    const dir = path.dirname(TICKER_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TICKER_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing ticker settings file:', err);
  }
}

// 1. GET: Ambil pengaturan teks berjalan untuk Landing Page & Admin
export async function GET() {
  try {
    const cached = await getCache<TickerSettings>(TICKER_CACHE_KEY);
    if (cached) {
      return NextResponse.json({ success: true, settings: cached });
    }

    const settings = readSettingsFromFile();
    await setCache(TICKER_CACHE_KEY, settings, 1800); // 30 menit

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error('Error fetching ticker settings:', err);
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  }
}

// 2. PATCH: Simpan pengaturan teks berjalan (khusus ADMIN)
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const current = readSettingsFromFile();

    const newItems = Array.isArray(body.items)
      ? body.items.map((s: any) => String(s).trim()).filter((s: string) => s.length > 0)
      : current.items;

    const newSpeed = typeof body.speed === 'number' ? Math.max(10, Math.min(60, body.speed)) : current.speed;
    const newIsActive = typeof body.isActive === 'boolean' ? body.isActive : current.isActive;
    const newBgColor = ['forest', 'dark', 'lime', 'harvest'].includes(body.bgColor)
      ? body.bgColor
      : current.bgColor;

    const updatedSettings: TickerSettings = {
      isActive: newIsActive,
      speed: newSpeed,
      bgColor: newBgColor,
      items: newItems.length > 0 ? newItems : DEFAULT_SETTINGS.items,
    };

    writeSettingsToFile(updatedSettings);
    await setCache(TICKER_CACHE_KEY, updatedSettings, 1800);

    return NextResponse.json({
      success: true,
      message: 'Pengaturan teks berjalan berhasil disimpan.',
      settings: updatedSettings,
    });
  } catch (err: any) {
    console.error('Error updating ticker settings:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan pengaturan teks berjalan.' },
      { status: 500 }
    );
  }
}
