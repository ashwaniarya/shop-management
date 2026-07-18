'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { createVehicleClass, updateVehicleClass } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
import { vehicleClassCreateSchema, vehicleClassUpdateSchema, type VehicleClass } from '@shop/shared';

interface VehicleClassFormDialogProps {
  vehicleClass: VehicleClass | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function VehicleClassFormDialog({ vehicleClass, isOpen, onClose, onSaved }: VehicleClassFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={vehicleClass ? `Edit vehicle class — ${vehicleClass.name}` : 'Add vehicle class'}>
      {isOpen ? (
        <VehicleClassForm
          key={vehicleClass ? `edit-${vehicleClass.id}` : 'create'}
          vehicleClass={vehicleClass}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function VehicleClassForm({
  vehicleClass,
  onClose,
  onSaved,
}: {
  vehicleClass: VehicleClass | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(vehicleClass?.name ?? '');
  const [displayOrder, setDisplayOrder] = useState(vehicleClass ? String(vehicleClass.displayOrder) : '0');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      displayOrder: displayOrder.trim() === '' ? undefined : Number(displayOrder),
    };
    // Branched fully (rather than picking a schema with one ternary and the request
    // function with another) so TypeScript can narrow `parsed.data` against the one
    // schema actually used in each branch, instead of the union of both.
    if (vehicleClass) {
      const parsed = vehicleClassUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateVehicleClass(vehicleClass.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parsed = vehicleClassCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createVehicleClass(parsed.data)
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
      <Input
        label="Display order"
        value={displayOrder}
        onChange={(event) => setDisplayOrder(event.target.value)}
        error={fieldErrors.displayOrder}
        type="number"
        step="1"
        className="font-mono tabular-nums"
      />
      <FormActions
        submitLabel={vehicleClass ? 'Save changes' : 'Add vehicle class'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
