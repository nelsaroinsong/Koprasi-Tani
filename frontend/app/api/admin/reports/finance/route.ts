import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { buildFinanceReport } from '@/lib/finance-report';
import { todayWita } from '@/lib/rental-schedule';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET ?from=2026-11-01&to=2026-11-30 (tanggal WITA, inklusif). Default: bulan berjalan.
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const today = todayWita();
    const from = searchParams.get('from') || `${today.slice(0, 7)}-01`;
    const to = searchParams.get('to') || today;

    if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
      return NextResponse.json({ error: 'Rentang tanggal tidak valid.' }, { status: 400 });
    }
    const days = (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000;
    if (days > 366) {
      return NextResponse.json({ error: 'Rentang laporan maksimal 1 tahun.' }, { status: 400 });
    }

    const report = await buildFinanceReport(from, to);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error laporan keuangan:', error);
    return NextResponse.json({ error: 'Gagal menyusun laporan keuangan' }, { status: 500 });
  }
}
