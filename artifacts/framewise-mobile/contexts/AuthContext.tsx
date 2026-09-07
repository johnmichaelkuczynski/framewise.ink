import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : 'http://localhost:3000';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async () => {
    const base = getApiBase();
    const authUrl = `${base}/api/auth/google`;
    try {
      // openAuthSessionAsync keeps a shared cookie jar on iOS so the session
      // cookie set by the server is accessible to subsequent fetch() calls.
      await WebBrowser.openAuthSessionAsync(authUrl, base + '/');
    } catch {
      // Browser closed without completing — still re-check auth status below
    }
    // Always re-check; the server session may have been established even if
    // the redirect did not return a deep-link result code.
    await checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      const base = getApiBase();
      await fetch(`${base}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
