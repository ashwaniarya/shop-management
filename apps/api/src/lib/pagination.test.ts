// Unit test: pure logic, isolated function
import { describe, expect, it } from 'vitest';

import { buildMeta, toSkipTake } from './pagination';

describe('toSkipTake', () => {
  it('computes skip/take for the first page', () => {
    expect(toSkipTake({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it('computes skip/take for a later page', () => {
    expect(toSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });
});

describe('buildMeta', () => {
  it('echoes page/limit alongside the given total', () => {
    expect(buildMeta({ page: 2, limit: 10 }, 35)).toEqual({ page: 2, limit: 10, total: 35 });
  });
});
