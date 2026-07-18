import { describeError } from '@/lib/describeError';

import { Button } from './Button';

export function ErrorState({
  error,
  onRetry,
  title = 'Could not load this data',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-accent-800 bg-accent-950 px-6 py-10 text-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mb-1 text-accent-400">
        <path
          d="M12 3.5 21.5 20h-19Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M12 9.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.9" fill="currentColor" />
      </svg>
      <p className="text-sm font-medium text-ink-100">{title}</p>
      <p className="max-w-sm font-mono text-xs text-accent-300">{describeError(error)}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
