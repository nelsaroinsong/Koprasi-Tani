'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load user from localStorage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage when user changes
  const saveUser = (u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Google Login Handler
  const loginWithGoogle = async (customData?: Partial<User>) => {
    setIsLoading(true);
    try {
      // If user already exists in localStorage or backend, retrieve it
      const existing = localStorage.getItem(STORAGE_KEY);
      let userData: User;

      if (existing) {
        userData = JSON.parse(existing);
      } else {
        // New Google Account default
        userData = {
          id: 'usr-' + Math.random().toString(36).substring(2, 9),
          name: customData?.name || 'Pengguna Baru',
          email: customData?.email || 'user@gmail.com',
          avatarUrl: customData?.avatarUrl || '',
          role: null, // Role belum dipilih, harus ke onboarding
          isVerified: false,
        };
      }

      if (customData) {
        userData = { ...userData, ...customData };
      }

      saveUser(userData);

      // Redirect logic: jika belum pilih role -> /onboarding, jika sudah -> /toko
      if (!userData.role) {
        router.push('/onboarding');
      } else {
        router.push('/toko');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Onboarding Role Selection Handler
  const selectRole = async (role: 'PETANI' | 'PEMBELI', kelompokTaniId?: string) => {
    if (!user) return;

    // Pembeli langsung terverifikasi, Petani menunggu verifikasi admin
    const isVerified = role === 'PEMBELI';

    const updatedUser: User = {
      ...user,
      role,
      isVerified,
      kelompokTaniId,
    };

    saveUser(updatedUser);

    // Setelah role dipilih, langsung arahkan ke Toko Online
    router.push('/toko');
  };

  // Logout Handler
  const logout = () => {
    saveUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithGoogle, selectRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
