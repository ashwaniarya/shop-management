'use client';

import { useCallback } from 'react';

import type { User } from '@shop/shared';

import { listShopUsers } from '@/lib/api';

import { useAsync } from './useAsync';

interface UseShopUsersLookupResult {
  users: User[];
  usersById: Map<number, User>;
  isLoading: boolean;
  error: unknown;
}

export function useShopUsersLookup(shopId: number | null): UseShopUsersLookupResult {
  const fetcher = useCallback(
    () => (shopId === null ? Promise.resolve([]) : listShopUsers(shopId, { limit: 100 }).then((page) => page.data)),
    [shopId],
  );
  const { data, isLoading, error } = useAsync(fetcher);

  const users = data ?? [];
  const usersById = new Map(users.map((user) => [user.id, user]));

  return { users, usersById, isLoading, error };
}
