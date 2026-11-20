'use client';

export interface CartItem {
  id: string;
  nama: string;
  kategori?: string;
  hargaPerSatuan: number;
  satuan: string;
  imageUrl?: string;
  quantity: number;
  petaniName?: string;
  /** Stok gudang saat item terakhir ditambahkan (batas tombol +) */
  stok?: number;
}

/**
 * Menghasilkan storage key unik keranjang berdasarkan akun pengguna.
 * Setiap akun (email atau ID) memiliki keranjang belanja terisolasi sendiri.
 */
export function getCartKey(userOrIdentifier?: any): string {
  if (typeof window === 'undefined') {
    return 'koperasi_cart_guest';
  }

  // Bersihkan key lama yang tidak terikat akun (legacy un-scoped cart) jika ada
  try {
    if (localStorage.getItem('koperasi_cart')) {
      localStorage.removeItem('koperasi_cart');
    }
  } catch {}

  let identifier: string | null = null;

  if (typeof userOrIdentifier === 'string' && userOrIdentifier.trim()) {
    identifier = userOrIdentifier.trim();
  } else if (userOrIdentifier && typeof userOrIdentifier === 'object') {
    identifier = userOrIdentifier.email || userOrIdentifier.id || null;
  }

  // Jika tidak disediakan, coba ambil dari session user yang tersimpan di localStorage
  if (!identifier) {
    try {
      const savedUser = localStorage.getItem('koperasi_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        identifier = parsed.email || parsed.id || null;
      }
    } catch {}
  }

  if (identifier) {
    const sanitized = identifier.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
    return `koperasi_cart_${sanitized}`;
  }

  return 'koperasi_cart_guest';
}

/**
 * Mengambil daftar item keranjang belanja untuk akun aktif
 */
export function getCart(userOrIdentifier?: any): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getCartKey(userOrIdentifier);
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Gagal membaca data keranjang:', err);
    return [];
  }
}

/**
 * Menyimpan daftar item ke keranjang akun aktif dan memicu event sinkronisasi
 */
export function saveCart(items: CartItem[], userOrIdentifier?: any): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getCartKey(userOrIdentifier);
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart-updated'));
  } catch (err) {
    console.error('Gagal menyimpan data keranjang:', err);
  }
}

/**
 * Mengosongkan keranjang untuk akun aktif
 */
export function clearCart(userOrIdentifier?: any): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getCartKey(userOrIdentifier);
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('cart-updated'));
  } catch (err) {
    console.error('Gagal mengosongkan keranjang:', err);
  }
}

/**
 * Menghitung total jumlah kuantitas item dalam keranjang akun aktif
 */
export function getCartTotalCount(userOrIdentifier?: any): number {
  const items = getCart(userOrIdentifier);
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

/**
 * Hitung berapa yang masih boleh ditambahkan ke keranjang tanpa melebihi stok gudang.
 * @returns { addable, inCart } — addable 0 berarti seluruh stok sudah ada di keranjang.
 */
export function cappedAddQuantity(cart: CartItem[], productId: string, requested: number, stock: number) {
  const inCart = cart.find((i) => i.id === productId)?.quantity || 0;
  const addable = Math.max(0, Math.min(requested, Math.max(0, Number(stock) || 0) - inCart));
  return { addable, inCart };
}
