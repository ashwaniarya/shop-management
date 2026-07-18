import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-ink-800 px-6 py-12 text-center">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="mb-1 text-ink-600">
        <rect x="4" y="4" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
        <path d="M9 14h10M14 9v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-ink-200">{title}</p>
      {description ? <p className="max-w-sm text-xs text-ink-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
