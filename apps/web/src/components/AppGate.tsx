'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { AppShell } from '@/components/AppShell';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAuth } from '@/context/AuthContext';
import { ShopProvider } from '@/context/ShopContext';

export function AppGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoading, user, pathname, router]);

  if (pathname === '/login') {
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
