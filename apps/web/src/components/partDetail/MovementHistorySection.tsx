'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { SignedQuantity } from '@/components/SignedQuantity';
import { TransactionTypeBadge } from '@/components/TransactionTypeBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingRow } from '@/components/ui/LoadingRow';
import { Pagination } from '@/components/ui/Pagination';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useShopUsersLookup } from '@/hooks/useShopUsersLookup';
import { listStockTransactions } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';

const PAGE_SIZE = 10;
const COLUMN_COUNT = 6;

export function MovementHistorySection({ partId, shopId }: { partId: number; shopId: number }) {
  const fetchPage = useCallback(
    (page: number) => listStockTransactions(shopId, { partId, page, limit: PAGE_SIZE }),
    [shopId, partId],
  );
  const { data: transactions, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const { usersById } = useShopUsersLookup(shopId);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load movement history" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Link
          href={`/transactions?partId=${partId}`}
          className="text-xs text-ink-400 transition-colors hover:text-accent-400"
        >
          View this part in the full ledger &rarr;
        </Link>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Type</Th>
            <Th align="right">Quantity</Th>
            <Th align="right">Unit price</Th>
            <Th>User</Th>
            <Th>Notes</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
          ) : transactions.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState title="No movements for this part in this shop" />
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => (
              <Tr key={transaction.id}>
                <Td mono className="text-ink-400">
                  {formatDateTime(transaction.createdAt)}
                </Td>
                <Td>
                  <TransactionTypeBadge type={transaction.type} />
                </Td>
                <Td align="right">
                  <SignedQuantity value={transaction.quantity} />
                </Td>
                <Td align="right" mono>
                  {formatCurrency(transaction.unitPrice)}
                </Td>
                <Td className="text-ink-400">{usersById.get(transaction.userId)?.name ?? `#${transaction.userId}`}</Td>
                <Td className="text-ink-400">{transaction.notes ?? '—'}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
    </div>
  );
}
