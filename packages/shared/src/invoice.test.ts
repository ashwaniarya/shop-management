// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { formatInvoiceNumber, invoiceCreateSchema } from './invoice';

describe('formatInvoiceNumber', () => {
  it('pads a single-digit sequence to 6 digits', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-000001');
  });

  it('pads a 3-digit sequence to 6 digits', () => {
    expect(formatInvoiceNumber(123)).toBe('INV-000123');
  });

  it('does not truncate a sequence longer than 6 digits', () => {
    expect(formatInvoiceNumber(1234567)).toBe('INV-1234567');
  });
});

describe('invoiceCreateSchema', () => {
  const validLine = { partId: 1, quantity: 2, unitPrice: 100 };

  it('accepts a valid payload with one line and customer details', () => {
    const result = invoiceCreateSchema.safeParse({
      customerName: 'Walk-in',
      customerPhone: '9999999999',
      notes: null,
      lines: [validLine],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid payload with the optional fields omitted', () => {
    const result = invoiceCreateSchema.safeParse({ lines: [validLine] });
    expect(result.success).toBe(true);
  });

  it('rejects an empty lines array', () => {
    const result = invoiceCreateSchema.safeParse({ lines: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a line with a zero quantity', () => {
    const result = invoiceCreateSchema.safeParse({
      lines: [{ partId: 1, quantity: 0, unitPrice: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a line with a negative quantity', () => {
    const result = invoiceCreateSchema.safeParse({
      lines: [{ partId: 1, quantity: -1, unitPrice: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a line with a negative unitPrice', () => {
    const result = invoiceCreateSchema.safeParse({
      lines: [{ partId: 1, quantity: 1, unitPrice: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it('does not require userId, since the salesman comes from req.user', () => {
    const result = invoiceCreateSchema.safeParse({ lines: [validLine] });
    expect(result.success).toBe(true);
  });

  it('strips a userId if one is passed, rather than accepting it as part of the payload', () => {
    const result = invoiceCreateSchema.parse({ lines: [validLine], userId: 999 });
    expect(result).not.toHaveProperty('userId');
  });
});
