import { describe, expect, it } from 'vitest';

import type { PartGrade } from '@shop/shared';

import { partGradeTone } from './partGradeTone';

function buildGrade(overrides: Partial<PartGrade> & Pick<PartGrade, 'id'>): PartGrade {
  return {
    name: `Grade ${overrides.id}`,
    displayOrder: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('partGradeTone', () => {
  it('maps the three ranks of a 3-grade list to positive, accent and neutral', () => {
    const grades = [buildGrade({ id: 10 }), buildGrade({ id: 20 }), buildGrade({ id: 30 })];
    expect(partGradeTone(10, grades)).toBe('positive');
    expect(partGradeTone(20, grades)).toBe('accent');
    expect(partGradeTone(30, grades)).toBe('neutral');
  });

  it('maps ranks 3 and 4 of a 5-grade list to muted', () => {
    const grades = [1, 2, 3, 4, 5].map((id) => buildGrade({ id }));
    expect(partGradeTone(4, grades)).toBe('muted');
    expect(partGradeTone(5, grades)).toBe('muted');
  });

  it('falls back to muted for a grade id not in the list', () => {
    const grades = [buildGrade({ id: 1 }), buildGrade({ id: 2 })];
    expect(partGradeTone(99, grades)).toBe('muted');
  });

  it('gives the only grade of a single-grade list the positive tone', () => {
    expect(partGradeTone(7, [buildGrade({ id: 7 })])).toBe('positive');
  });

  it('ranks by array position even when displayOrder values are duplicated', () => {
    const grades = [
      buildGrade({ id: 1, displayOrder: 5 }),
      buildGrade({ id: 2, displayOrder: 5 }),
      buildGrade({ id: 3, displayOrder: 5 }),
    ];
    expect(partGradeTone(1, grades)).toBe('positive');
    expect(partGradeTone(2, grades)).toBe('accent');
    expect(partGradeTone(3, grades)).toBe('neutral');
  });
});
