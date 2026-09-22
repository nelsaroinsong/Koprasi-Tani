import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        // Cek apakah user sudah terdaftar di database koperasi
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          // Buat akun baru dari Google Login
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || 'Pengguna Google',
              avatarUrl: user.image,
              googleId: account?.providerAccountId || user.id,
              role: 'PEMBELI', // default role awal sebelum onboarding
              isVerified: false,
              isActive: true,
            },
          });
        } else if (!existingUser.googleId && account?.providerAccountId) {
          // Hubungkan googleId jika user sebelumnya belum ada googleId
          await prisma.user.update({
            where: { email: user.email },
            data: {
              googleId: account.providerAccountId,
              avatarUrl: user.image || existingUser.avatarUrl,
            },
          });
        }

        return true;
      } catch (error) {
        console.error('Error saat menyimpan user Google ke database:', error);
        return true; // tetap izinkan login sesi NextAuth
      }
    },

    async jwt({ token, user, trigger, session }) {
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.isVerified = dbUser.isVerified;
            token.name = dbUser.name;
            token.kelompokTaniId = dbUser.kelompokTaniId;
          }
        } catch (e) {
          console.error('Error fetching user for JWT token:', e);
        }
      }

      if (trigger === 'update' && session?.user) {
        token.role = session.user.role;
        token.isVerified = session.user.isVerified;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) || (token.sub as string);
        // @ts-ignore - custom property
        session.user.role = token.role;
        // @ts-ignore - custom property
        session.user.isVerified = token.isVerified;
        // @ts-ignore - custom property
        session.user.kelompokTaniId = token.kelompokTaniId;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
});
