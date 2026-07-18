// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { manufacturerCreateSchema } from './manufacturer';

describe('manufacturerCreateSchema', () => {
  it('rejects an empty name', () => {
    expect(manufacturerCreateSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
