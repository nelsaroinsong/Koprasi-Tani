import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CATEGORIES_FILE = path.join(process.cwd(), 'data', 'equipment-categories.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!fs.existsSync(CATEGORIES_FILE)) {
      return NextResponse.json({ success: true, categories: [] });
    }
    const data = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
    let categories = JSON.parse(data) || [];

    if (activeOnly) {
      categories = categories.filter((c: any) => c.isActive !== false);
    }

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat kategori alat' }, { status: 500 });
  }
}
