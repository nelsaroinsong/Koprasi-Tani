import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rute umum terproteksi untuk pengguna umum (anggota/pembeli/petani)
const USER_PROTECTED_ROUTES = ['/toko', '/sewa-alat', '/onboarding', '/verifikasi-petani'];

// Sub-URL khusus portal login admin
const ADMIN_PORTAL_ROUTE = '/admin-koperasi-sinar-pagi-sejahtera';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek apakah ada cookie session NextAuth / Auth.js
  const hasSessionToken =
    Boolean(request.cookies.get('authjs.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-authjs.session-token')?.value) ||
    Boolean(request.cookies.get('next-auth.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-next-auth.session-token')?.value) ||
    request.cookies.getAll().some((c) => c.name.toLowerCase().includes('session-token'));

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

  // 4. Response normal dengan header anti-cache untuk halaman terproteksi
  const response = NextResponse.next();
  if (isAccessingAdmin || isAccessingUserProtected) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin-koperasi-sinar-pagi-sejahtera',
    '/toko/:path*',
    '/sewa-alat/:path*',
    '/admin/:path*',
    '/onboarding/:path*',
    '/verifikasi-petani/:path*',
  ],
};

