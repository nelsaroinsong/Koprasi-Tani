'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import React from 'react';
import type { Session } from 'next-auth';

interface SessionProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session} refetchOnWindowFocus={false} basePath="/api/auth">
      {children}
    </NextAuthSessionProvider>
  );
}
