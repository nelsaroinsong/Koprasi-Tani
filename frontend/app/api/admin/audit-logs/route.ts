import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ENTITY_TYPES = ['ORDER', 'RENTAL', 'PAYOUT', 'PRODUCT', 'EQUIPMENT', 'USER', 'SETTINGS', 'CATEGORY'];

// GET ?type=ORDER&q=KOP-26&from=2026-11-01&to=2026-11-30&page=1&limit=25
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
    const type = searchParams.get('type');
    const q = searchParams.get('q')?.trim();
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    const where: Prisma.AuditLogWhereInput = {
      ...(type && ENTITY_TYPES.includes(type) ? { entityType: type } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00+08:00`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59+08:00`) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: 'insensitive' } },
              { entityLabel: { contains: q, mode: 'insensitive' } },
              { actorName: { contains: q, mode: 'insensitive' } },
              { actorEmail: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('Error audit log:', error);
    return NextResponse.json({ error: 'Gagal memuat log aktivitas' }, { status: 500 });
  }
}
