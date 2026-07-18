// Unit test: pure logic, isolated schema
import { describe, expect, it } from 'vitest';

import { booleanQueryParam } from './queryBoolean';

describe('booleanQueryParam', () => {
  it('parses "true" as true', () => {
    expect(booleanQueryParam.parse('true')).toBe(true);
  });

  it('parses "false" as false', () => {
    expect(booleanQueryParam.parse('false')).toBe(false);
  });

  it('rejects any other string', () => {
    expect(booleanQueryParam.safeParse('yes').success).toBe(false);
  });
});
