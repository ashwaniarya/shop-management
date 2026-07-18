import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  caption?: string;
  accent?: boolean;
  bar?: { percent: number };
}

export function StatTile({ label, value, caption, accent = false, bar }: StatTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-ink-800 bg-ink-900 p-4">
      <div className="text-[11px] font-medium tracking-[0.14em] text-ink-500 uppercase">{label}</div>
      <div className={`font-mono text-3xl leading-none font-semibold tabular-nums ${accent ? 'text-accent-400' : 'text-ink-50'}`}>
        {value}
      </div>
      {caption ? <div className="text-xs text-ink-500">{caption}</div> : null}
      {bar ? (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-800">
          <div
            className={`h-full rounded-full ${accent ? 'bg-accent-500' : 'bg-positive-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, bar.percent))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
