// Unit test: pure logic, isolated schema (strict rejection of the excluded quantityOnHand field)
import { describe, expect, it } from 'vitest';

import { inventoryItemUpdateSchema } from './inventoryItem';

describe('inventoryItemUpdateSchema', () => {
  it('accepts the four writable settings fields', () => {
    const result = inventoryItemUpdateSchema.safeParse({
      reorderLevel: 5,
      costPrice: 100,
      sellingPrice: 150,
      storageLocation: 'Rack A1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (no settings changed)', () => {
    expect(inventoryItemUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts explicit nulls for the nullable settings fields', () => {
    const result = inventoryItemUpdateSchema.safeParse({
      reorderLevel: null,
      costPrice: null,
      sellingPrice: null,
      storageLocation: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload that includes quantityOnHand, since it can only change via stock transactions', () => {
    const result = inventoryItemUpdateSchema.safeParse({ quantityOnHand: 999 });
    expect(result.success).toBe(false);
  });

  it('rejects any other unrecognized field', () => {
    const result = inventoryItemUpdateSchema.safeParse({ reorderLevel: 5, unexpectedField: 'x' });
    expect(result.success).toBe(false);
  });
});
