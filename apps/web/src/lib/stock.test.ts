import { describe, expect, it } from 'vitest';

import { isBelowReorderLevel } from './stock';

describe('isBelowReorderLevel', () => {
  it('is true when quantity is below the reorder level', () => {
    expect(isBelowReorderLevel(2, 5)).toBe(true);
  });

  it('is true when quantity exactly equals the reorder level', () => {
    expect(isBelowReorderLevel(5, 5)).toBe(true);
  });

  it('is false when quantity is above the reorder level', () => {
    expect(isBelowReorderLevel(6, 5)).toBe(false);
  });

  it('is false when no reorder level is set', () => {
    expect(isBelowReorderLevel(0, null)).toBe(false);
  });
});
