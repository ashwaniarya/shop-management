'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { StockTransactionType } from '@shop/shared';

export type TransactionTypeFilter = 'all' | StockTransactionType;

export interface TransactionsFiltersValue {
  type: TransactionTypeFilter;
  from: string;
  to: string;
  partId: number | null;
}

export const INITIAL_TRANSACTIONS_FILTERS: TransactionsFiltersValue = {
  type: 'all',
  from: '',
  to: '',
  partId: null,
};

const TYPE_OPTIONS: { value: TransactionTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'SALE', label: 'Sale' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
];

interface TransactionsFilterBarProps {
  value: TransactionsFiltersValue;
  onChange: (value: TransactionsFiltersValue) => void;
  filteredPartLabel: string | null;
}

export function TransactionsFilterBar({ value, onChange, filteredPartLabel }: TransactionsFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Type</span>
          <SegmentedControl label="Transaction type" options={TYPE_OPTIONS} value={value.type} onChange={(type) => onChange({ ...value, type })} />
        </div>
        <Input
          label="From"
          type="date"
          value={value.from}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
        <Input label="To" type="date" value={value.to} onChange={(event) => onChange({ ...value, to: event.target.value })} />
      </div>

      {value.partId !== null ? (
        <div className="flex items-center gap-2 rounded-sm border border-accent-700 bg-accent-950 px-3 py-1.5 text-xs text-accent-300">
          <span>
            Filtered to part <span className="font-mono">{filteredPartLabel ?? `#${value.partId}`}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...value, partId: null })}>
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
