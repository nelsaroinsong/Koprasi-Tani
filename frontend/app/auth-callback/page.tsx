import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface AuthCallbackPageProps {
  searchParams?: Promise<{ callbackUrl?: string }>;
}

export default async function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawCallbackUrl = resolvedSearchParams?.callbackUrl;

  // Sanitasi callbackUrl agar tidak mengarah ke 404 / halaman error / auth loops
  let targetCallbackUrl: string | null = null;
  if (
    rawCallbackUrl &&
    rawCallbackUrl.startsWith('/') &&
    !rawCallbackUrl.includes('/api/auth') &&
    !rawCallbackUrl.includes('/auth-callback') &&
    !rawCallbackUrl.includes('/login') &&
    !rawCallbackUrl.includes('not-found') &&
    !rawCallbackUrl.includes('404')
  ) {
    targetCallbackUrl = rawCallbackUrl;
  }

  const userEmail = session.user.email.trim().toLowerCase();

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        role: true,
        isOnboarded: true,
        isVerified: true,
      },
    });

    // Jika pengguna belum ada di database (mencegah error 404 saat fetch profile)
    if (!dbUser) {
      dbUser = await prisma.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
          email: userEmail,
          name: session.user.name || 'Pengguna Koperasi',
          avatarUrl: session.user.image || null,
          role: 'PEMBELI',
          isVerified: false,
          isOnboarded: false,
          isActive: true,
        },
        select: {
          id: true,
          role: true,
          isOnboarded: true,
          isVerified: true,
        },
      });
    }
  } catch (error) {
    console.error('[Auth Callback] Error saat mengambil atau membuat data pengguna:', error);
  }

  // Jika akun adalah admin
  if (dbUser?.role === 'ADMIN') {
    redirect('/admin');
  }

  // JIKA AKUN SUDAH SELESAI ONBOARDING:
  // Alihkan ke target callback URL yang diminta, atau default ke toko/verifikasi petani
  if (dbUser?.isOnboarded) {
    if (dbUser.role === 'PETANI' && !dbUser.isVerified) {
      redirect('/verifikasi-petani');
    }
    redirect(targetCallbackUrl || '/toko');
  }

  // JIKA AKUN BARU / BELUM ONBOARDED:
  // Alihkan ke tahap pengisian profil (stepper onboarding)
  redirect('/onboarding');
}
