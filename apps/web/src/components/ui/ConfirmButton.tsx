'use client';

import { useState } from 'react';

import { Button } from './Button';
import { describeError } from './ErrorState';

type ConfirmState = 'idle' | 'confirming' | 'pending';

export function ConfirmButton({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Confirm',
}: {
  onConfirm: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
}) {
  const [state, setState] = useState<ConfirmState>('idle');
  const [error, setError] = useState<string | null>(null);

  if (state === 'idle') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setError(null);
          setState('confirming');
        }}
      >
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        variant="outline-danger"
        size="sm"
        isLoading={state === 'pending'}
        onClick={async () => {
          setState('pending');
          try {
            await onConfirm();
          } catch (confirmError) {
            setError(describeError(confirmError));
            setState('confirming');
          }
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" disabled={state === 'pending'} onClick={() => setState('idle')}>
        Cancel
      </Button>
      {error ? <span className="font-mono text-xs text-accent-400">{error}</span> : null}
    </span>
  );
}
