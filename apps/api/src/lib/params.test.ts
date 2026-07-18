// Unit test: pure logic, isolated function
import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../services/errors';
import { requireIdParam } from './params';

describe('requireIdParam', () => {
  it('parses a numeric string to a number', () => {
    expect(requireIdParam('42')).toBe(42);
  });

  it('throws NotFoundError for a non-numeric value', () => {
    expect(() => requireIdParam('abc')).toThrow(NotFoundError);
  });

  it('throws NotFoundError for a negative number (the leading minus is not a digit)', () => {
    expect(() => requireIdParam('-5')).toThrow(NotFoundError);
  });

  it('throws NotFoundError for a decimal', () => {
    expect(() => requireIdParam('4.5')).toThrow(NotFoundError);
  });

  it('accepts zero, even though it never names a real row', () => {
    expect(requireIdParam('0')).toBe(0);
  });
});
