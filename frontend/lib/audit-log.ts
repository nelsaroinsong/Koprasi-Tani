import { prisma } from '@/lib/prisma';

/**
 * Jejak aksi admin. Best effort: kegagalan mencatat TIDAK boleh menggagalkan aksi utamanya.
 */

export type AuditEntity = 'ORDER' | 'RENTAL' | 'PAYOUT' | 'PRODUCT' | 'EQUIPMENT' | 'USER' | 'SETTINGS' | 'CATEGORY';

export interface AuditActor {
  id?: string | null;
  email?: string | null;
  name?: string | null;
}

export interface AuditInput {
  actor: AuditActor | null | undefined;
  action: string;
  entityType: AuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  details?: Record<string, unknown> | null;
}

/** Ambil identitas admin dari session NextAuth (`await auth()`) */
export function actorFromSession(session: any): AuditActor {
  const u = session?.user || {};
  return { id: u.id || null, email: u.email || null, name: u.name || null };
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor?.id || null,
        actorEmail: input.actor?.email || null,
        actorName: input.actor?.name || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        entityLabel: input.entityLabel || null,
        summary: input.summary.slice(0, 500),
        details: (input.details ?? undefined) as any,
      },
    });
  } catch (error) {
    console.error('[Audit Log] Gagal mencatat:', error);
  }
}

export const rpAudit = (n: unknown) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
