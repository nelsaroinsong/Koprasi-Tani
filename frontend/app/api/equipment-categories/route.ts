import { NextResponse } from 'next/server';
import { listCategories } from '@/lib/category-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let categories = await listCategories('equipment');
    if (activeOnly) {
      categories = categories.filter((c) => c.isActive !== false);
    }

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat kategori alat' }, { status: 500 });
  }
}
