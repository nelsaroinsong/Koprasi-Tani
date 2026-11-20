import type { Metadata, Viewport } from 'next';
import { DM_Sans, Great_Vibes } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-great-vibes',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Koperasi Sinar Pagi Sejahtera - Minahasa Utara',
  description: 'Platform digital agribisnis, jual beli komoditas, sewa alat.',
  openGraph: {
    title: 'Koperasi Sinar Pagi Sejahtera - Minahasa Utara',
    description: 'Platform digital agribisnis, jual beli komoditas, sewa alat.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koperasi Sinar Pagi Sejahtera - Minahasa Utara',
    description: 'Platform digital agribisnis, jual beli komoditas, sewa alat.',
  },
};

import { AuthProvider } from '@/context/auth-context';
import { SessionProvider } from '@/components/providers/session-provider';
import { ToastProvider } from '@/context/toast-context';
import SessionTimeoutManager from '@/components/SessionTimeoutManager';
import ChunkLoadRecovery from '@/components/ChunkLoadRecovery';
import SmoothScrollProvider from '@/components/providers/smooth-scroll-provider';
import { auth } from '@/auth';

export default async function RootLayout({children}: {children: React.ReactNode}) {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.warn('[RootLayout] Warning getting session:', error);
  }

  return (
    <html lang="id" className={`${dmSans.variable} ${greatVibes.variable} font-sans`}>
      <body className="font-sans antialiased bg-dot-pattern text-slate-800 selection:bg-emerald-100 selection:text-emerald-900" suppressHydrationWarning>
        <SessionProvider session={session}>
          <AuthProvider>
            <ToastProvider>
              <SmoothScrollProvider>
                <ChunkLoadRecovery />
                <SessionTimeoutManager />
                {children}
              </SmoothScrollProvider>
            </ToastProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
