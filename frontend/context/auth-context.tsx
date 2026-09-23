'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (customData?: Partial<User>) => Promise<void>;
  selectRole: (role: 'PETANI' | 'PEMBELI') => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  loginWithGoogle: async () => {},
  selectRole: async () => {},
  updateProfile: () => {},
  logout: () => {},
});

const STORAGE_KEY = 'koperasi_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const router = useRouter();

  // Load local user on mount and sync with database
  useEffect(() => {
    // Tangani browser BFCache saat pengguna menekan tombol 'Back' setelah logout
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLocalUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load user from localStorage', e);
    }

    // Fetch fresh profile from database via API jika session aktif
    if (status === 'authenticated') {
      fetch('/api/user/profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setLocalUser((prev) => {
              const merged = { ...prev, ...data.user };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch((err) => console.log('Offline or unauthenticated user'));
    }

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [session, status]);

  // Bersihkan data lokal ketika status sesi menjadi unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      setLocalUser(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('koperasi_last_activity_time');
    }
  }, [status]);

  // Sesi pengguna hanya aktif jika NextAuth berstatus authenticated atau ada sesi valid
  const isSessionActive = status === 'authenticated' && Boolean(session?.user);

  // Sync with NextAuth session and local storage
  const currentUser: User | null = isSessionActive
    ? {
        id: session?.user?.id || localUser?.id || 'usr-google',
        name: localUser?.name || session?.user?.name || 'Pengguna',
        email: session?.user?.email || localUser?.email || '',
        avatarUrl:
          localUser?.avatarUrl ||
          // @ts-ignore
          session?.user?.avatarUrl ||
          session?.user?.image ||
          '',
        phone:
          localUser?.phone ||
          // @ts-ignore
          session?.user?.phone ||
          '',
        role:
          (localUser?.role as UserRole) ||
          // @ts-ignore
          (session?.user?.role as UserRole) ||
          null,
        isVerified:
          localUser?.isVerified ??
          // @ts-ignore
          session?.user?.isVerified ??
          false,
        isOnboarded:
          localUser?.isOnboarded ??
          // @ts-ignore
          session?.user?.isOnboarded ??
          false,
        address:
          localUser?.address ||
          // @ts-ignore
          session?.user?.address ||
          '',
      }
    : null;

  const saveUser = (u: User | null) => {
    setLocalUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Google Login Handler
  const loginWithGoogle = async (customData?: Partial<User>) => {
    // Jika user mengisi form coba akun khusus (custom data)
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

    // Google OAuth resmi NextAuth
    await nextAuthSignIn('google', { callbackUrl: '/onboarding' });
  };

  // Onboarding Role Selection Handler
  const selectRole = async (role: 'PETANI' | 'PEMBELI') => {
    // Admin tidak diperkenankan mengubah perannya menjadi pembeli atau petani
    if (currentUser?.role === 'ADMIN') {
      console.warn('Akun administrator tidak dapat diubah menjadi pembeli atau petani.');
      router.push('/admin');
      return;
    }

    try {
      // Simpan ke PostgreSQL database via API
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

    // Kirim perubahan (Nama, No Telepon, Avatar) ke database PostgreSQL
    try {
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          name: data.name,
          phone: data.phone,
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

  // Logout Handler
  const logout = async () => {
    saveUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('koperasi_last_activity_time');
    sessionStorage.clear();

    try {
      if (session) {
        await nextAuthSignOut({ redirect: false });
      }
    } catch (err) {
      console.error('Error saat sign out:', err);
    }

    // Mengganti entry riwayat peramban secara absolut ke /login agar tombol 'Back' tidak membuka sesi lama
    window.location.replace('/login');
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
