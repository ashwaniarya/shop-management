'use client';

import { useState } from 'react';

import { describeError } from '@/lib/describeError';

import { Button } from './Button';
import { FormError } from './FormError';

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
      {/* autoFocus: the trigger button unmounts on the idle→confirming swap, so
          without it keyboard focus would fall back to <body> mid-flow. */}
      <Button
        autoFocus
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
      <FormError error={error} />
    </span>
  );
}
