'use client';

import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useShop } from '@/context/ShopContext';
import { usePartsLookup } from '@/hooks/usePartsLookup';
import {
  INITIAL_TRANSACTIONS_FILTERS,
  TransactionsFilterBar,
  type TransactionsFiltersValue,
} from '@/components/transactions/TransactionsFilterBar';
import { TransactionsSummaryStrip } from '@/components/transactions/TransactionsSummaryStrip';
import { TransactionsTable } from '@/components/transactions/TransactionsTable';

export default function TransactionsPage() {
  const { shops, isLoading, selectedShopId } = useShop();
  const { partsById } = usePartsLookup();
  const [filters, setFilters] = useState<TransactionsFiltersValue>(INITIAL_TRANSACTIONS_FILTERS);

  // Lets a "view transactions for this part" link from the part-360 page arrive as
  // /transactions?partId=123 and pre-filter the ledger to that part.
  useEffect(() => {
    const queryPartId = new URLSearchParams(window.location.search).get('partId');
    const parsedPartId = queryPartId ? Number(queryPartId) : NaN;
    if (Number.isInteger(parsedPartId)) {
      setFilters((current) => ({ ...current, partId: parsedPartId }));
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Transactions ledger</h1>
        <p className="mt-1 text-sm text-ink-500">Append-only history of sales, purchases and adjustments.</p>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading shops…" />
      ) : shops.length === 0 ? (
        <EmptyState title="No shops configured yet" description="Add a shop from the Shops screen before recording transactions." />
      ) : selectedShopId === null ? (
        <EmptyState title="Select a shop" description="Choose a shop from the header above to see its ledger." />
      ) : (
        <>
          <TransactionsFilterBar
            value={filters}
            onChange={setFilters}
            filteredPartLabel={filters.partId !== null ? (partsById.get(filters.partId)?.sku ?? null) : null}
          />
          <TransactionsSummaryStrip shopId={selectedShopId} from={filters.from} to={filters.to} />
          <TransactionsTable shopId={selectedShopId} filters={filters} partsById={partsById} />
        </>
      )}
    </div>
  );
}
