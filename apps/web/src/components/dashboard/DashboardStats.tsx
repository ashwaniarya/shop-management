'use client';

import { useCallback } from 'react';

import { TransactionSummaryTiles } from '@/components/TransactionSummaryTiles';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAsync } from '@/hooks/useAsync';
import { getTransactionsSummary } from '@/lib/api';
import { getCurrentMonthRange } from '@/lib/dateRange';

export function DashboardStats({ shopId }: { shopId: number }) {
  const fetcher = useCallback(() => {
    const { from, to } = getCurrentMonthRange(new Date());
    return getTransactionsSummary(shopId, { from, to });
  }, [shopId]);
  const { data: summary, isLoading, error, retry } = useAsync(fetcher);

  if (isLoading) {
    return <LoadingBlock label="Loading this month's activity…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={retry} title="Could not load this month's summary" />;
  }
  if (!summary) {
    return null;
  }

  return <TransactionSummaryTiles summary={summary} rangeCaption="This month" />;
}
