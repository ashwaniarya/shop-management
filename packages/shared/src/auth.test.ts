// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { authUserSchema, loginSchema } from './auth';

describe('loginSchema', () => {
  it('accepts a valid username and pin', () => {
    expect(loginSchema.safeParse({ username: 'suresh', pin: '1234' }).success).toBe(true);
  });

  it('rejects an empty username', () => {
    expect(loginSchema.safeParse({ username: '', pin: '1234' }).success).toBe(false);
  });

  it('rejects a pin shorter than 4 digits', () => {
    expect(loginSchema.safeParse({ username: 'suresh', pin: '123' }).success).toBe(false);
  });

  it('rejects a pin longer than 6 digits', () => {
    expect(loginSchema.safeParse({ username: 'suresh', pin: '1234567' }).success).toBe(false);
  });

  it('rejects a non-numeric pin', () => {
    expect(loginSchema.safeParse({ username: 'suresh', pin: 'abcd' }).success).toBe(false);
  });
});

describe('authUserSchema', () => {
  it('accepts a valid user shape', () => {
    const result = authUserSchema.safeParse({ id: 1, shopId: 1, name: 'Suresh Arya', role: 'OWNER' });
    expect(result.success).toBe(true);
  });

  it('strips password-like fields even when present on the input, so the inferred type never carries a hash or pin', () => {
    const parsed = authUserSchema.parse({
      id: 1,
      shopId: 1,
      name: 'Suresh Arya',
      role: 'OWNER',
      passwordHash: 'hashed-secret',
      pin: '1234',
    });
    expect(parsed).not.toHaveProperty('passwordHash');
    expect(parsed).not.toHaveProperty('pin');
    expect(Object.keys(parsed).sort()).toEqual(['id', 'name', 'role', 'shopId']);
  });
});
