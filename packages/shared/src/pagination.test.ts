// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { listResponseSchema, metaSchema, paginationQuerySchema } from './pagination';
import { manufacturerSchema } from './manufacturer';

describe('paginationQuerySchema', () => {
  it('defaults page to 1 and limit to 20 when omitted', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('coerces string query values to numbers', () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('rejects a page below 1', () => {
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('rejects a limit below 1', () => {
    expect(paginationQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });

  it('rejects a limit above 100', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('accepts a limit at the boundary of 100', () => {
    expect(paginationQuerySchema.safeParse({ limit: '100' }).success).toBe(true);
  });

  it('rejects a non-integer page', () => {
    expect(paginationQuerySchema.safeParse({ page: '1.5' }).success).toBe(false);
  });
});

describe('metaSchema', () => {
  it('accepts a page/limit/total triple', () => {
    expect(metaSchema.parse({ page: 1, limit: 20, total: 42 })).toEqual({ page: 1, limit: 20, total: 42 });
  });
});

describe('listResponseSchema', () => {
  it('wraps an item schema in a {data, meta} envelope', () => {
    const schema = listResponseSchema(manufacturerSchema);
    const now = new Date().toISOString();
    const envelope = {
      data: [{ id: 1, name: 'Bosch', code: 'BSH', isActive: true, createdAt: now, updatedAt: now }],
      meta: { page: 1, limit: 20, total: 1 },
    };

    expect(schema.parse(envelope)).toEqual(envelope);
  });

  it('rejects a payload missing meta', () => {
    const schema = listResponseSchema(manufacturerSchema);
    expect(schema.safeParse({ data: [] }).success).toBe(false);
  });
});
