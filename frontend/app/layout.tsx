import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
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

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased bg-dot-pattern text-slate-800 selection:bg-emerald-100 selection:text-emerald-900" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
