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
  avatarUrl?: string;
  kelompokTaniId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (customData?: Partial<User>) => Promise<void>;
  selectRole: (role: 'PETANI' | 'PEMBELI', kelompokTaniId?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  loginWithGoogle: async () => {},
  selectRole: async () => {},
  logout: () => {},
});

const STORAGE_KEY = 'koperasi_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const router = useRouter();

  // Load local user on mount as fallback/cache
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLocalUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load user from localStorage', e);
    }
  }, []);

  // Sync with NextAuth session whenever it updates
  const currentUser: User | null = session?.user
    ? {
        id: session.user.id || 'usr-google',
        name: session.user.name || 'Pengguna Google',
        email: session.user.email || '',
        avatarUrl: session.user.image || '',
        // @ts-ignore
        role: (session.user.role as UserRole) || localUser?.role || null,
        // @ts-ignore
        isVerified: session.user.isVerified ?? localUser?.isVerified ?? false,
        // @ts-ignore
        kelompokTaniId: session.user.kelompokTaniId || localUser?.kelompokTaniId,
      }
    : localUser;

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
        role: null,
        isVerified: false,
        ...customData,
      };
      saveUser(userData);
      router.push('/onboarding');
      return;
    }

    // Google OAuth resmi NextAuth
    await nextAuthSignIn('google', { callbackUrl: '/onboarding' });
  };

  // Onboarding Role Selection Handler
  const selectRole = async (role: 'PETANI' | 'PEMBELI', kelompokTaniId?: string) => {
    try {
      // Simpan ke PostgreSQL database via API
      await fetch('/api/user/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, kelompokTaniId }),
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
      kelompokTaniId,
    };

    saveUser(updatedUser);
    if (updateSession) {
      await updateSession({ user: { role, isVerified } });
    }

    router.push('/toko');
  };

  // Logout Handler
  const logout = async () => {
    saveUser(null);
    if (session) {
      await nextAuthSignOut({ callbackUrl: '/' });
    } else {
      router.push('/');
    }
  };

  const isLoading = status === 'loading';

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isLoading,
        loginWithGoogle,
        selectRole,
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
