import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth-passwords';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
    Credentials({
      id: 'admin-credentials',
      name: 'Portal Administrator',
      credentials: {
        email: { label: 'Email Admin', type: 'email' },
        password: { label: 'Kata Sandi', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || user.role !== 'ADMIN' || !user.isActive) {
            console.warn(`[Admin Auth] Akses ditolak untuk email: ${email} (Bukan admin aktif)`);
            return null;
          }

          if (!user.password) {
            console.warn(`[Admin Auth] Akun admin ${email} belum memiliki password`);
            return null;
          }

          const isValid = verifyPassword(password, user.password);
          if (!isValid) {
            console.warn(`[Admin Auth] Password salah untuk admin: ${email}`);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
          };
        } catch (error) {
          console.error('[Admin Auth] Error authorize:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'admin-credentials') {
        return true;
      }

      if (!user.email) return false;

      const userEmail = user.email.trim().toLowerCase();

      try {
        // Cek apakah user sudah terdaftar di database koperasi
        const existingUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        // Administrator tidak bisa login sebagai pembeli atau petani via login publik
        if (existingUser && existingUser.role === 'ADMIN') {
          console.warn(`[Auth Guard] Akun admin ${userEmail} dilarang login sebagai pembeli/petani.`);
          return '/login?error=AdminBlocked';
        }

        if (existingUser) {
          if (!existingUser.googleId && account?.providerAccountId) {
            // Hubungkan googleId jika user sebelumnya belum ada googleId
            await prisma.user.update({
              where: { email: userEmail },
              data: {
                googleId: account.providerAccountId,
                avatarUrl: user.image || existingUser.avatarUrl,
              },
            });
          }
        } else {
          // Buat akun baru dari Google Login
          await prisma.user.create({
            data: {
              email: userEmail,
              name: user.name || 'Pengguna Google',
              avatarUrl: user.image,
              googleId: account?.providerAccountId || user.id,
              role: 'PEMBELI', // default role awal sebelum onboarding
              isVerified: false,
              isOnboarded: false,
              isActive: true,
            },
          });
        }

        // Return true agar NextAuth mengizinkan login dan menerbitkan session token resmi
        return true;
      } catch (error) {
        console.warn('[Auth SignIn] Database belum siap saat memproses user Google, melanjutkan sesi:', error);
        return true;
      }
    },

    async redirect({ url, baseUrl }) {
      try {
        if (!url) return `${baseUrl}/auth-callback`;
        // Cegah redirect loop balik ke endpoint internal NextAuth
        if (url.includes('/api/auth')) return `${baseUrl}/auth-callback`;
        // Cegah redirect ke halaman 404 / not found
        if (url.includes('not-found') || url.includes('404')) {
          return `${baseUrl}/auth-callback`;
        }
        // Izinkan callback URL relatif
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }
        // Izinkan callback URL dari origin yang sama
        const parsedUrl = new URL(url, baseUrl);
        if (parsedUrl.origin === baseUrl) {
          if (parsedUrl.pathname.includes('/api/auth') || parsedUrl.pathname.includes('not-found') || parsedUrl.pathname.includes('404')) {
            return `${baseUrl}/auth-callback`;
          }
          return url;
        }
      } catch (err) {
        console.warn('[Auth Redirect Callback] Error:', err);
      }
      return `${baseUrl}/auth-callback`;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.role = user.role;
        // @ts-ignore
        token.isVerified = user.isVerified;
        // @ts-ignore
        token.isOnboarded = user.isOnboarded;
        token.name = user.name;
        // @ts-ignore
        token.avatarUrl = user.avatarUrl;
        // @ts-ignore
        token.phone = user.phone;
        // @ts-ignore
        token.address = user.address;
      }
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email.trim().toLowerCase() },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.isVerified = dbUser.isVerified;
            token.isOnboarded = dbUser.isOnboarded;
            token.name = dbUser.name;
            token.avatarUrl = dbUser.avatarUrl;
            token.picture = dbUser.avatarUrl || token.picture;
            token.phone = dbUser.phone;
            token.address = dbUser.address;
          }
        } catch (e) {
          console.warn('[Auth JWT] Database belum terjangkau di localhost:5433, menggunakan data sesi sementara.');
        }
      }

      if (trigger === 'update' && session?.user) {
        if (session.user.role) token.role = session.user.role;
        if (session.user.isVerified !== undefined) token.isVerified = session.user.isVerified;
        if (session.user.isOnboarded !== undefined) token.isOnboarded = session.user.isOnboarded;
        if (session.user.avatarUrl) {
          token.avatarUrl = session.user.avatarUrl;
          token.picture = session.user.avatarUrl;
        }
        if (session.user.phone) token.phone = session.user.phone;
        if (session.user.address) token.address = session.user.address;
        if (session.user.name) token.name = session.user.name;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.image = (token.avatarUrl as string) || (token.picture as string) || session.user.image;
        // @ts-ignore - custom property
        session.user.avatarUrl = (token.avatarUrl as string) || session.user.image;
        // @ts-ignore - custom property
        session.user.phone = token.phone as string;
        // @ts-ignore - custom property
        session.user.address = token.address as string;
        // @ts-ignore - custom property
        session.user.role = token.role;
        // @ts-ignore - custom property
        session.user.isVerified = token.isVerified;
        // @ts-ignore - custom property
        session.user.isOnboarded = token.isOnboarded;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // 1 jam (3600 detik) - Sesi kedaluwarsa jika tidak ada aktivitas
    updateAge: 15 * 60, // 15 menit - Token diperbarui berkala saat pengguna aktif
  },
});
