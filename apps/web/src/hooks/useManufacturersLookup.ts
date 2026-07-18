'use client';

import { useCallback } from 'react';

import type { Manufacturer } from '@shop/shared';

import { listManufacturers } from '@/lib/api';

import { useAsync } from './useAsync';

interface UseManufacturersLookupResult {
  manufacturers: Manufacturer[];
  manufacturersById: Map<number, Manufacturer>;
  isLoading: boolean;
  error: unknown;
}

export function useManufacturersLookup(): UseManufacturersLookupResult {
  const fetcher = useCallback(() => listManufacturers({ limit: 100 }).then((page) => page.data), []);
  const { data, isLoading, error } = useAsync(fetcher);
  const manufacturers = data ?? [];

  return {
    manufacturers,
    manufacturersById: new Map(manufacturers.map((manufacturer) => [manufacturer.id, manufacturer])),
    isLoading,
    error,
  };
}
