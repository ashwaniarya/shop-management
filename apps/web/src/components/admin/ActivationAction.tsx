'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { FormError } from '@/components/ui/FormError';
import { describeError } from '@/lib/describeError';

interface ActivationActionProps {
  isActive: boolean;
  onDeactivate: () => Promise<void>;
  onReactivate: () => Promise<void>;
}

// Uniform deactivate/reactivate control shared by every admin resource table.
// Deactivating goes through ConfirmButton's confirm step (it hides the row from the
// active catalog); reactivating is a single low-risk click, so it skips that step.
export function ActivationAction({ isActive, onDeactivate, onReactivate }: ActivationActionProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isActive) {
    return <ConfirmButton onConfirm={onDeactivate} label="Deactivate" />;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        variant="secondary"
        size="sm"
        isLoading={isPending}
        onClick={() => {
          setError(null);
          setIsPending(true);
          onReactivate()
            .catch((caughtError: unknown) => setError(describeError(caughtError)))
            .finally(() => setIsPending(false));
        }}
      >
        Reactivate
      </Button>
      <FormError error={error} />
    </span>
  );
}
