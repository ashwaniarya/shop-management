'use client';

import { useEffect, useRef, useState } from 'react';

import type { Meta } from '@shop/shared';

import type { Paginated } from '@/lib/api';

interface UsePaginatedListResult<T> {
  data: T[];
  meta: Meta | null;
  isLoading: boolean;
  error: unknown;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

// `fetchPage` should be a `useCallback` closing over every filter that affects the
// query (shop id, search text, category, ...). This hook watches the function's own
// identity: when it changes (a filter changed), it jumps back to page 1; otherwise it
// just loads whichever page was requested. Stale responses from a superseded fetch are
// dropped via the request-id guard, so a slow page-1 request can never clobber a
// faster page-2 response that landed after it.
export function usePaginatedList<T>(fetchPage: (page: number) => Promise<Paginated<T>>): UsePaginatedListResult<T> {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const requestIdRef = useRef(0);
  const previousFetchPageRef = useRef<typeof fetchPage | null>(null);

  function runFetch(pageToLoad: number) {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    fetchPage(pageToLoad)
      .then((result) => {
        if (requestId === requestIdRef.current) {
          setData(result.data);
          setMeta(result.meta);
        }
      })
      .catch((caughtError: unknown) => {
        if (requestId === requestIdRef.current) {
          setError(caughtError);
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
  }

  useEffect(() => {
    const filtersChanged = previousFetchPageRef.current !== null && previousFetchPageRef.current !== fetchPage;
    previousFetchPageRef.current = fetchPage;
    if (filtersChanged && page !== 1) {
      // Jump back to page 1 and let this effect's re-run (page changed) do the
      // single fetch, instead of fetching here AND again after setPage.
      setPage(1);
      return;
    }
    runFetch(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, page]);

  return { data, meta, isLoading, error, page, setPage, refetch: () => runFetch(page) };
}
