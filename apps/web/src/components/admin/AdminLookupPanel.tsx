'use client';

import { useCallback, useState, type ReactNode } from 'react';

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
import type { Paginated } from '@/lib/api';

const PAGE_SIZE = 20;

export interface AdminLookupColumn<TItem> {
  header: string;
  headerAlign?: 'right';
  align?: 'right';
  mono?: boolean;
  cellClassName?: string;
  cell: (item: TItem) => ReactNode;
}

// Every lookup panel shows the same Status column, but at a different position in
// its column list, so it's a helper each config splices in rather than a column the
// panel appends itself.
export function activeStatusColumn<TItem extends { isActive: boolean }>(): AdminLookupColumn<TItem> {
  return { header: 'Status', cell: (item) => <ActiveBadge isActive={item.isActive} /> };
}

interface AdminLookupPanelProps<TItem extends { id: number; isActive: boolean }> {
  entityLabel: string;
  entityLabelPlural: string;
  columns: AdminLookupColumn<TItem>[];
  loadingRowCount?: number;
  listItems: (params: { page: number; limit: number }) => Promise<Paginated<TItem>>;
  softDeleteItem: (id: number) => Promise<void>;
  updateItem: (id: number, body: { isActive: boolean }) => Promise<unknown>;
  renderFormDialog: (props: { item: TItem | null; isOpen: boolean; onClose: () => void; onSaved: () => void }) => ReactNode;
}

// Config-driven panel behind the simple admin lookup tables (part grades, vehicle
// classes/makes, manufacturers, suppliers): a paginated table with an
// All/Active/Inactive filter, an add/edit dialog, and deactivate/reactivate row
// actions. Panels needing extra row actions or cross-context refreshes (shops,
// vehicle models, shop users) keep their own bespoke tables.
export function AdminLookupPanel<TItem extends { id: number; isActive: boolean }>({
  entityLabel,
  entityLabelPlural,
  columns,
  loadingRowCount = 5,
  listItems,
  softDeleteItem,
  updateItem,
  renderFormDialog,
}: AdminLookupPanelProps<TItem>) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [dialogTarget, setDialogTarget] = useState<TItem | 'new' | null>(null);

  const fetchPage = useCallback((page: number) => listItems({ page, limit: PAGE_SIZE }), [listItems]);
  const { data: items, meta, isLoading, error, setPage, refetch } = usePaginatedList(fetchPage);
  const visibleRows = filterByActiveState(items, activeFilter);
  const columnCount = columns.length + 1;

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title={`Could not load ${entityLabelPlural}`} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Status</span>
          <SegmentedControl label="Status filter" options={ACTIVE_FILTER_OPTIONS} value={activeFilter} onChange={setActiveFilter} />
        </div>
        <Button variant="primary" size="sm" onClick={() => setDialogTarget('new')}>
          Add {entityLabel}
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            {columns.map((column) => (
              <Th key={column.header} align={column.headerAlign}>
                {column.header}
              </Th>
            ))}
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: loadingRowCount }).map((_, index) => <LoadingRow key={index} columnCount={columnCount} />)
          ) : visibleRows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="p-0">
                <EmptyState
                  title={`No ${entityLabelPlural} match this filter`}
                  description={items.length === 0 ? `Add the first ${entityLabel} to get started.` : 'Try a different status filter.'}
                />
              </td>
            </tr>
          ) : (
            visibleRows.map((item) => (
              <Tr key={item.id} className={item.isActive ? undefined : 'opacity-60'}>
                {columns.map((column) => (
                  <Td key={column.header} align={column.align} mono={column.mono} className={column.cellClassName}>
                    {column.cell(item)}
                  </Td>
                ))}
                <Td align="right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget(item)}>
                      Edit
                    </Button>
                    <ActivationAction
                      isActive={item.isActive}
                      onDeactivate={() => softDeleteItem(item.id).then(refetch)}
                      onReactivate={() => updateItem(item.id, { isActive: true }).then(() => refetch())}
                    />
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

      {renderFormDialog({
        item: dialogTarget === 'new' || dialogTarget === null ? null : dialogTarget,
        isOpen: dialogTarget !== null,
        onClose: () => setDialogTarget(null),
        onSaved: refetch,
      })}
    </div>
  );
}
