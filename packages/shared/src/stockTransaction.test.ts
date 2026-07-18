// Unit test: pure logic, isolated schema (the sign rule refine)
import { describe, expect, it } from 'vitest';

import { stockTransactionCreateSchema } from './stockTransaction';

describe('stockTransactionCreateSchema', () => {
  it('accepts a PURCHASE with positive quantity and a unitPrice', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'PURCHASE',
      quantity: 10,
      unitPrice: 100,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a SALE with positive quantity and a unitPrice', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'SALE',
      quantity: 4,
      unitPrice: 150,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a SALE with a non-positive quantity', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'SALE',
      quantity: 0,
      unitPrice: 150,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a PURCHASE with a negative quantity', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'PURCHASE',
      quantity: -5,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a PURCHASE missing unitPrice', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'PURCHASE',
      quantity: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a SALE with a null unitPrice', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'SALE',
      quantity: 5,
      unitPrice: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts an ADJUSTMENT with a negative quantity and no unitPrice', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'ADJUSTMENT',
      quantity: -3,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an ADJUSTMENT with a positive quantity', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'ADJUSTMENT',
      quantity: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an ADJUSTMENT with a zero quantity', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'ADJUSTMENT',
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown type', () => {
    const result = stockTransactionCreateSchema.safeParse({
      partId: 1,
      userId: 1,
      type: 'RETURN',
      quantity: 2,
    });
    expect(result.success).toBe(false);
  });
});
