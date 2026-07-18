'use client';

import { useEffect, useRef, useState } from 'react';

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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const shouldRestoreTriggerFocusRef = useRef(false);

  // Mirror of the confirm-path autoFocus below: cancelling unmounts the confirming
  // pair and remounts the trigger, so focus is restored to it explicitly. Gated on
  // the flag so the initial mount never steals focus.
  useEffect(() => {
    if (state === 'idle' && shouldRestoreTriggerFocusRef.current) {
      shouldRestoreTriggerFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [state]);

  if (state === 'idle') {
    return (
      <Button
        ref={triggerRef}
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
      <Button
        variant="ghost"
        size="sm"
        disabled={state === 'pending'}
        onClick={() => {
          shouldRestoreTriggerFocusRef.current = true;
          setState('idle');
        }}
      >
        Cancel
      </Button>
      <FormError error={error} />
    </span>
  );
}
