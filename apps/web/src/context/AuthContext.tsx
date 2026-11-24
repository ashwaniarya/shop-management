'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { AuthUser, Register } from '@shop/shared';

import {
  exchangeOAuthSession,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  upgradePassword as apiUpgradePassword,
} from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  upgradePassword: (password: string) => Promise<void>;
  register: (input: Register) => Promise<void>;
  finishOAuthSignIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((authUser) => setUser(authUser))
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { user: authUser } = await apiLogin(username, password);
    setUser(authUser);
  }, []);

  const upgradePassword = useCallback(async (password: string) => {
    const { user: authUser } = await apiUpgradePassword(password);
    setUser(authUser);
  }, []);

  const register = useCallback(async (input: Register) => {
    const { user: authUser } = await apiRegister(input);
    setUser(authUser);
  }, []);

  // OAuth left the session in an httpOnly cookie. This call claims it, then loads the user.
  const finishOAuthSignIn = useCallback(async () => {
    await exchangeOAuthSession();
    setUser(await getMe());
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Best-effort: still send the user to the login page if the server call fails.
    }
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, upgradePassword, finishOAuthSignIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
