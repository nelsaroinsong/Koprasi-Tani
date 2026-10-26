import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache, delCachePattern } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const CATEGORIES_FILE = path.join(process.cwd(), 'data', 'equipment-categories.json');
const CACHE_KEY = 'equipment:categories:list';

export interface EquipmentCategoryItem {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  imageUrl?: string;
  description?: string;
  isActive?: boolean;
  equipmentCount?: number;
}

const DEFAULT_EQUIPMENT_CATEGORIES: EquipmentCategoryItem[] = [
  {
    id: 'eqcat-1791025522347-uzb5',
    name: 'Roda 4',
    slug: 'Roda-4',
    emoji: '🚜',
    imageUrl: '/api/images/categories/alat.jpg',
    description: 'Traktor roda empat dan pengolah lahan berkapasitas besar',
    isActive: true,
  },
  {
    id: 'eqcat-traktor',
    name: 'Traktor',
    slug: 'Traktor',
    emoji: '🚜',
    imageUrl: '/api/images/categories/alat.jpg',
    description: 'Traktor roda dua dan kultivator pengolah tanah',
    isActive: true,
  },
  {
    id: 'eqcat-kultivator',
    name: 'Kultivator',
    slug: 'Kultivator',
    emoji: '🌱',
    imageUrl: '/api/images/categories/alat.jpg',
    description: 'Mesin penggembur tanah dan penyiang gulma bedengan',
    isActive: true,
  },
  {
    id: 'eqcat-drone',
    name: 'Drone Pertanian',
    slug: 'Drone-Pertanian',
    emoji: '🛸',
    imageUrl: '/api/images/categories/alat.jpg',
    description: 'Drone pemetaan dan penyemprot pupuk presisi',
    isActive: true,
  },
  {
    id: 'eqcat-panen',
    name: 'Mesin Panen',
    slug: 'Mesin-Panen',
    emoji: '🌾',
    imageUrl: '/api/images/categories/alat.jpg',
    description: 'Combine harvester, mesin perontok padi dan pemipil jagung',
    isActive: true,
  },
];

function readEquipmentCategories(): EquipmentCategoryItem[] {
  try {
    if (!fs.existsSync(CATEGORIES_FILE)) {
      writeEquipmentCategories(DEFAULT_EQUIPMENT_CATEGORIES);
      return DEFAULT_EQUIPMENT_CATEGORIES;
    }
    const data = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      writeEquipmentCategories(DEFAULT_EQUIPMENT_CATEGORIES);
      return DEFAULT_EQUIPMENT_CATEGORIES;
    }
    return parsed.map((cat: any) => ({
      id: cat.id || `eqcat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cat.name,
      slug: cat.slug || cat.name?.toLowerCase().trim().replace(/\s+/g, '-'),
      emoji: cat.emoji || '⚙️',
      imageUrl: cat.imageUrl || '',
      description: cat.description || '',
      isActive: cat.isActive !== false,
    }));
  } catch (error) {
    console.error('Error reading equipment categories:', error);
    return DEFAULT_EQUIPMENT_CATEGORIES;
  }
}

function writeEquipmentCategories(categories: EquipmentCategoryItem[]): boolean {
  try {
    const dir = path.dirname(CATEGORIES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing equipment categories:', error);
    return false;
  }
}

async function checkIsAdmin(session: any): Promise<boolean> {
  if (session?.user?.role === 'ADMIN') return true;
  if (!session?.user?.email) return false;
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  } catch {
    return false;
  }
}

// GET: Ambil daftar kategori alat pertanian (Cached in Redis)
export async function GET() {
  try {
    const cached = await getCache<any>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const categories = readEquipmentCategories();
    const payload = { success: true, categories };
    await setCache(CACHE_KEY, payload, 300);

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat kategori alat' }, { status: 500 });
  }
}

// POST: Tambah kategori alat baru
export async function POST(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const slug = String(body.slug || name.toLowerCase().replace(/\s+/g, '-')).trim();
    const emoji = String(body.emoji || '⚙️').trim();
    const imageUrl = String(body.imageUrl || '').trim();
    const description = String(body.description || '').trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
    }

    const categories = readEquipmentCategories();
    const isDuplicate = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      return NextResponse.json({ error: 'Kategori dengan nama tersebut sudah ada' }, { status: 400 });
    }

    const newCategory: EquipmentCategoryItem = {
      id: `eqcat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      slug,
      emoji: emoji || '⚙️',
      imageUrl,
      description,
      isActive,
    };

    categories.push(newCategory);
    writeEquipmentCategories(categories);

    await delCache(CACHE_KEY).catch(() => {});
    await delCache('equipments:list:public').catch(() => {});
    await delCachePattern('equipment*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Kategori alat pertanian berhasil ditambahkan',
      category: newCategory,
      categories,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menambah kategori alat' }, { status: 500 });
  }
}

// PUT: Perbarui kategori alat secara menyeluruh
export async function PUT(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body.id || '').trim();
    const name = String(body.name || '').trim();
    const slug = String(body.slug || name.toLowerCase().replace(/\s+/g, '-')).trim();
    const emoji = String(body.emoji || '⚙️').trim();
    const imageUrl = String(body.imageUrl || '').trim();
    const description = String(body.description || '').trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID dan nama kategori wajib diisi' }, { status: 400 });
    }

    const categories = readEquipmentCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    const isDuplicate = categories.some(
      (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      return NextResponse.json({ error: 'Nama kategori tersebut sudah digunakan' }, { status: 400 });
    }

    categories[index] = {
      ...categories[index],
      name,
      slug,
      emoji: emoji || categories[index].emoji || '⚙️',
      imageUrl: imageUrl !== undefined ? imageUrl : categories[index].imageUrl,
      description,
      isActive,
    };

    writeEquipmentCategories(categories);

    await delCache(CACHE_KEY).catch(() => {});
    await delCache('equipments:list:public').catch(() => {});
    await delCachePattern('equipment*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Kategori alat pertanian berhasil diperbarui',
      category: categories[index],
      categories,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui kategori alat' }, { status: 500 });
  }
}

// PATCH: Toggle status aktif/nonaktif atau edit parsial
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'ID kategori wajib disertakan' }, { status: 400 });
    }

    const categories = readEquipmentCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    // Update field yang disediakan
    if (body.isActive !== undefined) {
      categories[index].isActive = Boolean(body.isActive);
    }
    if (body.name !== undefined) {
      categories[index].name = String(body.name).trim();
    }
    if (body.slug !== undefined) {
      categories[index].slug = String(body.slug).trim();
    }
    if (body.imageUrl !== undefined) {
      categories[index].imageUrl = String(body.imageUrl).trim();
    }
    if (body.description !== undefined) {
      categories[index].description = String(body.description).trim();
    }

    writeEquipmentCategories(categories);

    await delCache(CACHE_KEY).catch(() => {});
    await delCache('equipments:list:public').catch(() => {});
    await delCachePattern('equipment*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Status kategori alat berhasil diperbarui',
      category: categories[index],
      categories,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengubah status kategori' }, { status: 500 });
  }
}

// DELETE: Hapus kategori alat (Tunggal atau Massal)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (!id && !idsParam) {
      return NextResponse.json({ error: 'ID atau IDs kategori wajib disertakan' }, { status: 400 });
    }

    const categories = readEquipmentCategories();
    let filtered = categories;

    if (idsParam) {
      const idsToDelete = new Set(idsParam.split(',').map((s) => s.trim()).filter(Boolean));
      filtered = categories.filter((c) => !idsToDelete.has(c.id));
    } else if (id) {
      filtered = categories.filter((c) => c.id !== id);
    }

    if (filtered.length === categories.length) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    writeEquipmentCategories(filtered);

    await delCache(CACHE_KEY).catch(() => {});
    await delCache('equipments:list:public').catch(() => {});
    await delCachePattern('equipment*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Kategori alat pertanian berhasil dihapus',
      categories: filtered,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus kategori alat' }, { status: 500 });
  }
}
