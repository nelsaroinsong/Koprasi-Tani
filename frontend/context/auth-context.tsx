'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  refreshUser: () => Promise<User | null>;
  logout: () => void;
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
    if (status === 'authenticated' && session?.user?.email) {
      fetch('/api/user/profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setLocalUser((prev) => {
              if (
                prev &&
                prev.name === data.user.name &&
                prev.role === data.user.role &&
                prev.isVerified === data.user.isVerified &&
                prev.isOnboarded === data.user.isOnboarded &&
                prev.avatarUrl === data.user.avatarUrl &&
                prev.phone === data.user.phone &&
                prev.address === data.user.address
              ) {
                return prev;
              }
              const merged = { ...prev, ...data.user };
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                window.dispatchEvent(new CustomEvent('user-updated'));
              } catch {}
              if (updateSession && data.user.isVerified !== (session?.user as any)?.isVerified) {
                updateSession({ user: data.user }).catch(() => {});
              }
              return merged;
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [status, session?.user?.email, updateSession]);

  // Bersihkan data lokal ketika status sesi menjadi unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      setLocalUser(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('koperasi_last_activity_time');
    }
  }, [status]);

  // Dengarkan event sinkronisasi profil instan antar-halaman
  useEffect(() => {
    const handleUserUpdated = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setLocalUser(JSON.parse(saved));
        }
      } catch {}
    };

    window.addEventListener('user-updated', handleUserUpdated);
    window.addEventListener('storage', handleUserUpdated);

    return () => {
      window.removeEventListener('user-updated', handleUserUpdated);
      window.removeEventListener('storage', handleUserUpdated);
    };
  }, []);

  // Sesi pengguna hanya aktif jika NextAuth berstatus authenticated atau ada sesi valid
  const isSessionActive = status === 'authenticated' && Boolean(session?.user);

  // Sync with NextAuth session and local storage (Memoized to prevent cascading re-renders)
  const currentUser: User | null = useMemo(() => {
    if (!isSessionActive) return null;
    return {
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
        Boolean(localUser?.isVerified) ||
        Boolean((session?.user as any)?.isVerified),
      isOnboarded:
        Boolean(localUser?.isOnboarded) ||
        Boolean((session?.user as any)?.isOnboarded),
      address:
        localUser?.address ||
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

    // Google OAuth resmi NextAuth - diarahkan ke /auth-callback untuk auto-dispatch (ke toko atau onboarding stepper)
    await nextAuthSignIn('google', { callbackUrl: '/auth-callback' });
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

    // Kirim perubahan (Nama, No Telepon, Alamat, Avatar) ke database PostgreSQL
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
      const res = await fetch('/api/user/profile');
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
