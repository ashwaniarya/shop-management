'use client';

import { useCallback, useMemo } from 'react';

import type { Manufacturer } from '@shop/shared';

import { listManufacturers } from '@/lib/api';

import { useAsync } from './useAsync';

interface UseManufacturersLookupResult {
  manufacturers: Manufacturer[];
  manufacturersById: Map<number, Manufacturer>;
  isLoading: boolean;
  error: unknown;
}

const NO_MANUFACTURERS: Manufacturer[] = [];

export function useManufacturersLookup(): UseManufacturersLookupResult {
  const fetcher = useCallback(() => listManufacturers({ limit: 100 }).then((page) => page.data), []);
  const { data, isLoading, error } = useAsync(fetcher);
  const manufacturers = data ?? NO_MANUFACTURERS;
  const manufacturersById = useMemo(
    () => new Map(manufacturers.map((manufacturer) => [manufacturer.id, manufacturer])),
    [manufacturers],
  );

  return { manufacturers, manufacturersById, isLoading, error };
}
