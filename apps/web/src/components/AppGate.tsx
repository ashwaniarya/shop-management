'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { AppShell } from '@/components/AppShell';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAuth } from '@/context/AuthContext';
import { ShopProvider } from '@/context/ShopContext';

// Reachable while signed out — everything else redirects to /login.
const PUBLIC_PATHS = new Set(['/login', '/register']);

export function AppGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user && !PUBLIC_PATHS.has(pathname)) {
      router.replace('/login');
    }
  }, [isLoading, user, pathname, router]);

  if (PUBLIC_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
        <LoadingBlock label="Loading…" />
      </div>
    );
  }

  return (
    <ShopProvider>
      <AppShell>{children}</AppShell>
    </ShopProvider>
  );
}
