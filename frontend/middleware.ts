import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  MAINTENANCE_BYPASS_COOKIE,
  verifyAdminBypassToken,
} from '@/lib/maintenance-bypass';

// Rute umum terproteksi untuk pengguna umum (anggota/pembeli/petani)
const USER_PROTECTED_ROUTES = ['/toko', '/sewa-alat', '/onboarding', '/verifikasi-petani'];

// Sub-URL khusus portal login admin
const ADMIN_PORTAL_ROUTE = '/admin-koperasi-sinar-pagi-sejahtera';

// Rute yang selalu bebas diakses meski pemeliharaan sedang aktif
const MAINTENANCE_EXEMPT_PREFIXES = [
  '/admin',
  ADMIN_PORTAL_ROUTE,
  '/maintenance',
  '/auth-callback',
  '/api/auth',
  '/api/admin',
  '/api/system/maintenance',
  '/api/images',
  '/api/storage',
  '/api/cron',
  '/api/koperasi/info',
];

interface EdgeMaintenanceSnapshot {
  isMaintenance: boolean;
  retryAfterSeconds: number;
  title?: string;
  message?: string;
  endAt?: string | null;
  fetchedAt: number;
}

const EDGE_CACHE_TTL_MS = 5_000;
let edgeMaintenanceCache: EdgeMaintenanceSnapshot | null = null;

function isMaintenanceExempt(pathname: string): boolean {
  return MAINTENANCE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function readMaintenanceStatus(origin: string): Promise<EdgeMaintenanceSnapshot> {
  const now = Date.now();
  if (edgeMaintenanceCache && now - edgeMaintenanceCache.fetchedAt < EDGE_CACHE_TTL_MS) {
    return edgeMaintenanceCache;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${origin}/api/system/maintenance`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'x-middleware-check': '1' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const snapshot: EdgeMaintenanceSnapshot = {
        isMaintenance: Boolean(data?.isMaintenance),
        retryAfterSeconds: Number(data?.retryAfterSeconds) || 1800,
        title: typeof data?.title === 'string' ? data.title : undefined,
        message: typeof data?.message === 'string' ? data.message : undefined,
        endAt: data?.activeWindow?.endAt ?? null,
        fetchedAt: now,
      };
      edgeMaintenanceCache = snapshot;
      return snapshot;
    }
  } catch {
    // Fail-open bila endpoint internal belum siap
  }

  return (
    edgeMaintenanceCache || {
      isMaintenance: false,
      retryAfterSeconds: 0,
      fetchedAt: now,
    }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek apakah ada cookie session NextAuth / Auth.js
  const hasSessionToken =
    Boolean(request.cookies.get('authjs.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-authjs.session-token')?.value) ||
    Boolean(request.cookies.get('next-auth.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-next-auth.session-token')?.value) ||
    request.cookies.getAll().some((c) => c.name.toLowerCase().includes('session-token'));

  // 0. Penegakan Mode Pemeliharaan Sistem (Blokir publik & API transaksi dengan HTTP 503; Admin aktif tetap bisa lewat)
  if (!isMaintenanceExempt(pathname)) {
    const maint = await readMaintenanceStatus(request.nextUrl.origin);
    if (maint.isMaintenance) {
      const bypassCookie = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value;
      const isAdminBypass = hasSessionToken && (await verifyAdminBypassToken(bypassCookie));

      if (!isAdminBypass) {
        const retryAfter = String(Math.max(30, maint.retryAfterSeconds || 1800));

        // API transaksi & pengguna -> tolak dengan HTTP 503 JSON
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            {
              error:
                maint.message ||
                'Sistem sedang dalam pemeliharaan terjadwal. Silakan coba beberapa saat lagi.',
              maintenance: true,
              title: maint.title || 'Pemeliharaan Sistem',
              endAt: maint.endAt || null,
            },
            {
              status: 503,
              headers: {
                'Retry-After': retryAfter,
                'Cache-Control': 'no-store, no-cache, must-revalidate',
              },
            }
          );
        }

        // Halaman web -> rewrite ke /maintenance dengan status HTTP 503 (ramah SEO & pengguna)
        const maintUrl = new URL('/maintenance', request.url);
        const response = NextResponse.rewrite(maintUrl, { status: 503 });
        response.headers.set('Retry-After', retryAfter);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return response;
      }
    }
  }

  // Untuk endpoint API selain pemeriksaan pemeliharaan, langsung lanjutkan tanpa redirect auth halaman
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 1. Proteksi Akses Admin: Jika user BELUM login dan mencoba membuka rute /admin/*
  const isAccessingAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  if (isAccessingAdmin && !hasSessionToken) {
    const adminLoginUrl = new URL(ADMIN_PORTAL_ROUTE, request.url);
    const response = NextResponse.redirect(adminLoginUrl);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 2. Proteksi Akses Pengguna Biasa: Jika belum login dan membuka rute terproteksi
  const isAccessingUserProtected = USER_PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isAccessingUserProtected && !hasSessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);

    const response = NextResponse.redirect(loginUrl);
    // Nonaktifkan cache browser sepenuhnya agar riwayat tidak tersimpan di BFCache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 3. Redirect Otomatis: Jika user SUDAH login dan membuka '/' atau '/login' umum
  if ((pathname === '/' || pathname === '/login') && hasSessionToken) {
    return NextResponse.redirect(new URL('/toko', request.url));
  }

  // 4. Response normal (Izinkan Next.js router cache untuk rute pengguna agar navigasi instan)
  const response = NextResponse.next();
  if (isAccessingAdmin) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Cocokkan seluruh rute halaman & API kecuali berkas statis Next.js, ikon PWA, dan service worker.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|icons/|sw\\.js|offline\\.html|manifest\\.webmanifest|maplibre-gl-worker\\.mjs|robots\\.txt|sitemap\\.xml).*)',
  ],
};
