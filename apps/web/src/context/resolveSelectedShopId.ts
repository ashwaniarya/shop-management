import type { Shop } from '@shop/shared';

export function resolveSelectedShopId(storedShopId: number | null, shops: Shop[]): number | null {
  const storedShopIdIsValid = storedShopId !== null && shops.some((shop) => shop.id === storedShopId);
  return (storedShopIdIsValid ? storedShopId : shops[0]?.id) ?? null;
}
