'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Shop } from '@shop/shared';

import { listShops } from '@/lib/api';

const SELECTED_SHOP_STORAGE_KEY = 'shop-management:selectedShopId';

function persistSelectedShopId(shopId: number | null): void {
  if (shopId === null) {
    window.localStorage.removeItem(SELECTED_SHOP_STORAGE_KEY);
  } else {
    window.localStorage.setItem(SELECTED_SHOP_STORAGE_KEY, String(shopId));
  }
}

interface ShopContextValue {
  shops: Shop[];
  isLoading: boolean;
  selectedShopId: number | null;
  setSelectedShopId: (shopId: number | null) => void;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShopId, setSelectedShopIdState] = useState<number | null>(null);

  useEffect(() => {
    const storedShopId = window.localStorage.getItem(SELECTED_SHOP_STORAGE_KEY);
    const storedShopIdAsNumber = storedShopId ? Number(storedShopId) : null;

    listShops({ limit: 100 })
      .then((page) => {
        setShops(page.data);
        // Default to the first shop when nothing was previously selected, so
        // shop-scoped screens always have a shopId to work with. Persisted
        // immediately so localStorage reflects the effective selection, not
        // just ones the user explicitly picked.
        const resolvedShopId = storedShopIdAsNumber ?? page.data[0]?.id ?? null;
        setSelectedShopIdState(resolvedShopId);
        persistSelectedShopId(resolvedShopId);
      })
      .catch(() => setShops([]))
      .finally(() => setIsLoading(false));
  }, []);

  function setSelectedShopId(shopId: number | null) {
    setSelectedShopIdState(shopId);
    persistSelectedShopId(shopId);
  }

  return (
    <ShopContext.Provider value={{ shops, isLoading, selectedShopId, setSelectedShopId }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
