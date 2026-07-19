// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { userCreateSchema } from './user';

describe('userCreateSchema', () => {
  it('rejects an empty name', () => {
    expect(userCreateSchema.safeParse({ name: '', role: 'STAFF' }).success).toBe(false);
  });

  it('accepts a user with no username or pin, since credentials are provisioned separately', () => {
    expect(userCreateSchema.safeParse({ name: 'Suresh Arya', role: 'STAFF' }).success).toBe(true);
  });

  it('accepts a valid username and pin', () => {
    const result = userCreateSchema.safeParse({
      name: 'Suresh Arya',
      role: 'STAFF',
      username: 'suresh',
      pin: '1234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a username shorter than 3 characters', () => {
    const result = userCreateSchema.safeParse({
      name: 'Suresh Arya',
      role: 'STAFF',
      username: 'su',
      pin: '1234',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric pin', () => {
    const result = userCreateSchema.safeParse({
      name: 'Suresh Arya',
      role: 'STAFF',
      username: 'suresh',
      pin: 'abcd',
    });
    expect(result.success).toBe(false);
  });
});
