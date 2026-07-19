'use client';

import { useShop } from '@/context/ShopContext';

export function ShopIndicator() {
  const { shops, isLoading, selectedShopId } = useShop();
  const shopName = shops.find((shop) => shop.id === selectedShopId)?.name;

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <span className="font-mono text-[10px] tracking-[0.14em] text-ink-500 uppercase">Shop</span>
      <span className="text-sm font-medium text-ink-100">{isLoading ? 'Loading…' : (shopName ?? 'Unknown shop')}</span>
    </div>
  );
}
