'use client';

import { useCallback } from 'react';

import { TransactionSummaryTiles } from '@/components/TransactionSummaryTiles';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAsync } from '@/hooks/useAsync';
import { getTransactionsSummary } from '@/lib/api';
import { endOfDayIso } from '@/lib/dateRange';

export function TransactionsSummaryStrip({ shopId, from, to }: { shopId: number; from: string; to: string }) {
  const fetcher = useCallback(
    () =>
      getTransactionsSummary(shopId, {
        from: from || undefined,
        to: to ? endOfDayIso(to) : undefined,
      }),
    [shopId, from, to],
  );
  const { data: summary, isLoading, error, retry } = useAsync(fetcher);

  if (isLoading) {
    return <LoadingBlock label="Loading summary…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={retry} title="Could not load the summary" />;
  }
  if (!summary) {
    return null;
  }

  const rangeCaption = from || to ? 'Selected date range' : 'All time';

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink-500">
        Summary reflects the date range only — the type filter below does not narrow these totals.
      </p>
      <TransactionSummaryTiles summary={summary} rangeCaption={rangeCaption} />
    </div>
  );
}
