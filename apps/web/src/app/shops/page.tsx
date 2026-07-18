'use client';

import { useState } from 'react';

import { ShopsTable } from '@/components/admin/shops/ShopsTable';
import { ShopUsersPanel } from '@/components/admin/shops/ShopUsersPanel';
import type { Shop } from '@shop/shared';

export default function ShopsPage() {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Shops</h1>
        <p className="mt-1 text-sm text-ink-500">
          {selectedShop ? `Users at ${selectedShop.name}.` : 'Locations in this multi-shop network.'}
        </p>
      </div>

      {selectedShop ? (
        <ShopUsersPanel shop={selectedShop} onBack={() => setSelectedShop(null)} />
      ) : (
        <ShopsTable onManageUsers={setSelectedShop} />
      )}
    </div>
  );
}
