import type { ReactNode } from 'react';

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-mono text-[11px] font-medium tracking-[0.14em] text-ink-500 uppercase">{children}</h2>;
}
