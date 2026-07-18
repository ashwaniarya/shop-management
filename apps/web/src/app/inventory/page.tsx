'use client';

import { useState } from 'react';

import { INITIAL_INVENTORY_FILTERS, InventoryFilterBar, type InventoryFiltersValue } from '@/components/inventory/InventoryFilterBar';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useShop } from '@/context/ShopContext';
import { useCategoriesLookup } from '@/hooks/useCategoriesLookup';

export default function InventoryPage() {
  const { shops, isLoading, selectedShopId } = useShop();
  const { categories } = useCategoriesLookup();
  const [filters, setFilters] = useState<InventoryFiltersValue>(INITIAL_INVENTORY_FILTERS);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Inventory</h1>
        <p className="mt-1 text-sm text-ink-500">Stock on hand for the selected shop.</p>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading shops…" />
      ) : shops.length === 0 ? (
        <EmptyState title="No shops configured yet" description="Add a shop from the Shops screen before tracking stock." />
      ) : selectedShopId === null ? (
        <EmptyState title="Select a shop" description="Choose a shop from the header above to see its inventory." />
      ) : (
        <>
          <InventoryFilterBar value={filters} onChange={setFilters} categories={categories} />
          <InventoryTable shopId={selectedShopId} filters={filters} />
        </>
      )}
    </div>
  );
}
