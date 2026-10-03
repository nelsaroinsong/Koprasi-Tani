'use client';

export interface RentalCartItem {
  id: string; // ID unik di keranjang atau ID equipment
  equipmentId: string;
  nama: string;
  kategori: string;
  hargaSewa: number;
  satuanSewa: string;
  biayaOperator: number | null;
  includeOperator: boolean;
  stokUnit: number;
  jumlahUnit: number;
  durasi: number;
  imageUrl?: string | null;
  kontakPj?: string | null;
}

const RENTAL_CART_KEY = 'koperasi_rental_cart';

export function getRentalCart(): RentalCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RENTAL_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading rental cart:', e);
    return [];
  }
}

export function saveRentalCart(items: RentalCartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RENTAL_CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('rental-cart-updated'));
  } catch (e) {
    console.error('Error saving rental cart:', e);
  }
}

export function clearRentalCart(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RENTAL_CART_KEY);
    window.dispatchEvent(new CustomEvent('rental-cart-updated'));
  } catch (e) {
    console.error('Error clearing rental cart:', e);
  }
}

export function addToRentalCart(newItem: Omit<RentalCartItem, 'id'>): void {
  const current = getRentalCart();
  const existingIndex = current.findIndex(
    (item) =>
      item.equipmentId === newItem.equipmentId &&
      item.includeOperator === newItem.includeOperator
  );

  if (existingIndex > -1) {
    // Update jumlah unit atau durasi
    const existing = current[existingIndex];
    const newQty = Math.min(
      existing.stokUnit || 99,
      existing.jumlahUnit + (newItem.jumlahUnit || 1)
    );
    current[existingIndex] = {
      ...existing,
      jumlahUnit: newQty,
      durasi: newItem.durasi || existing.durasi,
    };
  } else {
    current.push({
      ...newItem,
      id: `${newItem.equipmentId}-${Date.now()}`,
      jumlahUnit: Math.min(newItem.stokUnit || 99, Math.max(1, newItem.jumlahUnit || 1)),
      durasi: Math.max(1, newItem.durasi || 1),
    });
  }

  saveRentalCart(current);
}

export function updateRentalCartItem(
  id: string,
  updates: Partial<Pick<RentalCartItem, 'jumlahUnit' | 'durasi' | 'includeOperator'>>
): void {
  const current = getRentalCart();
  const idx = current.findIndex((item) => item.id === id);
  if (idx > -1) {
    current[idx] = {
      ...current[idx],
      ...updates,
      jumlahUnit: updates.jumlahUnit !== undefined
        ? Math.min(current[idx].stokUnit || 99, Math.max(1, updates.jumlahUnit))
        : current[idx].jumlahUnit,
      durasi: updates.durasi !== undefined
        ? Math.max(1, updates.durasi)
        : current[idx].durasi,
    };
    saveRentalCart(current);
  }
}

export function removeRentalCartItem(id: string): void {
  const current = getRentalCart();
  const filtered = current.filter((item) => item.id !== id);
  saveRentalCart(filtered);
}

export function calculateRentalItemTotal(item: RentalCartItem): number {
  const durasi = Math.max(1, item.durasi || 1);
  const qty = Math.max(1, item.jumlahUnit || 1);
  const hargaDasar = item.hargaSewa * durasi * qty;
  const operatorTotal =
    item.includeOperator && item.biayaOperator
      ? item.biayaOperator * durasi * qty
      : 0;
  return hargaDasar + operatorTotal;
}

export function calculateRentalCartTotal(items: RentalCartItem[]): number {
  return items.reduce((sum, item) => sum + calculateRentalItemTotal(item), 0);
}
