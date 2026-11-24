// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { authUserSchema, loginSchema, registerSchema } from './auth';
import { passwordSchema } from './authPolicy';

const validPassword = 'workshop-pass';

describe('passwordSchema', () => {
  it('rejects a 4-digit PIN and a digits-only 10 character secret', () => {
    expect(passwordSchema.safeParse('1234').success).toBe(false);
    expect(passwordSchema.safeParse('1234567890').success).toBe(false);
  });

  it('accepts 10 or more characters that are not only digits', () => {
    expect(passwordSchema.safeParse(validPassword).success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('accepts a password and a legacy PIN', () => {
    expect(loginSchema.safeParse({ username: 'suresh', password: validPassword }).success).toBe(true);
    expect(loginSchema.safeParse({ username: 'suresh', password: '1234' }).success).toBe(true);
  });

  it('rejects an empty username', () => {
    expect(loginSchema.safeParse({ username: '', password: validPassword }).success).toBe(false);
  });

  it('rejects a secret that is neither a password nor a 4–6 digit PIN', () => {
    expect(loginSchema.safeParse({ username: 'suresh', password: '123' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: 'suresh', password: 'abcdef' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = { shopName: 'My Store', ownerName: 'Asha', username: 'asha_store', password: validPassword };

  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a digits-only or too-short password', () => {
    expect(registerSchema.safeParse({ ...valid, password: '1234' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: '1234567890' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
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
