import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDate, formatDateTime, formatQuantity, formatRelativeTime } from './format';

describe('formatCurrency', () => {
  it('formats a positive amount with the rupee prefix and Indian digit grouping', () => {
    expect(formatCurrency(123456.5)).toBe('₹1,23,456.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0.00');
  });

  it('renders a dash for null or undefined', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });
});

describe('formatQuantity', () => {
  it('formats whole and fractional quantities with Indian digit grouping', () => {
    expect(formatQuantity(12000)).toBe('12,000');
    expect(formatQuantity(2.5)).toBe('2.5');
  });
});

describe('formatDate', () => {
  it('renders a readable local date pinned to the shop time zone', () => {
    expect(formatDate('2026-07-18T10:15:00.000Z')).toBe('18 Jul 2026');
  });

  it('rolls over to the next local day when UTC and IST fall on different dates', () => {
    expect(formatDate('2026-01-05T23:59:00.000Z')).toBe('06 Jan 2026');
  });
});

describe('formatDateTime', () => {
  it('renders a readable local date and time pinned to the shop time zone', () => {
    expect(formatDateTime('2026-07-18T10:15:00.000Z')).toBe('18 Jul 2026, 3:45 pm');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');

  it('collapses sub-45-second gaps to "just now"', () => {
    expect(formatRelativeTime('2026-07-18T11:59:30.000Z', now)).toBe('just now');
  });

  it('formats an hours-ago gap', () => {
    expect(formatRelativeTime('2026-07-18T10:00:00.000Z', now)).toBe('2 hr ago');
  });

  it('formats a days-ago gap', () => {
    expect(formatRelativeTime('2026-07-15T12:00:00.000Z', now)).toBe('3 days ago');
  });

  it('formats a months-ago gap', () => {
    expect(formatRelativeTime('2026-06-18T12:00:00.000Z', now)).toBe('1 mo ago');
  });

  it('formats a years-ago gap', () => {
    expect(formatRelativeTime('2025-07-18T12:00:00.000Z', now)).toBe('1 yr ago');
  });
});
