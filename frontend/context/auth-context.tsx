'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { loginPathAfterLogout } from '@/lib/admin-routes';

export type UserRole = 'PETANI' | 'PEMBELI' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  isVerified: boolean;
  isOnboarded?: boolean;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (customData?: Partial<User>) => Promise<void>;
  selectRole: (role: 'PETANI' | 'PEMBELI') => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  refreshUser: () => Promise<User | null>;
  logout: (opts?: { reason?: string }) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  loginWithGoogle: async () => {},
  selectRole: async () => {},
  updateProfile: () => {},
  refreshUser: async () => null,
  logout: () => {},
});

const STORAGE_KEY = 'koperasi_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const router = useRouter();

  // Load local user on mount and sync with database (strictly scoped by session email)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    const sessionEmail = session?.user?.email?.trim().toLowerCase();

    if (status === 'authenticated' && sessionEmail) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Hanya gunakan cache localStorage jika email sama persis dengan akun sesi aktif saat ini
          if (parsed?.email?.trim().toLowerCase() === sessionEmail) {
            setLocalUser(parsed);
          } else {
            // Hapus cache localStorage milik akun sebelumnya agar tidak bocor antar-akun
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('koperasi_user');
            setLocalUser(null);
          }
        }
      } catch (e) {
        console.warn('Failed to parse user from localStorage', e);
      }

      // Fetch fresh profile from database via API jika session aktif
      let isCancelled = false;
      fetch('/api/user/profile', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isCancelled || !data?.user) return;
          if (data.user.email?.trim().toLowerCase() !== sessionEmail) return;

          setLocalUser((prev) => {
            if (
              prev &&
              prev.email?.trim().toLowerCase() === sessionEmail &&
              prev.name === data.user.name &&
              prev.role === data.user.role &&
              prev.isVerified === data.user.isVerified &&
              prev.isOnboarded === data.user.isOnboarded &&
              prev.avatarUrl === data.user.avatarUrl &&
              prev.phone === data.user.phone &&
              prev.address === data.user.address &&
              prev.createdAt === data.user.createdAt
            ) {
              return prev;
            }
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
            } catch {}
            return data.user;
          });
        })
        .catch(() => {});

      return () => {
        isCancelled = true;
        window.removeEventListener('pageshow', handlePageShow);
      };
    }

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [status, session?.user?.email]);

  // Bersihkan data lokal ketika status sesi menjadi unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      setLocalUser(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('koperasi_user');
      localStorage.removeItem('koperasi_last_activity_time');
    }
  }, [status]);

  // Dengarkan event sinkronisasi profil instan antar-halaman (hanya jika email cocok dengan sesi)
  useEffect(() => {
    const handleUserUpdated = () => {
      try {
        const sessionEmail = session?.user?.email?.trim().toLowerCase();
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (sessionEmail && parsed?.email?.trim().toLowerCase() !== sessionEmail) {
            return;
          }
          setLocalUser((prev) => {
            if (!prev) return parsed;
            if (
              prev.id === parsed.id &&
              prev.name === parsed.name &&
              prev.email === parsed.email &&
              prev.role === parsed.role &&
              prev.isVerified === parsed.isVerified &&
              prev.isOnboarded === parsed.isOnboarded &&
              prev.avatarUrl === parsed.avatarUrl &&
              prev.phone === parsed.phone &&
              prev.address === parsed.address
            ) {
              return prev;
            }
            return parsed;
          });
        }
      } catch {}
    };

    window.addEventListener('user-updated', handleUserUpdated);
    window.addEventListener('storage', handleUserUpdated);

    return () => {
      window.removeEventListener('user-updated', handleUserUpdated);
      window.removeEventListener('storage', handleUserUpdated);
    };
  }, [session?.user?.email]);

  // Sesi pengguna hanya aktif jika NextAuth berstatus authenticated atau ada sesi valid
  const isSessionActive = status === 'authenticated' && Boolean(session?.user);

  // Sync with NextAuth session and local storage (Strictly email-matched to prevent cross-account bleed)
  const currentUser: User | null = useMemo(() => {
    if (!isSessionActive) return null;

    const sessionEmail = (session?.user?.email || '').trim().toLowerCase();
    const matchedLocal =
      localUser && localUser.email?.trim().toLowerCase() === sessionEmail ? localUser : null;

    const resolvedRole =
      (matchedLocal?.role as UserRole) ||
      // @ts-ignore
      (session?.user?.role as UserRole) ||
      null;

    const resolvedIsVerified =
      resolvedRole === 'PEMBELI'
        ? true
        : matchedLocal !== null
        ? Boolean(matchedLocal.isVerified)
        : Boolean((session?.user as any)?.isVerified);

    const resolvedIsOnboarded =
      matchedLocal !== null && matchedLocal.isOnboarded !== undefined
        ? Boolean(matchedLocal.isOnboarded)
        : Boolean((session?.user as any)?.isOnboarded);

    return {
      id: session?.user?.id || matchedLocal?.id || 'usr-google',
      name: matchedLocal?.name || session?.user?.name || 'Pengguna',
      email: session?.user?.email || matchedLocal?.email || '',
      avatarUrl:
        matchedLocal?.avatarUrl ||
        // @ts-ignore
        session?.user?.avatarUrl ||
        session?.user?.image ||
        '',
      phone:
        matchedLocal?.phone ||
        // @ts-ignore
        session?.user?.phone ||
        '',
      role: resolvedRole,
      isVerified: resolvedIsVerified,
      isOnboarded: resolvedIsOnboarded,
      address:
        matchedLocal?.address ||
        // @ts-ignore
        session?.user?.address ||
        '',
    };
  }, [
    isSessionActive,
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.user?.image,
    // @ts-ignore
    session?.user?.avatarUrl,
    // @ts-ignore
    session?.user?.phone,
    // @ts-ignore
    session?.user?.role,
    // @ts-ignore
    session?.user?.isVerified,
    // @ts-ignore
    session?.user?.isOnboarded,
    // @ts-ignore
    session?.user?.address,
    localUser,
  ]);

  const saveUser = (u: User | null) => {
    setLocalUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-updated'));
    }
  };

  // Google Login Handler
  const loginWithGoogle = async (customData?: Partial<User>) => {
    // Bersihkan sisa state akun lama sebelum memulai proses login akun baru
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('koperasi_user');
      // Hapus penanda login portal admin yang mungkin tertinggal (mis. admin batal
      // memilih akun Google). Tanpa ini, login user publik ikut diperlakukan
      // sebagai login admin dan ditolak dengan pesan "bukan administrator".
      document.cookie = 'ksps_admin_login=; Max-Age=0; Path=/; SameSite=Lax';
    }
    setLocalUser(null);

    if (customData && customData.name && customData.name !== 'Anggota Koperasi') {
      const userData: User = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        name: customData.name || 'Pengguna Baru',
        email: customData.email || 'user@gmail.com',
        avatarUrl: customData.avatarUrl || '',
        role: customData.role || 'PEMBELI',
        isVerified: true,
        isOnboarded: true,
        ...customData,
      };
      saveUser(userData);
      router.push('/toko');
      return;
    }

    // Google OAuth resmi NextAuth - diarahkan ke /auth-callback untuk auto-dispatch
    await nextAuthSignIn('google', { callbackUrl: '/auth-callback' }, { prompt: 'select_account' });
  };

  // Onboarding Role Selection Handler
  const selectRole = async (role: 'PETANI' | 'PEMBELI') => {
    if (currentUser?.role === 'ADMIN') {
      console.warn('Akun administrator tidak dapat diubah menjadi pembeli atau petani.');
      router.push('/admin');
      return;
    }

    try {
      await fetch('/api/user/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
    } catch (e) {
      console.warn('Gagal sinkronisasi peran ke backend API:', e);
    }

    const isVerified = role === 'PEMBELI';
    const updatedUser: User = {
      ...(currentUser || {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        name: 'Pengguna',
        email: 'user@gmail.com',
      }),
      role,
      isVerified,
    };

    saveUser(updatedUser);
    if (updateSession) {
      await updateSession({ user: { role, isVerified } });
    }

    if (role === 'PETANI') {
      router.push('/verifikasi-petani');
    } else {
      router.push('/toko');
    }
  };

  // Update Profile (Name, Phone, Avatar) ke database dan session
  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      ...data,
    };
    saveUser(updated);

    try {
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          name: data.name,
          phone: data.phone,
          address: data.address,
          avatarUrl: data.avatarUrl,
        }),
      });
    } catch (err) {
      console.warn('Gagal sinkronisasi profil ke database:', err);
    }

    if (updateSession) {
      await updateSession({ user: data });
    }
  };

  // Muat ulang data profil terbaru dari backend database
  const refreshUser = async (): Promise<User | null> => {
    try {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          saveUser(data.user);
          if (updateSession) {
            await updateSession({ user: data.user });
          }
          return data.user;
        }
      }
    } catch (e) {
      console.error('Error saat refreshUser:', e);
    }
    return null;
  };

  // Logout Handler
  const logout = async (opts?: { reason?: string }) => {
    // Admin kembali ke login admin; pembeli/petani ke login pengguna
    const target = loginPathAfterLogout({
      role: (currentUser as any)?.role || (session?.user as any)?.role,
      pathname: typeof window !== 'undefined' ? window.location.pathname : null,
      reason: opts?.reason,
    });
    saveUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('koperasi_user');
    localStorage.removeItem('koperasi_token');
    localStorage.removeItem('koperasi_last_active');
    localStorage.removeItem('koperasi_last_activity_time');
    sessionStorage.clear();

    try {
      if (session) {
        await nextAuthSignOut({ redirect: false });
      }
    } catch (err) {
      console.error('Error saat sign out:', err);
    }

    window.location.replace(target);
  };

  const isLoading = status === 'loading';

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isLoading,
        loginWithGoogle,
        selectRole,
        updateProfile,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
