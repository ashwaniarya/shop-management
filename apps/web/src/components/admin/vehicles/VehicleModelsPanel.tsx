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
import { Select } from '@/components/ui/Select';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useVehicleCascadeData } from '@/hooks/useVehicleCascadeData';
import { listVehicleModels, softDeleteVehicleModel, updateVehicleModel } from '@/lib/api';
import type { VehicleModel } from '@shop/shared';

import { VehicleModelFormDialog } from './VehicleModelFormDialog';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 5;

export function VehicleModelsPanel() {
  const { vehicleClasses, vehicleMakes } = useVehicleCascadeData();
  const vehicleClassesById = new Map(vehicleClasses.map((vehicleClass) => [vehicleClass.id, vehicleClass]));
  const vehicleMakesById = new Map(vehicleMakes.map((vehicleMake) => [vehicleMake.id, vehicleMake]));

  const [makeFilter, setMakeFilter] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [dialogTarget, setDialogTarget] = useState<VehicleModel | 'new' | null>(null);

  const fetchPage = useCallback(
    (page: number) =>
      listVehicleModels({
        page,
        limit: PAGE_SIZE,
        makeId: makeFilter ?? undefined,
        classId: classFilter ?? undefined,
      }),
    [makeFilter, classFilter],
  );
  const { data: vehicleModels, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const visibleRows = filterByActiveState(vehicleModels, activeFilter);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load vehicle models" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Make"
            value={makeFilter ?? ''}
            onChange={(event) => setMakeFilter(event.target.value === '' ? null : Number(event.target.value))}
          >
            <option value="">All makes</option>
            {vehicleMakes.map((make) => (
              <option key={make.id} value={make.id}>
                {make.name}
              </option>
            ))}
          </Select>
          <Select
            label="Class"
            value={classFilter ?? ''}
            onChange={(event) => setClassFilter(event.target.value === '' ? null : Number(event.target.value))}
          >
            <option value="">All classes</option>
            {vehicleClasses.map((vehicleClass) => (
              <option key={vehicleClass.id} value={vehicleClass.id}>
                {vehicleClass.name}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-300">Status</span>
            <SegmentedControl label="Status filter" options={ACTIVE_FILTER_OPTIONS} value={activeFilter} onChange={setActiveFilter} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => setDialogTarget('new')}>
            Add vehicle model
          </Button>
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Make</Th>
            <Th>Class</Th>
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
                  title="No vehicle models match these filters"
                  description={vehicleModels.length === 0 ? 'Add the first vehicle model to get started.' : 'Try widening the search or clearing a filter.'}
                />
              </td>
            </tr>
          ) : (
            visibleRows.map((vehicleModel) => (
              <Tr key={vehicleModel.id} className={vehicleModel.isActive ? undefined : 'opacity-60'}>
                <Td>{vehicleModel.name}</Td>
                <Td className="text-ink-400">{vehicleMakesById.get(vehicleModel.vehicleMakeId)?.name ?? `#${vehicleModel.vehicleMakeId}`}</Td>
                <Td className="text-ink-400">{vehicleClassesById.get(vehicleModel.vehicleClassId)?.name ?? `#${vehicleModel.vehicleClassId}`}</Td>
                <Td>
                  <ActiveBadge isActive={vehicleModel.isActive} />
                </Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget(vehicleModel)}>
                      Edit
                    </Button>
                    <ActivationAction
                      isActive={vehicleModel.isActive}
                      onDeactivate={() => softDeleteVehicleModel(vehicleModel.id).then(refetch)}
                      onReactivate={() => updateVehicleModel(vehicleModel.id, { isActive: true }).then(() => refetch())}
                    />
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

      <VehicleModelFormDialog
        vehicleModel={dialogTarget === 'new' || dialogTarget === null ? null : dialogTarget}
        vehicleClasses={vehicleClasses}
        vehicleMakes={vehicleMakes}
        isOpen={dialogTarget !== null}
        onClose={() => setDialogTarget(null)}
        onSaved={refetch}
      />
    </div>
  );
}
