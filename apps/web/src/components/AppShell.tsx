'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';
import { ShopSelector } from '@/components/ShopSelector';

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <MobileNav isOpen={isDrawerOpen} onClose={closeDrawer} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-800 bg-ink-900 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-nav-drawer"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-sm text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100 md:hidden"
            >
              <HamburgerIcon />
            </button>
            <p className="hidden font-mono text-xs tracking-wide text-ink-500 sm:block">
              Parts counter workstation
            </p>
          </div>
          <ShopSelector />
        </header>
        <main className="bg-graticule flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
