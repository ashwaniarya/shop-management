import { Badge } from '@/components/ui/Badge';

export function PartActiveBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? 'positive' : 'muted'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
}
