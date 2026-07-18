'use client';

import { useState } from 'react';

import { INITIAL_PARTS_FILTERS, PartsFilterBar, type PartsFiltersValue } from '@/components/parts/PartsFilterBar';
import { PartSearchPanel } from '@/components/parts/PartSearchPanel';
import { PartsTable } from '@/components/parts/PartsTable';
import { useCategoriesLookup } from '@/hooks/useCategoriesLookup';
import { useManufacturersLookup } from '@/hooks/useManufacturersLookup';

export default function PartsPage() {
  const [filters, setFilters] = useState<PartsFiltersValue>(INITIAL_PARTS_FILTERS);
  const { categories, categoriesById } = useCategoriesLookup();
  const { manufacturers, manufacturersById } = useManufacturersLookup();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Parts catalog</h1>
        <p className="mt-1 text-sm text-ink-500">Search by number, or browse and filter the full catalog.</p>
      </div>

      <PartSearchPanel />

      <PartsFilterBar value={filters} onChange={setFilters} categories={categories} manufacturers={manufacturers} />

      <PartsTable filters={filters} categoriesById={categoriesById} manufacturersById={manufacturersById} />
    </div>
  );
}
