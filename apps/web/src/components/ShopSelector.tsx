'use client';

import { useShop } from '@/context/ShopContext';

export function ShopSelector() {
  const { shops, isLoading, selectedShopId, setSelectedShopId } = useShop();

  if (isLoading) {
    return <span className="text-sm text-gray-400">Loading shops…</span>;
  }

  if (shops.length === 0) {
    return <span className="text-sm text-gray-400">No shops found</span>;
  }

  return (
    <select
      aria-label="Selected shop"
      className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700"
      value={selectedShopId ?? ''}
      onChange={(event) => setSelectedShopId(Number(event.target.value))}
    >
      {shops.map((shop) => (
        <option key={shop.id} value={shop.id}>
          {shop.name}
        </option>
      ))}
    </select>
  );
}
