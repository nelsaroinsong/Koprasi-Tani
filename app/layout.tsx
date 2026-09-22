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
  title: 'Tani Naik Kelas | Koperasi Sinar Pagi Sejahtera - Minahasa Utara',
  description: 'Ekosistem digital agribisnis kelapa & jagung terpadu Minahasa Utara - Tani Naik Kelas. Jual beli komoditas, sewa alsintan bersubsidi, edukasi AI & permodalan KUR.',
  openGraph: {
    title: 'Tani Naik Kelas | Koperasi Sinar Pagi Sejahtera - Minahasa Utara',
    description: 'Ekosistem digital agribisnis kelapa & jagung terpadu Minahasa Utara - Tani Naik Kelas.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tani Naik Kelas | Koperasi Sinar Pagi Sejahtera - Minahasa Utara',
    description: 'Ekosistem digital agribisnis kelapa & jagung terpadu Minahasa Utara - Tani Naik Kelas.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased bg-dot-pattern text-slate-800 selection:bg-emerald-100 selection:text-emerald-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
