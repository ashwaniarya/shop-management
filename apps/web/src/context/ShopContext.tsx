'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Shop } from '@shop/shared';

import { listShops } from '@/lib/api';

import { resolveSelectedShopId } from './resolveSelectedShopId';

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
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShopId, setSelectedShopIdState] = useState<number | null>(null);

  // Re-fetches the shop list and re-resolves the selection against it, so admin
  // mutations (create/rename/deactivate) show up in the header selector without a
  // reload. The functional update reads the latest selection rather than closing
  // over a stale one, keeping this callback's identity stable across renders.
  const refreshShops = useCallback(async () => {
    const page = await listShops({ limit: 100 });
    setShops(page.data);
    setSelectedShopIdState((currentShopId) => {
      const resolvedShopId = resolveSelectedShopId(currentShopId, page.data);
      persistSelectedShopId(resolvedShopId);
      return resolvedShopId;
    });
  }, []);

  useEffect(() => {
    const storedShopId = window.localStorage.getItem(SELECTED_SHOP_STORAGE_KEY);
    const storedShopIdAsNumber = storedShopId ? Number(storedShopId) : null;

    listShops({ limit: 100 })
      .then((page) => {
        setShops(page.data);
        // Falls back to the first shop when nothing was stored OR the stored id
        // no longer exists (e.g. after a dev reseed), and persists the resolved
        // value so localStorage always reflects the effective selection.
        const resolvedShopId = resolveSelectedShopId(storedShopIdAsNumber, page.data);
        setSelectedShopIdState(resolvedShopId);
        persistSelectedShopId(resolvedShopId);
      })
      .catch((error) => {
        console.error('Failed to load shops', error);
        setShops([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  function setSelectedShopId(shopId: number | null) {
    setSelectedShopIdState(shopId);
    persistSelectedShopId(shopId);
  }

  return (
    <ShopContext.Provider value={{ shops, isLoading, selectedShopId, setSelectedShopId, refreshShops }}>
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
