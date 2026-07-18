import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseFormValues } from './useZodSubmit';

const schema = z.object({
  name: z.string().min(1, 'name is required'),
  quantity: z.number().positive('quantity must be positive'),
});

describe('parseFormValues', () => {
  it('returns ok with the parsed data for valid values', () => {
    const result = parseFormValues(schema, { name: 'Starter Motor', quantity: 4 });
    expect(result).toEqual({ ok: true, data: { name: 'Starter Motor', quantity: 4 } });
  });

  it('returns per-field errors for invalid values', () => {
    const result = parseFormValues(schema, { name: '', quantity: -2 });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { name: 'name is required', quantity: 'quantity must be positive' },
    });
  });

  it('applies schema transforms and defaults to the returned data', () => {
    const defaultingSchema = z.object({ unitOfMeasure: z.string().default('piece') });
    const result = parseFormValues(defaultingSchema, {});
    expect(result).toEqual({ ok: true, data: { unitOfMeasure: 'piece' } });
  });

  it('routes cross-field refine issues to the refined field', () => {
    const refinedSchema = z
      .object({ type: z.string(), unitPrice: z.number().optional() })
      .superRefine((value, ctx) => {
        if (value.type === 'SALE' && value.unitPrice === undefined) {
          ctx.addIssue({ code: 'custom', path: ['unitPrice'], message: 'unitPrice is required for SALE' });
        }
      });
    const result = parseFormValues(refinedSchema, { type: 'SALE' });
    expect(result).toEqual({ ok: false, fieldErrors: { unitPrice: 'unitPrice is required for SALE' } });
  });
});
