'use client';

import { useState } from 'react';

import { FormActions } from '@/components/ui/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createVehicleClass, updateVehicleClass } from '@/lib/api';
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

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(vehicleClassCreateSchema, createVehicleClass, { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    vehicleClassUpdateSchema,
    (data) => (vehicleClass ? updateVehicleClass(vehicleClass.id, data) : Promise.reject(new Error('No vehicle class selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = vehicleClass ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({
      name: name.trim(),
      displayOrder: displayOrder.trim() === '' ? undefined : Number(displayOrder),
    });
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
