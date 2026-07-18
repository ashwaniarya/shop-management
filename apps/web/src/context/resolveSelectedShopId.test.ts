import { describe, expect, it } from 'vitest';

import type { Shop } from '@shop/shared';

import { resolveSelectedShopId } from './resolveSelectedShopId';

function buildShop(id: number): Shop {
  return {
    id,
    name: `Shop ${id}`,
    address: null,
    phone: null,
    gstin: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('resolveSelectedShopId', () => {
  it('keeps the stored id when it is present in the fetched shops', () => {
    expect(resolveSelectedShopId(42, [buildShop(41), buildShop(42)])).toBe(42);
  });

  it('falls back to the first shop when the stored id is no longer in the list', () => {
    expect(resolveSelectedShopId(99, [buildShop(41), buildShop(42)])).toBe(41);
  });

  it('defaults to the first shop when nothing was stored', () => {
    expect(resolveSelectedShopId(null, [buildShop(41), buildShop(42)])).toBe(41);
  });

  it('returns null when there are no shops', () => {
    expect(resolveSelectedShopId(99, [])).toBeNull();
  });
});
