import type { StockTransactionType } from '@shop/shared';

import { Badge, type BadgeTone } from '@/components/ui/Badge';

const TONE_BY_TYPE: Record<StockTransactionType, BadgeTone> = {
  SALE: 'accent',
  PURCHASE: 'positive',
  ADJUSTMENT: 'muted',
};

export function TransactionTypeBadge({ type }: { type: StockTransactionType }) {
  return <Badge tone={TONE_BY_TYPE[type]}>{type}</Badge>;
}
