import type { Meta } from '@shop/shared';

import { Button } from './Button';

export function Pagination({ meta, onPageChange }: { meta: Meta; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const rangeStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(meta.total, meta.page * meta.limit);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      <p className="font-mono text-xs tabular-nums text-ink-500">
        {rangeStart}–{rangeEnd} <span className="text-ink-600">of</span> {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
        >
          Prev
        </Button>
        <span className="font-mono text-xs tabular-nums text-ink-400">
          {meta.page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
