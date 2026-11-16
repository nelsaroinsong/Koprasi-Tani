import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEquipmentById, type EquipmentItem } from '@/lib/equipments';
import { expireOverdueRentals, getActiveRentedUnitsMap } from '@/lib/equipment-rentals';
import {
  getEquipmentReviews,
  hasCompletedRental,
  calculateEquipmentStats,
} from '@/lib/equipment-reviews';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID alat diperlukan' }, { status: 400 });
    }

    const equipment = await getEquipmentById(id);
    if (!equipment) {
      return NextResponse.json({ error: 'Unit alat pertanian tidak ditemukan' }, { status: 404 });
    }

    // Sisa stok HARI INI (sewa di tanggal lain tidak mengurangi)
    await expireOverdueRentals();
    const rentedMap = await getActiveRentedUnitsMap();
    const rented = rentedMap[equipment.id] || 0;
    const totalStok = Number(equipment.stokUnit) || 0;
    const stokTersedia = Math.max(0, totalStok - rented);

    const enrichedEquipment: EquipmentItem = {
      ...equipment,
      stokUnit: totalStok,
      stokTersedia,
      unitDisewa: rented,
      isTersedia: Boolean(equipment.isTersedia) && stokTersedia > 0,
    };

    const reviews = await getEquipmentReviews(equipment.id);
    const stats = calculateEquipmentStats(reviews);

    // Apakah pengguna login pernah menyelesaikan sewa alat ini (boleh menulis ulasan)
    let hasRented = false;
    let isAuthenticated = false;
    try {
      const session = await auth();
      if (session?.user?.email) {
        isAuthenticated = true;
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email.trim().toLowerCase() },
          select: { id: true },
        });
        if (dbUser) hasRented = await hasCompletedRental(dbUser.id, equipment.id);
      }
    } catch (authErr) {
      console.warn('Error checking equipment rental auth state:', authErr);
    }

    return NextResponse.json({
      success: true,
      equipment: enrichedEquipment,
      reviews,
      stats,
      userState: { isAuthenticated, hasRented },
    });
  } catch (error: any) {
    console.error('Error fetching equipment detail:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat detail alat' },
      { status: 500 }
    );
  }
}
