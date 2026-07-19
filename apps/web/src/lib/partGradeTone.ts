import type { PartGrade } from '@shop/shared';

import type { BadgeTone } from '@/components/ui/Badge';

const TONE_BY_RANK: BadgeTone[] = ['positive', 'accent', 'neutral'];

export function partGradeTone(gradeId: number, sortedGrades: PartGrade[]): BadgeTone {
  const rank = sortedGrades.findIndex((grade) => grade.id === gradeId);
  return TONE_BY_RANK[rank] ?? 'muted';
}
