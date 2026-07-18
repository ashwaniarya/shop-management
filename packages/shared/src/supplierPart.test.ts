// Unit test: pure logic, isolated schema (Update intentionally omits supplierId, unlike Create)
import { describe, expect, it } from 'vitest';

import { supplierPartCreateSchema, supplierPartUpdateSchema } from './supplierPart';

describe('supplierPartCreateSchema', () => {
  it('defaults isPreferred to false when omitted', () => {
    const result = supplierPartCreateSchema.parse({ supplierId: 1 });
    expect(result.isPreferred).toBe(false);
  });

  it('requires supplierId', () => {
    expect(supplierPartCreateSchema.safeParse({}).success).toBe(false);
  });
});

describe('supplierPartUpdateSchema', () => {
  it('accepts a partial update of supplierPartNumber and isPreferred only', () => {
    const result = supplierPartUpdateSchema.safeParse({ isPreferred: true });
    expect(result.success).toBe(true);
  });

  it('strips supplierId rather than reassigning it, since the supplier link cannot change via update', () => {
    const result = supplierPartUpdateSchema.safeParse({ supplierId: 2, isPreferred: true });
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty('supplierId');
  });
});
