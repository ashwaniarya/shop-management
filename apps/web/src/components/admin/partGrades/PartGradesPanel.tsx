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
import { listPartGrades, softDeletePartGrade, updatePartGrade } from '@/lib/api';
import type { PartGrade } from '@shop/shared';

import { PartGradeFormDialog } from './PartGradeFormDialog';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 4;

export function PartGradesPanel() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [dialogTarget, setDialogTarget] = useState<PartGrade | 'new' | null>(null);

  const fetchPage = useCallback((page: number) => listPartGrades({ page, limit: PAGE_SIZE }), []);
  const { data: partGrades, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const visibleRows = filterByActiveState(partGrades, activeFilter);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load grades" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Status</span>
          <SegmentedControl label="Status filter" options={ACTIVE_FILTER_OPTIONS} value={activeFilter} onChange={setActiveFilter} />
        </div>
        <Button variant="primary" size="sm" onClick={() => setDialogTarget('new')}>
          Add grade
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th align="right">Display order</Th>
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
                  title="No grades match this filter"
                  description={partGrades.length === 0 ? 'Add the first grade to get started.' : 'Try a different status filter.'}
                />
              </td>
            </tr>
          ) : (
            visibleRows.map((partGrade) => (
              <Tr key={partGrade.id} className={partGrade.isActive ? undefined : 'opacity-60'}>
                <Td>{partGrade.name}</Td>
                <Td align="right" mono className="text-ink-400">
                  {partGrade.displayOrder}
                </Td>
                <Td>
                  <ActiveBadge isActive={partGrade.isActive} />
                </Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget(partGrade)}>
                      Edit
                    </Button>
                    <ActivationAction
                      isActive={partGrade.isActive}
                      onDeactivate={() => softDeletePartGrade(partGrade.id).then(refetch)}
                      onReactivate={() => updatePartGrade(partGrade.id, { isActive: true }).then(() => refetch())}
                    />
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

      <PartGradeFormDialog
        partGrade={dialogTarget === 'new' || dialogTarget === null ? null : dialogTarget}
        isOpen={dialogTarget !== null}
        onClose={() => setDialogTarget(null)}
        onSaved={refetch}
      />
    </div>
  );
}
