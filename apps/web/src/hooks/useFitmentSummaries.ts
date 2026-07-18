'use client';

import { useEffect, useRef, useState } from 'react';

import { getPart360 } from '@/lib/api';
import { summarizeFitments } from '@/lib/fitmentSummary';

interface UseFitmentSummariesResult {
  summaryByPartId: Map<number, string>;
  loadingPartIds: Set<number>;
}

// The parts list endpoint has no fitment-summary projection, so this fetches each
// visible row's fitments individually (bounded by the table's page size) and caches
// the result for the life of the component, so paging back to a row already seen
// doesn't refetch it.
export function useFitmentSummaries(partIds: number[]): UseFitmentSummariesResult {
  const [summaryByPartId, setSummaryByPartId] = useState<Map<number, string>>(new Map());
  const [loadingPartIds, setLoadingPartIds] = useState<Set<number>>(new Set());
  const cacheRef = useRef<Map<number, string>>(new Map());
  const partIdsKey = partIds.join(',');

  useEffect(() => {
    const idsToFetch = partIds.filter((id) => !cacheRef.current.has(id));
    if (idsToFetch.length === 0) {
      return;
    }

    let isCancelled = false;
    setLoadingPartIds((current) => new Set([...current, ...idsToFetch]));

    Promise.all(
      idsToFetch.map((id) =>
        getPart360(id, ['fitments'])
          .then((part) => ({ id, summary: summarizeFitments(part.fitments ?? []) }))
          .catch(() => ({ id, summary: '—' })),
      ),
    ).then((results) => {
      if (isCancelled) {
        return;
      }
      for (const result of results) {
        cacheRef.current.set(result.id, result.summary);
      }
      setSummaryByPartId(new Map(cacheRef.current));
      setLoadingPartIds((current) => {
        const next = new Set(current);
        for (const result of results) {
          next.delete(result.id);
        }
        return next;
      });
    });

    return () => {
      isCancelled = true;
      // Un-mark this run's ids: a cancelled run's .then skips all state updates, so
      // without this its ids would stay "loading" forever. Runs before the next
      // effect adds its own ids, so it cannot clobber a successor run's marks.
      setLoadingPartIds((current) => {
        const next = new Set(current);
        for (const id of idsToFetch) {
          next.delete(id);
        }
        return next;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partIdsKey]);

  return { summaryByPartId, loadingPartIds };
}
