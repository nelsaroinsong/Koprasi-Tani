import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek apakah ada cookie session NextAuth / Auth.js
  const hasSessionToken =
    Boolean(request.cookies.get('authjs.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-authjs.session-token')?.value) ||
    Boolean(request.cookies.get('next-auth.session-token')?.value) ||
    Boolean(request.cookies.get('__Secure-next-auth.session-token')?.value) ||
    request.cookies.getAll().some((c) => c.name.toLowerCase().includes('session-token'));

  // Jika user sudah login dan mengakses '/', alihkan langsung di tingkat server ke '/toko'
  if (pathname === '/' && hasSessionToken) {
    return NextResponse.redirect(new URL('/toko', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
