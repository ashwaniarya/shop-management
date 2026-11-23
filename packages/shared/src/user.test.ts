// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { userCreateSchema } from './user';

describe('userCreateSchema', () => {
  it('rejects an empty name', () => {
    expect(userCreateSchema.safeParse({ name: '', role: 'STAFF' }).success).toBe(false);
  });

  it('accepts a user with no username or password, since credentials are provisioned separately', () => {
    expect(userCreateSchema.safeParse({ name: 'Suresh Arya', role: 'STAFF' }).success).toBe(true);
  });

  it('accepts a valid username and password', () => {
    const result = userCreateSchema.safeParse({
      name: 'Suresh Arya',
      role: 'STAFF',
      username: 'suresh',
      password: 'workshop-pass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a username shorter than 3 characters', () => {
    const result = userCreateSchema.safeParse({
      name: 'Suresh Arya',
      role: 'STAFF',
      username: 'su',
      password: 'workshop-pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a digits-only password', () => {
    const result = userCreateSchema.safeParse({
      name: 'Suresh Arya',
      role: 'STAFF',
      username: 'suresh',
      password: '1234567890',
    });
    expect(result.success).toBe(false);
  });
});
