'use client';

import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { useDebouncedCommit } from '@/hooks/useDebouncedCommit';
import { buildCategoryOptions } from '@/lib/categoryTree';
import type { Category } from '@shop/shared';

export type BelowReorderFilter = 'all' | 'belowReorder';

export interface InventoryFiltersValue {
  q: string;
  categoryId: number | null;
  belowReorderFilter: BelowReorderFilter;
}

export const INITIAL_INVENTORY_FILTERS: InventoryFiltersValue = {
  q: '',
  categoryId: null,
  belowReorderFilter: 'all',
};

const BELOW_REORDER_OPTIONS: { value: BelowReorderFilter; label: string }[] = [
  { value: 'all', label: 'All stock' },
  { value: 'belowReorder', label: 'Below reorder' },
];

interface InventoryFilterBarProps {
  value: InventoryFiltersValue;
  onChange: (value: InventoryFiltersValue) => void;
  categories: Category[];
}

export function InventoryFilterBar({ value, onChange, categories }: InventoryFilterBarProps) {
  const [qDraft, setQDraft] = useDebouncedCommit(value.q, (q) => onChange({ ...value, q }));
  const categoryOptions = buildCategoryOptions(categories);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-md border border-ink-800 bg-ink-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        label="Search"
        placeholder="Part name…"
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
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-300">Stock level</span>
        <SegmentedControl
          label="Stock level"
          options={BELOW_REORDER_OPTIONS}
          value={value.belowReorderFilter}
          onChange={(belowReorderFilter) => onChange({ ...value, belowReorderFilter })}
        />
      </div>
    </div>
  );
}
