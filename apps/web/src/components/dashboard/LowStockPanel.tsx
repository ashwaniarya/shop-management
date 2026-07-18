'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useAsync } from '@/hooks/useAsync';
import { listInventory } from '@/lib/api';
import { formatQuantity } from '@/lib/format';

export function LowStockPanel({ shopId }: { shopId: number }) {
  const fetcher = useCallback(
    () => listInventory(shopId, { belowReorder: true, limit: 8 }).then((page) => page.data),
    [shopId],
  );
  const { data: rows, isLoading, error, retry } = useAsync(fetcher);

  return (
    <section className="rounded-md border border-ink-800 bg-ink-900">
      <header className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <h2 className="font-display text-sm font-bold tracking-wide text-ink-50 uppercase">Low stock</h2>
        <Link href="/inventory" className="text-xs text-ink-400 transition-colors hover:text-accent-400">
          View inventory &rarr;
        </Link>
      </header>
      <div className="p-4">
        {isLoading ? (
          <LoadingBlock label="Checking stock levels…" />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : !rows || rows.length === 0 ? (
          <EmptyState
            title="Nothing below reorder level"
            description="Every stocked part in this shop is at or above its reorder point."
          />
        ) : (
          <ul className="divide-y divide-ink-850">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <Link href={`/parts/${row.partId}`} className="group min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-100 group-hover:text-accent-400">{row.part.name}</p>
                  <p className="font-mono text-xs text-ink-500">{row.part.sku}</p>
                </Link>
                <p className="shrink-0 font-mono text-sm tabular-nums text-accent-400">
                  {formatQuantity(row.quantityOnHand)}
                  <span className="text-ink-600"> / {formatQuantity(row.reorderLevel ?? 0)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
