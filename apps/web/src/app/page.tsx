'use client';

import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { LowStockPanel } from '@/components/dashboard/LowStockPanel';
import { RecentMovementsPanel } from '@/components/dashboard/RecentMovementsPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useShop } from '@/context/ShopContext';

export default function DashboardPage() {
  const { shops, isLoading, selectedShopId } = useShop();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">This shop&rsquo;s activity at a glance.</p>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading shops…" />
      ) : shops.length === 0 ? (
        <EmptyState
          title="No shops configured yet"
          description="Add a shop from the Shops screen before tracking sales, purchases or stock."
        />
      ) : selectedShopId === null ? (
        <EmptyState title="Select a shop" description="Choose a shop from the header above to see its dashboard." />
      ) : (
        <>
          <DashboardStats shopId={selectedShopId} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LowStockPanel shopId={selectedShopId} />
            <RecentMovementsPanel shopId={selectedShopId} />
          </div>
        </>
      )}
    </div>
  );
}
