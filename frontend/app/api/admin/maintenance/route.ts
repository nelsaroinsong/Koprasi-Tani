import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { actorFromSession } from '@/lib/audit-log';
import {
  getMaintenanceConfig,
  saveMaintenanceConfig,
} from '@/lib/maintenance-server';
import { evaluateMaintenance } from '@/lib/maintenance';
import {
  BYPASS_COOKIE_MAX_AGE,
  createAdminBypassToken,
  MAINTENANCE_BYPASS_COOKIE,
} from '@/lib/maintenance-bypass';

export const dynamic = 'force-dynamic';

async function attachBypassCookie(res: NextResponse) {
  const token = await createAdminBypassToken();
  res.cookies.set(MAINTENANCE_BYPASS_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: BYPASS_COOKIE_MAX_AGE,
  });
  return res;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const config = await getMaintenanceConfig(true);
    const status = evaluateMaintenance(config);

    const res = NextResponse.json(
      { success: true, config, status },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    return attachBypassCookie(res);
  } catch (error) {
    console.error('[GET /api/admin/maintenance] Error:', error);
    return NextResponse.json({ error: 'Gagal memuat pengaturan pemeliharaan' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const { config, status } = await saveMaintenanceConfig(body, actorFromSession(session));

    const res = NextResponse.json(
      {
        success: true,
        config,
        status,
        message: status.isMaintenance
          ? 'Pengaturan disimpan. Mode pemeliharaan sedang AKTIF untuk pengguna.'
          : status.isAnnouncement
            ? 'Pengaturan disimpan. Banner pengumuman pra-pemeliharaan sedang tampil di web.'
            : 'Pengaturan pemeliharaan sistem berhasil disimpan.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    return attachBypassCookie(res);
  } catch (error: any) {
    const msg = error?.message || 'Gagal menyimpan pengaturan pemeliharaan';
    const isValidation = /harus|tidak boleh|lebih akhir/i.test(msg);
    if (!isValidation) {
      console.error('[PUT /api/admin/maintenance] Error:', error);
    }
    return NextResponse.json({ error: msg }, { status: isValidation ? 400 : 500 });
  }
}
