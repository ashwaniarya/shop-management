'use client';

import { useEffect, useState } from 'react';

interface UseAsyncResult<T> {
  data: T | null;
  isLoading: boolean;
  error: unknown;
  retry: () => void;
}

// `fetcher` should be a `useCallback` closing over whatever it depends on (shop id,
// a search filter, ...): a change in its identity starts a fresh load, same as
// usePaginatedList. `retry` re-runs the same fetcher without waiting for a dependency
// to change, for the "Retry" button on an ErrorState.
export function useAsync<T>(fetcher: () => Promise<T>): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!isCancelled) {
          setData(result);
        }
      })
      .catch((caughtError: unknown) => {
        if (!isCancelled) {
          setError(caughtError);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, reloadToken]);

  return { data, isLoading, error, retry: () => setReloadToken((token) => token + 1) };
}
