import { NextResponse } from 'next/server';
import { getMaintenanceStatus } from '@/lib/maintenance-server';

export const dynamic = 'force-dynamic';

/** Endpoint publik ringan untuk mengecek status pemeliharaan sistem saat ini */
export async function GET() {
  try {
    const status = await getMaintenanceStatus();
    return NextResponse.json(
      { success: true, ...status },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[GET /api/system/maintenance] Error:', error);
    return NextResponse.json(
      {
        success: true,
        phase: 'NORMAL',
        isMaintenance: false,
        isAnnouncement: false,
        source: null,
        activeWindow: null,
        upcomingWindow: null,
        retryAfterSeconds: 0,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
