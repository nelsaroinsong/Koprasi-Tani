/** Halaman login khusus administrator */
export const ADMIN_LOGIN_PATH = '/admin-koperasi-sinar-pagi-sejahtera';

/** Apakah halaman saat ini bagian dari panel admin */
export function isAdminPath(pathname?: string | null) {
  return Boolean(pathname && (pathname === '/admin' || pathname.startsWith('/admin/')));
}

/** Tujuan setelah logout: admin kembali ke login admin, selain itu ke login pengguna */
export function loginPathAfterLogout(opts: { role?: string | null; pathname?: string | null; reason?: string }) {
  const base = opts.role === 'ADMIN' || isAdminPath(opts.pathname) ? ADMIN_LOGIN_PATH : '/login';
  return opts.reason ? `${base}?reason=${encodeURIComponent(opts.reason)}` : base;
}
