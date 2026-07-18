'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { createVehicleMake, updateVehicleMake } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
import { vehicleMakeCreateSchema, vehicleMakeUpdateSchema, type VehicleMake } from '@shop/shared';

interface VehicleMakeFormDialogProps {
  vehicleMake: VehicleMake | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function VehicleMakeFormDialog({ vehicleMake, isOpen, onClose, onSaved }: VehicleMakeFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={vehicleMake ? `Edit vehicle make — ${vehicleMake.name}` : 'Add vehicle make'}>
      {isOpen ? (
        <VehicleMakeForm key={vehicleMake ? `edit-${vehicleMake.id}` : 'create'} vehicleMake={vehicleMake} onClose={onClose} onSaved={onSaved} />
      ) : null}
    </Dialog>
  );
}

function VehicleMakeForm({
  vehicleMake,
  onClose,
  onSaved,
}: {
  vehicleMake: VehicleMake | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(vehicleMake?.name ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = { name: name.trim() };

    // Branched fully (rather than picking a schema with one ternary and the request
    // function with another) so TypeScript can narrow `parsed.data` against the one
    // schema actually used in each branch, instead of the union of both.
    if (vehicleMake) {
      const parsed = vehicleMakeUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateVehicleMake(vehicleMake.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parsed = vehicleMakeCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createVehicleMake(parsed.data)
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((error: unknown) => setSubmitError(describeError(error)))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} error={fieldErrors.name} />
      <FormActions
        submitLabel={vehicleMake ? 'Save changes' : 'Add vehicle make'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
