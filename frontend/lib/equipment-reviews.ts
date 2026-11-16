import { prisma } from '@/lib/prisma';

export interface EquipmentReviewItem {
  id: string;
  equipmentId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  komentar: string;
  createdAt: string;
}

export interface EquipmentReviewStats {
  totalReviews: number;
  avgRating: string;
  satisfiedPercentage: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/** Ulasan sebuah alat dari database, terbaru lebih dulu */
export async function getEquipmentReviews(equipmentId: string): Promise<EquipmentReviewItem[]> {
  const rows = await prisma.equipmentReview.findMany({
    where: { equipmentId },
    include: { user: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    equipmentId: r.equipmentId,
    userId: r.userId,
    userName: r.user.name,
    userAvatar: r.user.avatarUrl,
    rating: r.rating,
    komentar: r.komentar || '',
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Apakah pengguna pernah menyelesaikan sewa alat ini (syarat menulis ulasan) */
export async function hasCompletedRental(userId: string, equipmentId: string): Promise<boolean> {
  const count = await prisma.equipmentRental.count({
    where: { userId, status: 'SELESAI', items: { some: { equipmentId } } },
  });
  return count > 0;
}

export function calculateEquipmentStats(reviews: EquipmentReviewItem[]): EquipmentReviewStats {
  const breakdown: { 5: number; 4: number; 3: number; 2: number; 1: number } = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      avgRating: '5.0',
      satisfiedPercentage: 100,
      breakdown,
    };
  }

  let totalRating = 0;
  let satisfiedCount = 0;

  reviews.forEach((r) => {
    const rating = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    totalRating += rating;
    if (rating >= 4) {
      satisfiedCount++;
    }
    breakdown[rating as 1 | 2 | 3 | 4 | 5]++;
  });

  return {
    totalReviews: reviews.length,
    avgRating: (totalRating / reviews.length).toFixed(1),
    satisfiedPercentage: Math.round((satisfiedCount / reviews.length) * 100),
    breakdown,
  };
}
