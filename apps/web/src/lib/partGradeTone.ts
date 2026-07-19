import type { PartGrade } from '@shop/shared';

import type { BadgeTone } from '@/components/ui/Badge';

const TONE_BY_RANK: BadgeTone[] = ['positive', 'accent', 'neutral'];

export function sortPartGrades(grades: PartGrade[]): PartGrade[] {
  return [...grades].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

// Rank counts active grades only: retiring a grade must not reshuffle the tones of the rest.
export function partGradeTone(gradeId: number, sortedGrades: PartGrade[]): BadgeTone {
  const rank = sortedGrades
    .filter((grade) => grade.isActive)
    .findIndex((grade) => grade.id === gradeId);
  return TONE_BY_RANK[rank] ?? 'muted';
}
