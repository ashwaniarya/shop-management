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
import { listSuppliers, softDeleteSupplier, updateSupplier } from '@/lib/api';
import type { Supplier } from '@shop/shared';

import { SupplierFormDialog } from './SupplierFormDialog';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 7;

export function SuppliersTable() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [dialogTarget, setDialogTarget] = useState<Supplier | 'new' | null>(null);

  const fetchPage = useCallback((page: number) => listSuppliers({ page, limit: PAGE_SIZE }), []);
  const { data: suppliers, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const visibleRows = filterByActiveState(suppliers, activeFilter);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load suppliers" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Status</span>
          <SegmentedControl label="Status filter" options={ACTIVE_FILTER_OPTIONS} value={activeFilter} onChange={setActiveFilter} />
        </div>
        <Button variant="primary" size="sm" onClick={() => setDialogTarget('new')}>
          Add supplier
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Contact</Th>
            <Th>Phone</Th>
            <Th>Email</Th>
            <Th>GSTIN</Th>
            <Th>Status</Th>
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
                  title="No suppliers match this filter"
                  description={suppliers.length === 0 ? 'Add the first supplier to get started.' : 'Try a different status filter.'}
                />
              </td>
            </tr>
          ) : (
            visibleRows.map((supplier) => (
              <Tr key={supplier.id} className={supplier.isActive ? undefined : 'opacity-60'}>
                <Td>{supplier.name}</Td>
                <Td className="text-ink-400">{supplier.contactPerson ?? '—'}</Td>
                <Td mono className="text-ink-400">
                  {supplier.phone ?? '—'}
                </Td>
                <Td className="text-ink-400">{supplier.email ?? '—'}</Td>
                <Td mono className="text-ink-400">
                  {supplier.gstin ?? '—'}
                </Td>
                <Td>
                  <ActiveBadge isActive={supplier.isActive} />
                </Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget(supplier)}>
                      Edit
                    </Button>
                    <ActivationAction
                      isActive={supplier.isActive}
                      onDeactivate={() => softDeleteSupplier(supplier.id).then(refetch)}
                      onReactivate={() => updateSupplier(supplier.id, { isActive: true }).then(() => refetch())}
                    />
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

      <SupplierFormDialog
        supplier={dialogTarget === 'new' || dialogTarget === null ? null : dialogTarget}
        isOpen={dialogTarget !== null}
        onClose={() => setDialogTarget(null)}
        onSaved={refetch}
      />
    </div>
  );
}
