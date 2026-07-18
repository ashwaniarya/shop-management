'use client';

import { useCallback } from 'react';

import type { Part } from '@shop/shared';

import { listParts } from '@/lib/api';

import { useAsync } from './useAsync';

interface UsePartsLookupResult {
  partsById: Map<number, Part>;
  isLoading: boolean;
  error: unknown;
}

const EMPTY_PARTS: Map<number, Part> = new Map();

// Stock transactions carry only a partId, so screens that list transactions across
// parts (dashboard recent movements, the transactions ledger) need a sku/name lookup.
// Fetches the first 100 parts once; fine for this catalog's scale, but a catalog that
// outgrows one page would need a per-id fetch-on-demand cache instead.
export function usePartsLookup(): UsePartsLookupResult {
  const fetcher = useCallback(
    () => listParts({ limit: 100 }).then((page) => new Map(page.data.map((part) => [part.id, part]))),
    [],
  );
  const { data, isLoading, error } = useAsync(fetcher);

  return { partsById: data ?? EMPTY_PARTS, isLoading, error };
}
