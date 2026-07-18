import { PartActiveBadge } from '@/components/PartActiveBadge';
import { formatCurrency } from '@/lib/format';
import type { Part } from '@shop/shared';

interface PartHeaderCardProps {
  part: Part;
  manufacturerName: string;
  categoryName: string;
}

export function PartHeaderCard({ part, manufacturerName, categoryName }: PartHeaderCardProps) {
  return (
    <div className="rounded-md border border-ink-800 bg-ink-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-wide text-ink-500">{part.sku}</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-wide text-ink-50 uppercase">{part.name}</h1>
        </div>
        <PartActiveBadge isActive={part.isActive} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] tracking-[0.1em] text-ink-500 uppercase">Manufacturer</dt>
          <dd className="mt-0.5 text-sm text-ink-100">{manufacturerName}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.1em] text-ink-500 uppercase">Category</dt>
          <dd className="mt-0.5 text-sm text-ink-100">{categoryName}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.1em] text-ink-500 uppercase">MRP</dt>
          <dd className="mt-0.5 font-mono text-sm tabular-nums text-ink-100">{formatCurrency(part.mrp)}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.1em] text-ink-500 uppercase">Unit</dt>
          <dd className="mt-0.5 text-sm text-ink-100">{part.unitOfMeasure}</dd>
        </div>
      </dl>
      {part.description ? <p className="mt-4 text-sm text-ink-400">{part.description}</p> : null}
    </div>
  );
}
