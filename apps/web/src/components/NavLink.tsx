'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? 'bg-accent-500/10 text-ink-50' : 'text-ink-400 hover:bg-ink-850 hover:text-ink-100'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute -left-3 h-4 w-[3px] rounded-full transition-colors ${
          isActive ? 'bg-accent-500' : 'bg-transparent group-hover:bg-ink-700'
        }`}
      />
      {children}
    </Link>
  );
}
