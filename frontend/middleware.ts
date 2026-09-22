import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Daftar rute terproteksi yang mewajibkan sesi login aktif
const PROTECTED_ROUTES = ['/toko', '/sewa-alat', '/admin', '/onboarding'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek apakah ada cookie session NextAuth / Auth.js
  const hasSessionToken =
    Boolean(request.cookies.get('authjs.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-authjs.session-token')?.value) ||
    Boolean(request.cookies.get('next-auth.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-next-auth.session-token')?.value) ||
    request.cookies.getAll().some((c) => c.name.toLowerCase().includes('session-token'));

  // 1. Proteksi Akses: Jika user BELUM login dan mencoba membuka rute terproteksi
  const isAccessingProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isAccessingProtected && !hasSessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    
    const response = NextResponse.redirect(loginUrl);
    // Nonaktifkan cache browser sepenuhnya agar riwayat tidak tersimpan di BFCache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 2. Redirect Otomatis: Jika user SUDAH login dan membuka '/' atau '/login'
  if ((pathname === '/' || pathname === '/login') && hasSessionToken) {
    return NextResponse.redirect(new URL('/toko', request.url));
  }

  // 3. Response normal dengan header anti-cache untuk halaman terproteksi
  const response = NextResponse.next();
  if (isAccessingProtected) {
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
    '/toko/:path*',
    '/sewa-alat/:path*',
    '/admin/:path*',
    '/onboarding/:path*',
  ],
};
