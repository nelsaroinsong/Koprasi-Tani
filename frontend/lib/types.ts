export interface Product {
  id: string;
  name: string;
  category: 'Kelapa' | 'Jagung' | 'Turunan' | 'Olahan';
  categoryLabel: string;
  badge: string;
  sellerTag: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  stockUnit: string;
  imageBg: string;
  imageAccent: string;
  illustrationType: 'kelapa' | 'jagung' | 'kopra' | 'vco';
}

export interface AlsintanItem {
  id: string;
  name: string;
  category: string;
  statusBadge: string;
  statusColor: 'emerald' | 'amber' | 'blue';
  location: string;
  operatorNote: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  bookingNote?: string;
  imageBg: string;
  illustrationType: 'traktor' | 'pemipil' | 'drone';
}

export interface CartItem {
  product: Product;
  quantity: number;
}
