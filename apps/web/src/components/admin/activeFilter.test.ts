import { describe, expect, it } from 'vitest';

import { filterByActiveState } from './activeFilter';

function row(isActive: boolean) {
  return { isActive };
}

describe('filterByActiveState', () => {
  it('returns every row for the "all" filter', () => {
    const rows = [row(true), row(false)];
    expect(filterByActiveState(rows, 'all')).toEqual(rows);
  });

  it('returns only active rows for the "active" filter', () => {
    const rows = [row(true), row(false), row(true)];
    expect(filterByActiveState(rows, 'active')).toEqual([row(true), row(true)]);
  });

  it('returns only inactive rows for the "inactive" filter', () => {
    const rows = [row(true), row(false)];
    expect(filterByActiveState(rows, 'inactive')).toEqual([row(false)]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterByActiveState([row(true)], 'inactive')).toEqual([]);
  });
});
