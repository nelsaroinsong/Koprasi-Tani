export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'transaksi';
  time: string;
  href?: string;
  isRead: boolean;
  createdAt?: string;
}

export const INITIAL_SYSTEM_NOTIFICATION: AppNotification = {
  id: 'notif-system-welcome',
  title: 'Selamat Datang di Koperasi Tani',
  message: 'Akun Anda aktif di Koperasi Sinar Pagi Sejahtera. Mulai jelajahi komoditas hasil panen dan sewa alsintan modern.',
  type: 'system',
  time: 'Baru saja',
  href: '/profile',
  isRead: false,
};

const getStorageKey = (userId?: string | null) => {
  return userId ? `koperasi_notif_v3_${userId}` : 'koperasi_notif_v3_guest';
};

const getReadMapKey = (userId?: string | null) => {
  return userId ? `koperasi_notif_read_v3_${userId}` : 'koperasi_notif_read_v3_guest';
};

export function getStoredReadIds(userId?: string | null): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getReadMapKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveReadIds(readMap: Record<string, boolean>, userId?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getReadMapKey(userId), JSON.stringify(readMap));
  } catch {}
}

let memoryCachedNotifications: AppNotification[] = [];

export function getCachedNotifications(userId?: string | null): AppNotification[] {
  if (memoryCachedNotifications.length > 0) {
    return memoryCachedNotifications;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getStorageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const readMap = getStoredReadIds(userId);
          const synced = parsed.map((item: AppNotification) => ({
            ...item,
            isRead: Boolean(readMap[item.id] || item.isRead),
          }));
          memoryCachedNotifications = synced;
          return synced;
        }
      }
    } catch {}
  }
  return [];
}

export function setCachedNotifications(items: AppNotification[], userId?: string | null) {
  memoryCachedNotifications = items;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
    } catch {}
  }
}

export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Baru saja';
  try {
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'Baru saja';
  }
}

export function formatOrderStatus(status?: string): string {
  switch (status) {
    case 'MENUNGGU_PEMBAYARAN':
      return 'Menunggu Pembayaran';
    case 'MENUNGGU_VERIFIKASI':
      return 'Menunggu Verifikasi Admin';
    case 'DIPROSES':
      return 'Pesanan Sedang Diproses';
    case 'SIAP_DIAMBIL':
      return 'Siap Diambil di Koperasi';
    case 'DALAM_PENGIRIMAN':
      return 'Dalam Pengiriman';
    case 'SELESAI':
      return 'Selesai';
    case 'DIBATALKAN':
      return 'Dibatalkan';
    default:
      return status || 'Diproses';
  }
}

export function formatRentalStatus(status?: string): string {
  switch (status) {
    case 'MENUNGGU_VERIFIKASI':
    case 'PENDING':
      return 'Menunggu Konfirmasi';
    case 'DISETUJUI':
    case 'ACTIVE':
      return 'Disetujui / Aktif';
    case 'SELESAI':
      return 'Sewa Selesai';
    case 'DITOLAK':
      return 'Ditolak';
    default:
      return status || 'Diproses';
  }
}

export function buildNotificationsFromTransactions(
  orders: any[] = [],
  rentals: any[] = [],
  userId?: string | null
): AppNotification[] {
  const readMap = getStoredReadIds(userId);
  const items: AppNotification[] = [];

  // 1. Transaction Notifications: Orders
  orders.forEach((order) => {
    const id = `order-${order.id}`;
    const orderNum = order.orderNumber || (order.id ? order.id.slice(0, 8) : 'TRX');
    const total = order.totalAmount ? `Rp ${Number(order.totalAmount).toLocaleString('id-ID')}` : '';
    const statusText = formatOrderStatus(order.status);

    items.push({
      id,
      title: `Transaksi Pesanan #${orderNum}`,
      message: `Pesanan komoditas ${total ? `total ${total}` : ''} • Status: ${statusText}.`,
      type: 'transaksi',
      time: formatTimeAgo(order.createdAt),
      href: `/pesanan/${order.id}`,
      isRead: Boolean(readMap[id]),
      createdAt: order.createdAt,
    });
  });

  // 2. Transaction Notifications: Rentals
  rentals.forEach((rental) => {
    const id = `rental-${rental.id}`;
    const code = rental.rentalCode || rental.rentalNumber || (rental.id ? rental.id.slice(0, 8) : 'RENT');
    const toolName = rental.equipment?.nama || rental.namaAlat || 'Unit Alsintan';
    const statusText = formatRentalStatus(rental.status);

    items.push({
      id,
      title: `Transaksi Sewa Alat #${code}`,
      message: `Pengajuan sewa "${toolName}" • Status: ${statusText}.`,
      type: 'transaksi',
      time: formatTimeAgo(rental.createdAt),
      href: `/pesanan/${rental.id}`,
      isRead: Boolean(readMap[id]),
      createdAt: rental.createdAt,
    });
  });

  // Sort transactions from newest to oldest
  items.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // 3. Welcome System Notification (Always present at the start of account)
  const systemNotif: AppNotification = {
    ...INITIAL_SYSTEM_NOTIFICATION,
    isRead: Boolean(readMap[INITIAL_SYSTEM_NOTIFICATION.id]),
  };

  return [...items, systemNotif];
}

export function addTransactionNotification(notif: Omit<AppNotification, 'id' | 'type'> & { id?: string }, userId?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const customEvent = new CustomEvent('koperasi-new-transaction', {
      detail: {
        ...notif,
        id: notif.id || `trx-${Date.now()}`,
        type: 'transaksi',
      },
    });
    window.dispatchEvent(customEvent);
  } catch {}
}
