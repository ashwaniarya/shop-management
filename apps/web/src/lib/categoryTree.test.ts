import { describe, expect, it } from 'vitest';

import type { Category } from '@shop/shared';

import { buildCategoryOptions } from './categoryTree';

function buildCategory(id: number, name: string, parentCategoryId: number | null, displayOrder = 0): Category {
  return { id, name, parentCategoryId, displayOrder };
}

describe('buildCategoryOptions', () => {
  it('orders root categories before their children, indenting each level', () => {
    const categories: Category[] = [
      buildCategory(3, 'Batteries', 1, 2),
      buildCategory(1, 'Electrical', null, 1),
      buildCategory(2, 'Starter Motors', 1, 1),
      buildCategory(4, 'Engine', null, 2),
      buildCategory(5, 'Filters', 4, 1),
    ];

    expect(buildCategoryOptions(categories)).toEqual([
      { id: 1, label: 'Electrical', depth: 0 },
      { id: 2, label: '— Starter Motors', depth: 1 },
      { id: 3, label: '— Batteries', depth: 1 },
      { id: 4, label: 'Engine', depth: 0 },
      { id: 5, label: '— Filters', depth: 1 },
    ]);
  });

  it('returns an empty list for no categories', () => {
    expect(buildCategoryOptions([])).toEqual([]);
  });
});
