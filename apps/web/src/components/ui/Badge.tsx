import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'muted';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-ink-700 bg-ink-800 text-ink-200',
  accent: 'border-accent-700 bg-accent-900 text-accent-400',
  positive: 'border-positive-700 bg-positive-900 text-positive-300',
  muted: 'border-ink-800 bg-ink-850 text-ink-500',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[11px] leading-none font-medium tracking-wide uppercase ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
