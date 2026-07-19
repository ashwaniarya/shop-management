'use client';

import { useCallback, useEffect, useState } from 'react';

import { CrossReferencesSection } from '@/components/partDetail/CrossReferencesSection';
import { FitmentsSection } from '@/components/partDetail/FitmentsSection';
import { GradesSection } from '@/components/partDetail/GradesSection';
import { MovementHistorySection } from '@/components/partDetail/MovementHistorySection';
import { PartHeaderCard } from '@/components/partDetail/PartHeaderCard';
import { StockSection } from '@/components/partDetail/StockSection';
import { SuppliersSection } from '@/components/partDetail/SuppliersSection';
import { PartFormDialog } from '@/components/parts/PartFormDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useShop } from '@/context/ShopContext';
import { useAsync } from '@/hooks/useAsync';
import { useCategoriesLookup } from '@/hooks/useCategoriesLookup';
import { useManufacturersLookup } from '@/hooks/useManufacturersLookup';
import { usePartGradesLookup } from '@/hooks/usePartGradesLookup';
import { getPart360 } from '@/lib/api';

type TabKey = 'fitments' | 'grades' | 'crossReferences' | 'suppliers' | 'stock' | 'history';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'fitments', label: 'Fitments' },
  { key: 'grades', label: 'Grades' },
  { key: 'crossReferences', label: 'Cross-references' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'stock', label: 'Stock' },
  { key: 'history', label: 'Movement history' },
];

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((tab) => tab.key === value);
}

export function PartDetailView({ partId }: { partId: number }) {
  const fetcher = useCallback(() => getPart360(partId, ['fitments', 'crossReferences', 'suppliers']), [partId]);
  const { data: part, isLoading, error, retry: refetchPart } = useAsync(fetcher);
  const { categories, categoriesById } = useCategoriesLookup();
  const { manufacturers, manufacturersById } = useManufacturersLookup();
  const { partGrades, partGradesById } = usePartGradesLookup();
  const { selectedShopId } = useShop();

  const [activeTab, setActiveTab] = useState<TabKey>('fitments');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Lets links from the dashboard/ledger deep-link into a specific tab (e.g.
  // "?tab=stock") without pulling in next/navigation's useSearchParams, which would
  // otherwise force a Suspense boundary around this whole view.
  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    if (isTabKey(queryTab)) {
      setActiveTab(queryTab);
    }
  }, []);

  if (isLoading) {
    return <LoadingBlock label="Loading part…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={refetchPart} title="Could not load this part" />;
  }
  if (!part) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PartHeaderCard
        part={part}
        manufacturerName={manufacturersById.get(part.manufacturerId)?.name ?? `#${part.manufacturerId}`}
        categoryName={categoriesById.get(part.categoryId)?.name ?? `#${part.categoryId}`}
        grade={part.gradeId === null ? null : (partGradesById.get(part.gradeId) ?? null)}
        partGrades={partGrades}
        onEdit={() => setIsEditDialogOpen(true)}
      />

      <PartFormDialog
        part={part}
        manufacturers={manufacturers}
        categories={categories}
        partGrades={partGrades}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSaved={refetchPart}
      />

      <div>
        <div role="tablist" aria-label="Part detail sections" className="flex gap-1 overflow-x-auto border-b border-ink-800">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px shrink-0 rounded-t-sm border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-ink-50'
                  : 'border-transparent text-ink-500 hover:text-ink-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="pt-5">
          {activeTab === 'fitments' ? (
            <FitmentsSection partId={partId} fitments={part.fitments ?? []} onMutated={refetchPart} />
          ) : activeTab === 'grades' ? (
            <GradesSection partId={partId} shopId={selectedShopId} partGrades={partGrades} />
          ) : activeTab === 'crossReferences' ? (
            <CrossReferencesSection partId={partId} crossReferences={part.crossReferences ?? []} onMutated={refetchPart} />
          ) : activeTab === 'suppliers' ? (
            <SuppliersSection partId={partId} suppliers={part.suppliers ?? []} onMutated={refetchPart} />
          ) : activeTab === 'stock' ? (
            selectedShopId === null ? (
              <EmptyState title="Select a shop" description="Choose a shop from the header above to see stock for this part." />
            ) : (
              <StockSection partId={partId} shopId={selectedShopId} />
            )
          ) : selectedShopId === null ? (
            <EmptyState title="Select a shop" description="Choose a shop from the header above to see movement history." />
          ) : (
            <MovementHistorySection partId={partId} shopId={selectedShopId} />
          )}
        </div>
      </div>
    </div>
  );
}
