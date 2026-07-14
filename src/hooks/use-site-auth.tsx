'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthSession,
  SignInResult,
  SiteAuthPort,
} from '@/lib/site-auth';

type SiteAuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const SiteAuthContext = createContext<SiteAuthContextValue | null>(null);

export type SiteAuthProviderProps = {
  children: ReactNode;
  auth: SiteAuthPort;
};

export function SiteAuthProvider({ children, auth }: SiteAuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const next = await auth.getSession();
    setSession(next);
    setIsLoading(false);
  }, [auth]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const next = await auth.getSession();
      if (!cancelled) {
        setSession(next);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await auth.signIn(email, password);
      if (result.status === 'signed_in') {
        await refreshSession();
      }
      return result;
    },
    [auth, refreshSession],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    await refreshSession();
  }, [auth, refreshSession]);

  return (
    <SiteAuthContext.Provider value={{ session, isLoading, signIn, signOut }}>
      {children}
    </SiteAuthContext.Provider>
  );
}

export function useSiteAuth(): SiteAuthContextValue {
  const value = useContext(SiteAuthContext);
  if (!value) {
    throw new Error('useSiteAuth must be used within a SiteAuthProvider');
  }
  return value;
}
