import { NextResponse } from 'next/server';
import { expireOverdueRentals, getDailyAvailability } from '@/lib/equipment-rentals';
import { addDays, parseDateOnly, todayWita } from '@/lib/rental-schedule';

export const dynamic = 'force-dynamic';

/** Rentang kalender paling panjang yang boleh diminta sekaligus */
const MAX_RANGE_DAYS = 120;

// GET /api/equipments/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
// Sisa unit per hari (sudah memperhitungkan sewa terkunci, jeda antar-sewa, dan jadwal servis)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const today = todayWita();

    let from = searchParams.get('from') || today;
    let to = searchParams.get('to') || addDays(from, 41);
    if (!parseDateOnly(from) || !parseDateOnly(to)) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    if (from < today) from = today;
    if (to < from) to = from;
    if (to > addDays(from, MAX_RANGE_DAYS)) to = addDays(from, MAX_RANGE_DAYS);

    await expireOverdueRentals();
    const result = await getDailyAvailability(id, from, to);
    if (!result) {
      return NextResponse.json({ error: 'Unit alat pertanian tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, from, to, today, ...result });
  } catch (error: any) {
    console.error('Error fetching equipment availability:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat ketersediaan alat' },
      { status: 500 }
    );
  }
}
