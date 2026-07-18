'use client';

import { useCallback, useState } from 'react';

import { ACTIVE_FILTER_OPTIONS, filterByActiveState, type ActiveFilterValue } from '@/components/admin/activeFilter';
import { ActivationAction } from '@/components/admin/ActivationAction';
import { ActiveBadge } from '@/components/admin/ActiveBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingRow } from '@/components/ui/LoadingRow';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { useShop } from '@/context/ShopContext';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { listShops, softDeleteShop, updateShop } from '@/lib/api';
import type { Shop } from '@shop/shared';

import { ShopFormDialog } from './ShopFormDialog';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 6;

export function ShopsTable({ onManageUsers }: { onManageUsers: (shop: Shop) => void }) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [dialogTarget, setDialogTarget] = useState<Shop | 'new' | null>(null);

  const fetchPage = useCallback((page: number) => listShops({ page, limit: PAGE_SIZE }), []);
  const { data: shops, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const { refreshShops } = useShop();
  const visibleRows = filterByActiveState(shops, activeFilter);

  // Every shop mutation refreshes both this table AND the app-wide shop context,
  // so the header's shop selector reflects renames/adds/deactivations immediately.
  function handleShopsMutated() {
    refetch();
    void refreshShops();
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load shops" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Status</span>
          <SegmentedControl label="Status filter" options={ACTIVE_FILTER_OPTIONS} value={activeFilter} onChange={setActiveFilter} />
        </div>
        <Button variant="primary" size="sm" onClick={() => setDialogTarget('new')}>
          Add shop
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Address</Th>
            <Th>Phone</Th>
            <Th>GSTIN</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
          ) : visibleRows.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState
                  title="No shops match this filter"
                  description={shops.length === 0 ? 'Add the first shop to get started.' : 'Try a different status filter.'}
                />
              </td>
            </tr>
          ) : (
            visibleRows.map((shop) => (
              <Tr key={shop.id} className={shop.isActive ? undefined : 'opacity-60'}>
                <Td>{shop.name}</Td>
                <Td className="text-ink-400">{shop.address ?? '—'}</Td>
                <Td mono className="text-ink-400">
                  {shop.phone ?? '—'}
                </Td>
                <Td mono className="text-ink-400">
                  {shop.gstin ?? '—'}
                </Td>
                <Td>
                  <ActiveBadge isActive={shop.isActive} />
                </Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => onManageUsers(shop)}>
                      Users
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget(shop)}>
                      Edit
                    </Button>
                    <ActivationAction
                      isActive={shop.isActive}
                      onDeactivate={() => softDeleteShop(shop.id).then(handleShopsMutated)}
                      onReactivate={() => updateShop(shop.id, { isActive: true }).then(handleShopsMutated)}
                    />
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

      <ShopFormDialog
        shop={dialogTarget === 'new' || dialogTarget === null ? null : dialogTarget}
        isOpen={dialogTarget !== null}
        onClose={() => setDialogTarget(null)}
        onSaved={handleShopsMutated}
      />
    </div>
  );
}
