'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Shop } from '@shop/shared';

import { listShops } from '@/lib/api';

import { useAuth } from './AuthContext';

interface ShopContextValue {
  shops: Shop[];
  isLoading: boolean;
  selectedShopId: number | null;
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

// Each user belongs to exactly one shop, so selectedShopId is pinned to
// useAuth().user.shopId rather than picked/persisted client-side. ShopProvider is
// only ever mounted once AppGate confirms the user is authenticated, so `user`
// here is never null in practice; the `?? null` fallback is just type-level
// defensiveness. `shops` still loads the full list for lookups like the header's
// shop name and the admin Shops table (true multi-shop switching is out of scope).
export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshShops = useCallback(async () => {
    const page = await listShops({ limit: 100 });
    setShops(page.data);
  }, []);

  useEffect(() => {
    listShops({ limit: 100 })
      .then((page) => setShops(page.data))
      .catch((error) => {
        console.error('Failed to load shops', error);
        setShops([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ShopContext.Provider value={{ shops, isLoading, selectedShopId: user?.shopId ?? null, refreshShops }}>
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
