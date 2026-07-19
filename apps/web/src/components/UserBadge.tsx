'use client';

import type { UserRole } from '@shop/shared';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';

const ROLE_TONE: Record<UserRole, BadgeTone> = {
  OWNER: 'accent',
  MANAGER: 'positive',
  STAFF: 'neutral',
};

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 2.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 5.25 13 8l-3 2.75M13 8H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserBadge() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2.5">
      <p className="hidden text-sm font-medium text-ink-100 sm:block">{user.name}</p>
      <Badge tone={ROLE_TONE[user.role]}>{user.role}</Badge>
      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Sign out"
        className="flex h-11 items-center gap-1.5 rounded-sm px-2.5 text-ink-400 transition-colors hover:bg-ink-850 hover:text-accent-400 sm:h-9"
      >
        <SignOutIcon />
        <span className="hidden text-xs font-medium sm:inline">Sign out</span>
      </button>
    </div>
  );
}
