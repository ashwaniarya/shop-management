'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { SignedQuantity } from '@/components/SignedQuantity';
import { TransactionTypeBadge } from '@/components/TransactionTypeBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAsync } from '@/hooks/useAsync';
import { usePartsLookup } from '@/hooks/usePartsLookup';
import { listStockTransactions } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/format';

export function RecentMovementsPanel({ shopId }: { shopId: number }) {
  const fetcher = useCallback(() => listStockTransactions(shopId, { limit: 8 }).then((page) => page.data), [shopId]);
  const { data: transactions, isLoading, error, retry } = useAsync(fetcher);
  const { partsById } = usePartsLookup();

  return (
    <section className="rounded-md border border-ink-800 bg-ink-900">
      <header className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <h2 className="font-display text-sm font-bold tracking-wide text-ink-50 uppercase">Recent movements</h2>
        <Link href="/transactions" className="text-xs text-ink-400 transition-colors hover:text-accent-400">
          View ledger &rarr;
        </Link>
      </header>
      <div className="p-4">
        {isLoading ? (
          <LoadingBlock label="Loading recent activity…" />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : !transactions || transactions.length === 0 ? (
          <EmptyState
            title="No stock movements yet"
            description="Sales, purchases and adjustments for this shop will show up here."
          />
        ) : (
          <ul className="divide-y divide-ink-850">
            {transactions.map((transaction) => {
              const part = partsById.get(transaction.partId);
              return (
                <li key={transaction.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <TransactionTypeBadge type={transaction.type} />
                  <Link
                    href={`/parts/${transaction.partId}`}
                    className="min-w-0 flex-1 truncate text-sm text-ink-200 transition-colors hover:text-accent-400"
                  >
                    {part ? part.name : `Part #${transaction.partId}`}
                  </Link>
                  <SignedQuantity value={transaction.quantity} />
                  <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-ink-400">
                    {formatCurrency(transaction.unitPrice)}
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-500">
                    {formatRelativeTime(transaction.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
