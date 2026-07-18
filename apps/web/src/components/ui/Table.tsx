import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="scrollbar-instrument overflow-x-auto rounded-md border border-ink-800">
      {/* text-ink-200 lives here, inherited by every Td, rather than on Td itself:
          Tailwind resolves same-specificity utility classes by source order in the
          stylesheet, not by position in the class attribute, so a color utility
          hardcoded on Td could silently outrank a per-cell override passed via
          className. Inheritance sidesteps that: an element's own class always beats
          an inherited value. */}
      <table className="w-full border-collapse text-sm text-ink-200">{children}</table>
    </div>
  );
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right';
}

export function Th({ children, align = 'left', className = '', ...rest }: ThProps) {
  return (
    <th
      className={`border-b border-ink-800 bg-ink-900 px-3 py-2.5 text-[11px] font-medium tracking-[0.08em] text-ink-500 uppercase ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right';
  mono?: boolean;
}

export function Td({ children, align = 'left', mono = false, className = '', ...rest }: TdProps) {
  return (
    <td
      className={`border-b border-ink-850 px-3 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'} ${mono ? 'font-mono tabular-nums' : ''} ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer hover:bg-ink-900' : ''} transition-colors last:[&>td]:border-b-0 ${className}`}
    >
      {children}
    </tr>
  );
}
