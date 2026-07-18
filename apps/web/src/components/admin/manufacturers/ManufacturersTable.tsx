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
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { listManufacturers, softDeleteManufacturer, updateManufacturer } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Manufacturer } from '@shop/shared';

import { ManufacturerFormDialog } from './ManufacturerFormDialog';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 5;

export function ManufacturersTable() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [dialogTarget, setDialogTarget] = useState<Manufacturer | 'new' | null>(null);

  const fetchPage = useCallback((page: number) => listManufacturers({ page, limit: PAGE_SIZE }), []);
  const { data: manufacturers, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const visibleRows = filterByActiveState(manufacturers, activeFilter);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load manufacturers" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Status</span>
          <SegmentedControl label="Status filter" options={ACTIVE_FILTER_OPTIONS} value={activeFilter} onChange={setActiveFilter} />
        </div>
        <Button variant="primary" size="sm" onClick={() => setDialogTarget('new')}>
          Add manufacturer
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Code</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
          ) : visibleRows.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState
                  title="No manufacturers match this filter"
                  description={manufacturers.length === 0 ? 'Add the first manufacturer to get started.' : 'Try a different status filter.'}
                />
              </td>
            </tr>
          ) : (
            visibleRows.map((manufacturer) => (
              <Tr key={manufacturer.id} className={manufacturer.isActive ? undefined : 'opacity-60'}>
                <Td>{manufacturer.name}</Td>
                <Td mono className="text-ink-400">
                  {manufacturer.code ?? '—'}
                </Td>
                <Td>
                  <ActiveBadge isActive={manufacturer.isActive} />
                </Td>
                <Td mono className="text-ink-400">
                  {formatDate(manufacturer.createdAt)}
                </Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget(manufacturer)}>
                      Edit
                    </Button>
                    <ActivationAction
                      isActive={manufacturer.isActive}
                      onDeactivate={() => softDeleteManufacturer(manufacturer.id).then(refetch)}
                      onReactivate={() => updateManufacturer(manufacturer.id, { isActive: true }).then(() => refetch())}
                    />
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

      <ManufacturerFormDialog
        manufacturer={dialogTarget === 'new' || dialogTarget === null ? null : dialogTarget}
        isOpen={dialogTarget !== null}
        onClose={() => setDialogTarget(null)}
        onSaved={refetch}
      />
    </div>
  );
}
