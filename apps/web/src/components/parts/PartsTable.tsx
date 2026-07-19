'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { PartActiveBadge } from '@/components/PartActiveBadge';
import { PartGradeBadge } from '@/components/PartGradeBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingRow } from '@/components/ui/LoadingRow';
import { Pagination } from '@/components/ui/Pagination';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { useFitmentSummaries } from '@/hooks/useFitmentSummaries';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { listParts } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Category, Manufacturer, PartGrade } from '@shop/shared';

import type { PartsFiltersValue } from './PartsFilterBar';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 8;

interface PartsTableProps {
  filters: PartsFiltersValue;
  categoriesById: Map<number, Category>;
  manufacturersById: Map<number, Manufacturer>;
  partGrades: PartGrade[];
  partGradesById: Map<number, PartGrade>;
}

export function PartsTable({ filters, categoriesById, manufacturersById, partGrades, partGradesById }: PartsTableProps) {
  const router = useRouter();

  const fetchPage = useCallback(
    (page: number) =>
      listParts({
        page,
        limit: PAGE_SIZE,
        q: filters.q || undefined,
        categoryId: filters.categoryId ?? undefined,
        manufacturerId: filters.manufacturerId ?? undefined,
        gradeId: filters.gradeId ?? undefined,
        isActive: filters.activeFilter === 'all' ? undefined : filters.activeFilter === 'active',
        vehicleClassId: filters.vehicle.classId ?? undefined,
        vehicleMakeId: filters.vehicle.makeId ?? undefined,
        vehicleModelId: filters.vehicle.modelId ?? undefined,
      }),
    [filters],
  );

  const { data: parts, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const { summaryByPartId, loadingPartIds } = useFitmentSummaries(parts.map((part) => part.id));

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load parts" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <thead>
          <tr>
            <Th>SKU</Th>
            <Th>Name</Th>
            <Th>Manufacturer</Th>
            <Th>Category</Th>
            <Th>Grade</Th>
            <Th align="right">MRP</Th>
            <Th>Fitment</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
          ) : parts.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState
                  title="No parts match these filters"
                  description="Try widening the search or clearing a filter."
                />
              </td>
            </tr>
          ) : (
            parts.map((part) => {
              const grade = part.gradeId === null ? undefined : partGradesById.get(part.gradeId);
              return (
                <Tr key={part.id} onClick={() => router.push(`/parts/${part.id}`)}>
                  <Td mono>
                    <Link
                      href={`/parts/${part.id}`}
                      className="text-ink-100 hover:text-accent-400"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {part.sku}
                    </Link>
                  </Td>
                  <Td>{part.name}</Td>
                  <Td>{manufacturersById.get(part.manufacturerId)?.name ?? `#${part.manufacturerId}`}</Td>
                  <Td>{categoriesById.get(part.categoryId)?.name ?? `#${part.categoryId}`}</Td>
                  <Td>{grade ? <PartGradeBadge grade={grade} partGrades={partGrades} /> : '—'}</Td>
                  <Td align="right" mono>
                    {formatCurrency(part.mrp)}
                  </Td>
                  <Td className="text-ink-400">
                    {loadingPartIds.has(part.id) ? (
                      <span className="animate-skeleton inline-block h-3 w-20 rounded-[3px] bg-ink-800" />
                    ) : (
                      (summaryByPartId.get(part.id) ?? '—')
                    )}
                  </Td>
                  <Td>
                    <PartActiveBadge isActive={part.isActive} />
                  </Td>
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
