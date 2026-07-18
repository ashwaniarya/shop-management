import { describe, expect, it } from 'vitest';

import { endOfDayIso, getCurrentMonthRange } from './dateRange';

describe('getCurrentMonthRange', () => {
  it('returns the first instant of the current UTC month through now', () => {
    const now = new Date('2026-07-18T14:32:00.000Z');
    expect(getCurrentMonthRange(now)).toEqual({
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-18T14:32:00.000Z',
    });
  });

  it('handles the first day of the month correctly', () => {
    const now = new Date('2026-01-01T00:00:05.000Z');
    expect(getCurrentMonthRange(now)).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-01T00:00:05.000Z',
    });
  });
});

describe('endOfDayIso', () => {
  it('returns the last instant of the given UTC day', () => {
    expect(endOfDayIso('2026-07-18')).toBe('2026-07-18T23:59:59.999Z');
  });
});
