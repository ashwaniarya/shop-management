import type { PartGrade } from '@shop/shared';

import { Badge } from '@/components/ui/Badge';
import { partGradeTone } from '@/lib/partGradeTone';

export function PartGradeBadge({ grade, partGrades }: { grade: PartGrade; partGrades: PartGrade[] }) {
  return <Badge tone={partGradeTone(grade.id, partGrades)}>{grade.name}</Badge>;
}
