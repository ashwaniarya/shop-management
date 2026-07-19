'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { AuthUser } from '@shop/shared';

import { getMe, login as apiLogin, logout as apiLogout } from '@/lib/api';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/authToken';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then((authUser) => setUser(authUser))
      .catch(() => {
        // A 401 already cleared the token in request(); on a network/5xx blip we
        // keep the token so a valid session survives a transient failure.
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, pin: string) => {
    const { token, user: authUser } = await apiLogin(username, pin);
    setAuthToken(token);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Best-effort: still sign the user out locally even if the server call fails.
    }
    clearAuthToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
