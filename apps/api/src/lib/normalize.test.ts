// Unit test: pure logic, isolated function
import { describe, expect, it } from 'vitest';

import { normalizeNumber } from './normalize';

describe('normalizeNumber', () => {
  it('uppercases lowercase input', () => {
    expect(normalizeNumber('abc123')).toBe('ABC123');
  });

  it('strips dashes, spaces, and dots', () => {
    expect(normalizeNumber('ABC-123 45.6')).toBe('ABC123456');
  });

  it('passes already-clean input through unchanged', () => {
    expect(normalizeNumber('ABC123')).toBe('ABC123');
  });

  it('returns an empty string for empty input', () => {
    expect(normalizeNumber('')).toBe('');
  });
});
