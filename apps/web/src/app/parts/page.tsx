'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { INITIAL_PARTS_FILTERS, PartsFilterBar, type PartsFiltersValue } from '@/components/parts/PartsFilterBar';
import { PartFormDialog } from '@/components/parts/PartFormDialog';
import { PartSearchPanel } from '@/components/parts/PartSearchPanel';
import { PartsTable } from '@/components/parts/PartsTable';
import { Button } from '@/components/ui/Button';
import { useCategoriesLookup } from '@/hooks/useCategoriesLookup';
import { useManufacturersLookup } from '@/hooks/useManufacturersLookup';
import { usePartGradesLookup } from '@/hooks/usePartGradesLookup';

export default function PartsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<PartsFiltersValue>(INITIAL_PARTS_FILTERS);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { categories, categoriesById } = useCategoriesLookup();
  const { manufacturers, manufacturersById } = useManufacturersLookup();
  const { partGrades, partGradesById } = usePartGradesLookup();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Parts catalog</h1>
          <p className="mt-1 text-sm text-ink-500">Search by number, or browse and filter the full catalog.</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
          New part
        </Button>
      </div>

      <PartSearchPanel />

      <PartsFilterBar
        value={filters}
        onChange={setFilters}
        categories={categories}
        manufacturers={manufacturers}
        partGrades={partGrades}
      />

      <PartsTable
        filters={filters}
        categoriesById={categoriesById}
        manufacturersById={manufacturersById}
        partGrades={partGrades}
        partGradesById={partGradesById}
      />

      <PartFormDialog
        part={null}
        manufacturers={manufacturers}
        categories={categories}
        partGrades={partGrades}
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSaved={(createdPart) => router.push(`/parts/${createdPart.id}`)}
      />
    </div>
  );
}
