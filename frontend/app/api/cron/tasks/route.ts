import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runScheduledTasks } from '@/lib/scheduled-tasks';

export const dynamic = 'force-dynamic';

/**
 * Jalankan tugas terjadwal secara manual / dari penjadwal luar (cron server, GitHub Actions, dll.):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://domain/api/cron/tasks
 * Admin yang sedang login juga boleh memanggilnya.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') || '';
  const bySecret = Boolean(secret) && header === `Bearer ${secret}`;

  if (!bySecret) {
    const session = await auth();
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }
  }

  const result = await runScheduledTasks();
  if (!result) {
    return NextResponse.json({ success: true, skipped: true, message: 'Tugas sedang berjalan, dilewati.' });
  }
  return NextResponse.json({ success: true, result });
}

export const GET = handle;
export const POST = handle;
