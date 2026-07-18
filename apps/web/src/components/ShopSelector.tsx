'use client';

import { useShop } from '@/context/ShopContext';

import { Select } from './ui/Select';

export function ShopSelector() {
  const { shops, isLoading, selectedShopId, setSelectedShopId } = useShop();

  if (isLoading) {
    return <span className="font-mono text-xs text-ink-500">Loading shops…</span>;
  }

  if (shops.length === 0) {
    return <span className="font-mono text-xs text-ink-500">No shops found</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tracking-[0.14em] text-ink-500 uppercase">Shop</span>
      <Select
        aria-label="Selected shop"
        className="min-w-48"
        value={selectedShopId ?? ''}
        onChange={(event) => setSelectedShopId(Number(event.target.value))}
      >
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
