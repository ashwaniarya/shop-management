'use client';

import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { VehicleCascadeSelect, type VehicleCascadeValue } from '@/components/ui/VehicleCascadeSelect';
import { useDebouncedCommit } from '@/hooks/useDebouncedCommit';
import { useVehicleCascadeData } from '@/hooks/useVehicleCascadeData';
import { buildCategoryOptions } from '@/lib/categoryTree';
import type { Category, Manufacturer, PartGrade } from '@shop/shared';

export type ActiveFilter = 'all' | 'active' | 'inactive';

export interface PartsFiltersValue {
  q: string;
  categoryId: number | null;
  manufacturerId: number | null;
  gradeId: number | null;
  vehicle: VehicleCascadeValue;
  activeFilter: ActiveFilter;
}

export const INITIAL_PARTS_FILTERS: PartsFiltersValue = {
  q: '',
  categoryId: null,
  manufacturerId: null,
  gradeId: null,
  vehicle: { classId: null, makeId: null, modelId: null },
  activeFilter: 'all',
};

const ACTIVE_FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface PartsFilterBarProps {
  value: PartsFiltersValue;
  onChange: (value: PartsFiltersValue) => void;
  categories: Category[];
  manufacturers: Manufacturer[];
  partGrades: PartGrade[];
}

export function PartsFilterBar({ value, onChange, categories, manufacturers, partGrades }: PartsFilterBarProps) {
  const [qDraft, setQDraft] = useDebouncedCommit(value.q, (q) => onChange({ ...value, q }));
  const { vehicleClasses, vehicleMakes, vehicleModels } = useVehicleCascadeData();
  const categoryOptions = buildCategoryOptions(categories);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-ink-800 bg-ink-900 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Search"
          placeholder="Name or description…"
          value={qDraft}
          onChange={(event) => setQDraft(event.target.value)}
        />
        <Select
          label="Category"
          value={value.categoryId ?? ''}
          onChange={(event) =>
            onChange({ ...value, categoryId: event.target.value === '' ? null : Number(event.target.value) })
          }
        >
          <option value="">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          label="Manufacturer"
          value={value.manufacturerId ?? ''}
          onChange={(event) =>
            onChange({ ...value, manufacturerId: event.target.value === '' ? null : Number(event.target.value) })
          }
        >
          <option value="">All manufacturers</option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </Select>
        <Select
          label="Grade"
          value={value.gradeId ?? ''}
          onChange={(event) =>
            onChange({ ...value, gradeId: event.target.value === '' ? null : Number(event.target.value) })
          }
        >
          <option value="">All grades</option>
          {partGrades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </Select>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Status</span>
          <SegmentedControl
            label="Active state"
            options={ACTIVE_FILTER_OPTIONS}
            value={value.activeFilter}
            onChange={(activeFilter) => onChange({ ...value, activeFilter })}
          />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-300">Vehicle fitment</p>
        <VehicleCascadeSelect
          idPrefix="parts-filter-vehicle"
          vehicleClasses={vehicleClasses}
          vehicleMakes={vehicleMakes}
          vehicleModels={vehicleModels}
          value={value.vehicle}
          onChange={(vehicle) => onChange({ ...value, vehicle })}
        />
      </div>
    </div>
  );
}
