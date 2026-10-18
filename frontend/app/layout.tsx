import type {Metadata} from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  icons: [],
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
import SmoothScrollProvider from '@/components/providers/smooth-scroll-provider';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={`${dmSans.variable} font-sans`}>
      <body className="font-sans antialiased bg-dot-pattern text-slate-800 selection:bg-emerald-100 selection:text-emerald-900 pb-16 lg:pb-0" suppressHydrationWarning>
        <SessionProvider>
          <AuthProvider>
            <ToastProvider>
              <SmoothScrollProvider>
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
