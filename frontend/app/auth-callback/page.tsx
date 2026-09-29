import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AuthCallbackPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const userEmail = session.user.email.trim().toLowerCase();

  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: {
      role: true,
      isOnboarded: true,
      isVerified: true,
    },
  });

  // Jika akun adalah admin
  if (dbUser?.role === 'ADMIN') {
    redirect('/admin');
  }

  // JIKA AKUN SUDAH PERNAH TERDAFTAR (Sudah menyelesaikan profil)
  // Langsung alihkan ke toko online (atau verifikasi jika petani belum diverifikasi)
  if (dbUser?.isOnboarded) {
    if (dbUser.role === 'PETANI' && !dbUser.isVerified) {
      redirect('/verifikasi-petani');
    }
    redirect('/toko');
  }

  // JIKA AKUN BARU / BELUM ONBOARDED:
  // Alihkan ke tahap-tahap pembuatan akun (stepper)
  redirect('/onboarding');
}
