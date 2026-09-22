// src/components/SessionProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface ProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

export default function Provider({ children, session }: ProviderProps) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
