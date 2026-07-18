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
import { endOfDayIso } from '@/lib/dateRange';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Part } from '@shop/shared';

import type { TransactionsFiltersValue } from './TransactionsFilterBar';

const PAGE_SIZE = 25;
const COLUMN_COUNT = 8;

interface TransactionsTableProps {
  shopId: number;
  filters: TransactionsFiltersValue;
  partsById: Map<number, Part>;
}

export function TransactionsTable({ shopId, filters, partsById }: TransactionsTableProps) {
  const fetchPage = useCallback(
    (page: number) =>
      listStockTransactions(shopId, {
        page,
        limit: PAGE_SIZE,
        type: filters.type === 'all' ? undefined : filters.type,
        partId: filters.partId ?? undefined,
        from: filters.from || undefined,
        to: filters.to ? endOfDayIso(filters.to) : undefined,
      }),
    [shopId, filters],
  );

  const { data: transactions, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const { usersById } = useShopUsersLookup(shopId);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load the ledger" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Type</Th>
            <Th>Part</Th>
            <Th align="right">Quantity</Th>
            <Th align="right">Unit price</Th>
            <Th align="right">Line value</Th>
            <Th>User</Th>
            <Th>Notes</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
          ) : transactions.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState title="No transactions match these filters" description="Widen the date range or clear a filter." />
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => {
              const part = partsById.get(transaction.partId);
              const lineValue = transaction.unitPrice === null ? null : Math.abs(transaction.quantity) * transaction.unitPrice;
              return (
                <Tr key={transaction.id}>
                  <Td mono className="text-ink-400">
                    {formatDateTime(transaction.createdAt)}
                  </Td>
                  <Td>
                    <TransactionTypeBadge type={transaction.type} />
                  </Td>
                  <Td>
                    <Link href={`/parts/${transaction.partId}`} className="text-ink-100 hover:text-accent-400">
                      {part ? part.name : `Part #${transaction.partId}`}
                    </Link>
                    {part ? <span className="ml-1.5 font-mono text-xs text-ink-500">{part.sku}</span> : null}
                  </Td>
                  <Td align="right">
                    <SignedQuantity value={transaction.quantity} />
                  </Td>
                  <Td align="right" mono className="text-ink-400">
                    {formatCurrency(transaction.unitPrice)}
                  </Td>
                  <Td align="right" mono className="text-ink-200">
                    {formatCurrency(lineValue)}
                  </Td>
                  <Td className="text-ink-400">{usersById.get(transaction.userId)?.name ?? `#${transaction.userId}`}</Td>
                  <Td className="text-ink-400">{transaction.notes ?? '—'}</Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
    </div>
  );
}
