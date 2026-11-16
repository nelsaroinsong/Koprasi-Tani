import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/redis';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Tidak terotentikasi' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses khusus administrator' }, { status: 403 });
    }

    const cacheKey = 'admin:dashboard:summary_stats:v1';
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [totalProducts, totalEquipments, totalOrders, soldOrderItems] = await Promise.all([
      prisma.product.count(),
      prisma.equipment.count(),
      prisma.order.count(),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { not: 'DIBATALKAN' },
          },
        },
        select: {
          subtotal: true,
        },
      }),
    ]);

    let totalCategories = 0;
    try {
      const [productCats, equipmentCats] = await Promise.all([
        prisma.category.count(),
        prisma.equipmentCategory.count(),
      ]);
      totalCategories = productCats + equipmentCats;
    } catch {
      totalCategories = 0;
    }

    const totalHasilPetani = soldOrderItems.reduce((acc, it) => acc + Number(it.subtotal), 0);

    const result = {
      success: true,
      stats: {
        totalProducts,
        totalEquipments,
        totalOrders,
        totalCategories,
        totalHasilPetani,
      },
    };

    await setCache(cacheKey, result, 30);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Gagal mengambil ringkasan dashboard' }, { status: 500 });
  }
}
