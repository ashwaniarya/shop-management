'use client';

import { useCallback, useMemo } from 'react';

import type { User } from '@shop/shared';

import { listShopUsers } from '@/lib/api';

import { useAsync } from './useAsync';

interface UseShopUsersLookupResult {
  users: User[];
  usersById: Map<number, User>;
  isLoading: boolean;
  error: unknown;
}

const NO_USERS: User[] = [];

export function useShopUsersLookup(shopId: number | null): UseShopUsersLookupResult {
  const fetcher = useCallback(
    () => (shopId === null ? Promise.resolve(NO_USERS) : listShopUsers(shopId, { limit: 100 }).then((page) => page.data)),
    [shopId],
  );
  const { data, isLoading, error } = useAsync(fetcher);

  const users = data ?? NO_USERS;
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  return { users, usersById, isLoading, error };
}
