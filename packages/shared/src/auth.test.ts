// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { authUserSchema, loginSchema, registerSchema } from './auth';

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

describe('registerSchema', () => {
  const valid = { shopName: 'My Store', ownerName: 'Asha', username: 'asha_store', pin: '123456' };

  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a pin that is not exactly 6 digits', () => {
    expect(registerSchema.safeParse({ ...valid, pin: '1234' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, pin: '12345' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, pin: '1234567' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, pin: 'abcdef' }).success).toBe(false);
  });

  it('rejects a username shorter than 3 characters', () => {
    expect(registerSchema.safeParse({ ...valid, username: 'ab' }).success).toBe(false);
  });

  it('rejects an empty shop name or owner name', () => {
    expect(registerSchema.safeParse({ ...valid, shopName: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, ownerName: '' }).success).toBe(false);
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
