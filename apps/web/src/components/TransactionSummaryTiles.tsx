import { StatTile } from '@/components/ui/StatTile';
import { formatCurrency, formatQuantity } from '@/lib/format';
import type { TransactionSummary } from '@/lib/api';

export function TransactionSummaryTiles({ summary, rangeCaption }: { summary: TransactionSummary; rangeCaption: string }) {
  const maxAmount = Math.max(summary.sales.revenue, summary.purchases.cost, 1);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Sales revenue"
        value={formatCurrency(summary.sales.revenue)}
        caption={rangeCaption}
        bar={{ percent: (summary.sales.revenue / maxAmount) * 100 }}
      />
      <StatTile
        label="Purchases cost"
        value={formatCurrency(summary.purchases.cost)}
        caption={rangeCaption}
        bar={{ percent: (summary.purchases.cost / maxAmount) * 100 }}
      />
      <StatTile label="Sale count" value={formatQuantity(summary.sales.count)} caption={rangeCaption} />
      <StatTile
        label="Adjustments"
        value={formatQuantity(summary.adjustments.count)}
        caption={rangeCaption}
        accent={summary.adjustments.count > 0}
      />
    </div>
  );
}
