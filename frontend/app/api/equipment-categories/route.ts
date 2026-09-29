import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CATEGORIES_FILE = path.join(process.cwd(), 'data', 'equipment-categories.json');

export async function GET() {
  try {
    if (!fs.existsSync(CATEGORIES_FILE)) {
      return NextResponse.json({ success: true, categories: [] });
    }
    const data = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
    const categories = JSON.parse(data) || [];
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat kategori alat' }, { status: 500 });
  }
}
