'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingRow } from '@/components/ui/LoadingRow';
import { Pagination } from '@/components/ui/Pagination';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { listInventory, type InventoryRow } from '@/lib/api';
import { formatCurrency, formatQuantity } from '@/lib/format';
import { isBelowReorderLevel } from '@/lib/stock';

import { InventoryEditDialog } from './InventoryEditDialog';
import type { InventoryFiltersValue } from './InventoryFilterBar';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 8;

export function InventoryTable({ shopId, filters }: { shopId: number; filters: InventoryFiltersValue }) {
  const [editingRow, setEditingRow] = useState<InventoryRow | null>(null);

  const fetchPage = useCallback(
    (page: number) =>
      listInventory(shopId, {
        page,
        limit: PAGE_SIZE,
        belowReorder: filters.belowReorderFilter === 'belowReorder' ? true : undefined,
        categoryId: filters.categoryId ?? undefined,
        q: filters.q || undefined,
      }),
    [shopId, filters],
  );

  const { data: rows, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load inventory" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <thead>
          <tr>
            <Th>SKU</Th>
            <Th>Part</Th>
            <Th>Manufacturer</Th>
            <Th align="right">On hand</Th>
            <Th align="right">Reorder at</Th>
            <Th align="right">Cost</Th>
            <Th align="right">Selling</Th>
            <Th>Location</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState title="No inventory rows match these filters" description="Try widening the search or clearing a filter." />
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const belowReorder = isBelowReorderLevel(row.quantityOnHand, row.reorderLevel);
              return (
                <Tr key={row.id}>
                  <Td mono>
                    <Link href={`/parts/${row.partId}`} className="text-ink-100 hover:text-accent-400">
                      {row.part.sku}
                    </Link>
                  </Td>
                  <Td>{row.part.name}</Td>
                  <Td className="text-ink-400">{row.part.manufacturerName}</Td>
                  <Td align="right" mono className={belowReorder ? 'font-semibold text-accent-400' : undefined}>
                    {formatQuantity(row.quantityOnHand)}
                  </Td>
                  <Td align="right" mono className="text-ink-400">
                    {row.reorderLevel === null ? '—' : formatQuantity(row.reorderLevel)}
                  </Td>
                  <Td align="right" mono className="text-ink-400">
                    {formatCurrency(row.costPrice)}
                  </Td>
                  <Td align="right" mono className="text-ink-400">
                    {formatCurrency(row.sellingPrice)}
                  </Td>
                  <Td className="text-ink-400">
                    <div className="flex items-center justify-between gap-2">
                      <span>{row.storageLocation ?? '—'}</span>
                      <Button variant="ghost" size="sm" onClick={() => setEditingRow(row)}>
                        Edit
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

      <InventoryEditDialog shopId={shopId} row={editingRow} onClose={() => setEditingRow(null)} onSaved={refetch} />
    </div>
  );
}
