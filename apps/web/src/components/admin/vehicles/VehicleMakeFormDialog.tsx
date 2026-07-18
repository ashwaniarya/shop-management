'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createVehicleMake, updateVehicleMake } from '@/lib/api';
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

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(vehicleMakeCreateSchema, createVehicleMake, { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    vehicleMakeUpdateSchema,
    (data) => (vehicleMake ? updateVehicleMake(vehicleMake.id, data) : Promise.reject(new Error('No vehicle make selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = vehicleMake ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({ name: name.trim() });
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
