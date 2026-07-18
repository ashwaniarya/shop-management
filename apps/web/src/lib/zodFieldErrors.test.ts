import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getFieldErrors } from './zodFieldErrors';

const schema = z.object({
  quantity: z.number().positive('quantity must be positive'),
  unitPrice: z.number({ message: 'unitPrice is required' }),
});

describe('getFieldErrors', () => {
  it('maps each failing field to its first issue message', () => {
    const result = schema.safeParse({ quantity: -1, unitPrice: undefined });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(getFieldErrors(result.error)).toEqual({
      quantity: 'quantity must be positive',
      unitPrice: 'unitPrice is required',
    });
  });

  it('keeps only the first message when a field fails more than one rule', () => {
    const multiIssueSchema = z.object({
      quantity: z.number().positive().max(10),
    });
    const result = multiIssueSchema.safeParse({ quantity: -50 });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(Object.keys(getFieldErrors(result.error))).toEqual(['quantity']);
  });

  it('groups whole-object (path-less) issues under _form', () => {
    const refinedSchema = z
      .object({ a: z.number(), b: z.number() })
      .refine((value) => value.a < value.b, { message: 'a must be less than b' });
    const result = refinedSchema.safeParse({ a: 5, b: 1 });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(getFieldErrors(result.error)).toEqual({ _form: 'a must be less than b' });
  });
});
