import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache, delCachePattern } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const CATEGORIES_FILE = path.join(process.cwd(), 'data', 'categories.json');
const CATEGORIES_CACHE_KEY = 'categories:list:with_count';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  imageUrl?: string;
  description?: string;
  mobileBg?: string;
  isActive?: boolean;
  productCount?: number;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-kelapa',
    name: 'Kelapa',
    slug: 'Kelapa',
    emoji: '🥥',
    imageUrl: '/api/images/categories/kelapa.jpg',
    description: 'Komoditas kelapa butir, kelapa muda, dan kopra',
    mobileBg: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border border-amber-300/60',
    isActive: true,
  },
  {
    id: 'cat-jagung',
    name: 'Jagung',
    slug: 'Jagung',
    emoji: '🌽',
    imageUrl: '/api/images/categories/jagung.jpg',
    description: 'Jagung pipil kering, jagung pakan, dan bibit unggul',
    mobileBg: 'bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-900 border border-yellow-300/60',
    isActive: true,
  },
  {
    id: 'cat-turunan',
    name: 'Turunan',
    slug: 'Turunan',
    emoji: '📦',
    imageUrl: '/api/images/categories/turunan.jpg',
    description: 'Produk turunan primer seperti sabut, arang tempurung, dan ampas',
    mobileBg: 'bg-gradient-to-br from-sky-100 to-blue-200 text-blue-900 border border-sky-300/60',
    isActive: true,
  },
  {
    id: 'cat-olahan',
    name: 'Olahan',
    slug: 'Olahan',
    emoji: '🥫',
    imageUrl: '/api/images/categories/olahan.jpg',
    description: 'Hasil olahan komoditas seperti VCO, minyak kelapa, dan tepung',
    mobileBg: 'bg-gradient-to-br from-purple-100 to-fuchsia-200 text-purple-900 border border-purple-300/60',
    isActive: true,
  },
];

function readCategoriesFromFile(): CategoryItem[] {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      const content = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading categories file:', err);
  }
  return DEFAULT_CATEGORIES;
}

function writeCategoriesToFile(categories: CategoryItem[]) {
  try {
    const dir = path.dirname(CATEGORIES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing categories file:', err);
  }
}

// 1. GET: Ambil semua kategori komoditas beserta jumlah produk aktif (Di-cache di Redis)
export async function GET() {
  try {
    // Cek cache Redis terlebih dahulu untuk response super cepat (<2ms)
    const cached = await getCache<any>(CATEGORIES_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const categories = readCategoriesFromFile();

    // Query jumlah produk per kategori dari database Postgres
    let countMap: Record<string, number> = {};
    try {
      const productCounts = await prisma.product.groupBy({
        by: ['kategori'],
        _count: {
          id: true,
        },
      });
      productCounts.forEach((item) => {
        countMap[item.kategori.toLowerCase()] = item._count.id;
      });
    } catch (dbErr) {
      console.warn('Could not query product counts from db:', dbErr);
    }

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      isActive: cat.isActive !== false,
      productCount: countMap[cat.name.toLowerCase()] || countMap[cat.slug.toLowerCase()] || 0,
    }));

    const responsePayload = {
      success: true,
      total: categoriesWithCount.length,
      categories: categoriesWithCount,
    };

    // Cache di Redis selama 10 menit (600 detik)
    await setCache(CATEGORIES_CACHE_KEY, responsePayload, 600);

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({
      success: true,
      total: DEFAULT_CATEGORIES.length,
      categories: DEFAULT_CATEGORIES,
    });
  }
}

// 2. POST: Tambah kategori komoditas baru (Admin Only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();
    const name = body.name?.trim();
    const emoji = body.emoji?.trim() || '🌾';
    const imageUrl = body.imageUrl?.trim() || '';
    const description = body.description?.trim() || '';
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const mobileBg =
      body.mobileBg?.trim() ||
      'bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-900 border border-emerald-300/60';

    if (!name) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi.' }, { status: 400 });
    }

    const currentCategories = readCategoriesFromFile();
    const exists = currentCategories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase() || c.slug.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      return NextResponse.json(
        { error: `Kategori "${name}" sudah ada dalam daftar.` },
        { status: 400 }
      );
    }

    const newCategory: CategoryItem = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      slug: name,
      emoji,
      imageUrl: imageUrl || undefined,
      description,
      mobileBg,
      isActive,
    };

    const updated = [...currentCategories, newCategory];
    writeCategoriesToFile(updated);
    await delCachePattern('categories:*').catch(() => {});
    await delCachePattern('products:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Kategori "${name}" berhasil ditambahkan.`,
      category: newCategory,
      categories: updated,
    });
  } catch (error: any) {
    console.error('Error adding category:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan kategori' }, { status: 500 });
  }
}

// 3. PATCH: Update / Edit kategori atau Reorder urutan kategori (Admin Only)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const body = await request.json();

    // Skenario A: Reorder daftar kategori utuh
    if (Array.isArray(body.categories)) {
      writeCategoriesToFile(body.categories);
      await delCachePattern('categories:*').catch(() => {});
    await delCachePattern('products:*').catch(() => {});
      return NextResponse.json({
        success: true,
        message: 'Urutan kategori berhasil diperbarui.',
        categories: body.categories,
      });
    }

    // Skenario B: Update per item kategori
    const { id, name, emoji, imageUrl, description, mobileBg, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID kategori wajib disertakan.' }, { status: 400 });
    }

    const currentCategories = readCategoriesFromFile();
    const index = currentCategories.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    const oldCategory = currentCategories[index];
    const newName = name?.trim();

    if (newName && newName.toLowerCase() !== oldCategory.name.toLowerCase()) {
      // Periksa apakah nama baru bentrok dengan kategori lain
      const duplicate = currentCategories.some(
        (c) => c.id !== id && c.name.toLowerCase() === newName.toLowerCase()
      );
      if (duplicate) {
        return NextResponse.json(
          { error: `Kategori dengan nama "${newName}" sudah ada.` },
          { status: 400 }
        );
      }

      // Update seluruh produk yang menggunakan kategori lama di database
      try {
        await prisma.product.updateMany({
          where: { kategori: oldCategory.name },
          data: { kategori: newName },
        });
      } catch (dbErr) {
        console.warn('Gagal update nama kategori di produk database:', dbErr);
      }

      currentCategories[index].name = newName;
      currentCategories[index].slug = newName;
    }

    if (emoji) currentCategories[index].emoji = emoji.trim();
    if (imageUrl !== undefined) currentCategories[index].imageUrl = imageUrl.trim() || undefined;
    if (description !== undefined) currentCategories[index].description = description.trim();
    if (mobileBg) currentCategories[index].mobileBg = mobileBg.trim();
    if (isActive !== undefined) currentCategories[index].isActive = Boolean(isActive);

    writeCategoriesToFile(currentCategories);
    await delCachePattern('categories:*').catch(() => {});
    await delCachePattern('products:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil diperbarui.',
      category: currentCategories[index],
      categories: currentCategories,
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui kategori' }, { status: 500 });
  }
}

// 4. DELETE: Hapus kategori komoditas tunggal atau massal (Admin Only)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsQuery = searchParams.get('ids');
    const force = searchParams.get('force') === 'true';

    let idsToDelete: string[] = [];
    if (idsQuery) {
      idsToDelete = idsQuery.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (id) {
      idsToDelete = [id];
    } else {
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids;
        } else if (body?.id) {
          idsToDelete = [body.id];
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'ID kategori wajib disertakan.' }, { status: 400 });
    }

    const currentCategories = readCategoriesFromFile();

    if (currentCategories.length <= idsToDelete.length) {
      return NextResponse.json(
        { error: 'Setidaknya harus tersisa minimal 1 kategori komoditas aktif.' },
        { status: 400 }
      );
    }

    // Cek produk yang terikat jika force bukan true
    if (!force) {
      const targetNames = currentCategories
        .filter((c) => idsToDelete.includes(c.id))
        .map((c) => c.name);

      const productCount = await prisma.product.count({
        where: {
          kategori: { in: targetNames, mode: 'insensitive' },
        },
      });

      if (productCount > 0) {
        return NextResponse.json(
          {
            error: `Beberapa kategori yang dipilih masih digunakan oleh ${productCount} produk komoditas.`,
            hasProducts: true,
            productCount,
          },
          { status: 400 }
        );
      }
    }

    const updated = currentCategories.filter((c) => !idsToDelete.includes(c.id));
    writeCategoriesToFile(updated);
    await delCachePattern('categories:*').catch(() => {});
    await delCachePattern('products:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length} kategori berhasil dihapus.`,
      categories: updated,
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus kategori' }, { status: 500 });
  }
}

