import { prisma } from '@/lib/prisma';

/** Bentuk kategori yang dipakai API & UI (sama dengan format file JSON lama) */
export interface StoredCategory {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  imageUrl?: string;
  description?: string;
  mobileBg?: string;
  isActive?: boolean;
}

type Kind = 'product' | 'equipment';

function toStored(row: any, kind: Kind): StoredCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    emoji: row.emoji || '',
    imageUrl: row.imageUrl || undefined,
    description: row.description || '',
    ...(kind === 'product' ? { mobileBg: row.mobileBg || undefined } : {}),
    isActive: row.isActive,
  };
}

function toRow(c: StoredCategory, kind: Kind, sortOrder: number) {
  return {
    name: String(c.name).trim(),
    slug: String(c.slug || c.name).trim(),
    emoji: c.emoji ? String(c.emoji) : null,
    imageUrl: c.imageUrl ? String(c.imageUrl) : null,
    description: c.description ? String(c.description) : null,
    ...(kind === 'product' ? { mobileBg: c.mobileBg ? String(c.mobileBg) : null } : {}),
    isActive: c.isActive !== false,
    sortOrder,
  };
}

function delegate(kind: Kind): any {
  return kind === 'product' ? prisma.category : prisma.equipmentCategory;
}

/** Semua kategori sesuai urutan admin */
export async function listCategories(kind: Kind): Promise<StoredCategory[]> {
  const rows = await delegate(kind).findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return rows.map((r: any) => toStored(r, kind));
}

/**
 * Simpan daftar kategori utuh (urutan = urutan array).
 * Kategori yang tidak ada di daftar dihapus. Semua dalam satu transaksi.
 */
export async function saveCategories(kind: Kind, list: StoredCategory[]): Promise<void> {
  const ids = list.map((c) => c.id);
  await prisma.$transaction(async (tx) => {
    const d: any = kind === 'product' ? tx.category : tx.equipmentCategory;
    await d.deleteMany({ where: { id: { notIn: ids } } });
    for (let i = 0; i < list.length; i++) {
      const data = toRow(list[i], kind, i);
      await d.upsert({ where: { id: list[i].id }, create: { id: list[i].id, ...data }, update: data });
    }
  });
}
