import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const CATEGORIES_FILE = path.join(process.cwd(), 'data', 'equipment-categories.json');
const CACHE_KEY = 'equipment:categories:list';

export interface EquipmentCategoryItem {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
}

function readEquipmentCategories(): EquipmentCategoryItem[] {
  try {
    if (!fs.existsSync(CATEGORIES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch (error) {
    console.error('Error reading equipment categories:', error);
    return [];
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
    const emoji = String(body.emoji || '⚙️').trim();
    const description = String(body.description || '').trim();

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
      emoji: emoji || '⚙️',
      description,
    };

    categories.push(newCategory);
    writeEquipmentCategories(categories);
    await delCache(CACHE_KEY).catch(() => {});

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

// PUT: Perbarui kategori alat
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
    const emoji = String(body.emoji || '⚙️').trim();
    const description = String(body.description || '').trim();

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
      emoji: emoji || categories[index].emoji || '⚙️',
      description,
    };

    writeEquipmentCategories(categories);
    await delCache(CACHE_KEY).catch(() => {});

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

// DELETE: Hapus kategori alat
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID kategori wajib disertakan' }, { status: 400 });
    }

    const categories = readEquipmentCategories();
    const filtered = categories.filter((c) => c.id !== id);

    if (filtered.length === categories.length) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    writeEquipmentCategories(filtered);
    await delCache(CACHE_KEY).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Kategori alat pertanian berhasil dihapus',
      categories: filtered,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus kategori alat' }, { status: 500 });
  }
}
