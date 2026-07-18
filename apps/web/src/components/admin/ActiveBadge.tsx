import { Badge } from '@/components/ui/Badge';

// Same isActive -> tone mapping as PartActiveBadge, kept as its own copy here since
// every admin resource (manufacturers, suppliers, vehicle classes/makes/models,
// shops, shop users) needs it and PartActiveBadge is scoped to parts.
export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? 'positive' : 'muted'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
}
