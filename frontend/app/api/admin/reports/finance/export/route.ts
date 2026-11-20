import { auth } from '@/auth';
import { buildFinanceReport } from '@/lib/finance-report';
import { buildFinanceXlsx } from '@/lib/finance-report-xlsx';
import { todayWita } from '@/lib/rental-schedule';
import { actorFromSession, logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD -> file laporan-keuangan-<from>_<to>.xlsx
export async function GET(request: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return Response.json({ error: 'Akses khusus administrator' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const today = todayWita();
  const from = searchParams.get('from') || `${today.slice(0, 7)}-01`;
  const to = searchParams.get('to') || today;
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return Response.json({ error: 'Rentang tanggal tidak valid.' }, { status: 400 });
  }

  try {
    const report = await buildFinanceReport(from, to);
    const file = buildFinanceXlsx(report, session?.user?.name || session?.user?.email);

    await logAudit({
      actor: actorFromSession(session),
      action: 'REPORT_EXPORT',
      entityType: 'SETTINGS',
      entityLabel: 'Laporan keuangan',
      summary: `Mengunduh laporan keuangan ${from} s/d ${to}`,
    });

    return new Response(file as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-keuangan-${from}_${to}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error ekspor laporan keuangan:', error);
    return Response.json({ error: 'Gagal membuat file laporan' }, { status: 500 });
  }
}
