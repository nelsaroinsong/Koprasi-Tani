import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Menangani permintaan ke /auth/callback agar tidak menghasilkan 404 Not Found,
// melainkan dialihkan secara mulus ke /auth-callback resmi
export async function GET(request: NextRequest) {
  const url = new URL('/auth-callback', request.url);
  // Teruskan semua query parameters (seperti callbackUrl atau parameter OAuth)
  request.nextUrl.searchParams.forEach((val, key) => {
    url.searchParams.set(key, val);
  });
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
