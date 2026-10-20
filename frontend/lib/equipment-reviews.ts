import fs from 'fs';
import path from 'path';

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

const REVIEWS_FILE = path.join(process.cwd(), 'data', 'equipment-reviews.json');

const INITIAL_REVIEWS: EquipmentReviewItem[] = [
  {
    id: 'rev-eq-1',
    equipmentId: '9a9096e8-1384-4eb3-872c-115b3064d32e',
    userId: '8d11ac72-d1a6-4103-9260-9f81203ffe82',
    userName: 'nelsaroinsong',
    userAvatar: '/api/images/profiles/nelsaroinsong_gmail_com-1791906682472.png',
    rating: 5,
    komentar:
      'Unit Traktor Roda 4 sangat prima dan bertenaga. Sangat membantu pengolahan lahan lebih cepat selesai dan bahan bakar efisien.',
    createdAt: '2026-10-15T12:00:00.000Z',
  },
];

export function readEquipmentReviewsFromFile(): EquipmentReviewItem[] {
  try {
    if (!fs.existsSync(REVIEWS_FILE)) {
      fs.writeFileSync(REVIEWS_FILE, JSON.stringify(INITIAL_REVIEWS, null, 2), 'utf-8');
      return INITIAL_REVIEWS;
    }
    const data = fs.readFileSync(REVIEWS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading equipment reviews file:', err);
    return INITIAL_REVIEWS;
  }
}

export function saveEquipmentReviewToFile(item: EquipmentReviewItem) {
  try {
    const reviews = readEquipmentReviewsFromFile();
    reviews.unshift(item);
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving equipment review to file:', err);
  }
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
    if (rating in breakdown) {
      breakdown[rating as 1 | 2 | 3 | 4 | 5]++;
    }
  });

  const avg = (totalRating / reviews.length).toFixed(1);
  const satisfiedPct = Math.round((satisfiedCount / reviews.length) * 100);

  return {
    totalReviews: reviews.length,
    avgRating: avg,
    satisfiedPercentage: satisfiedPct,
    breakdown,
  };
}

export function deleteEquipmentReviewFromFile(reviewId: string): boolean {
  try {
    const reviews = readEquipmentReviewsFromFile();
    const updated = reviews.filter((r) => r.id !== reviewId);
    if (updated.length !== reviews.length) {
      fs.writeFileSync(REVIEWS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error deleting equipment review from file:', err);
    return false;
  }
}
