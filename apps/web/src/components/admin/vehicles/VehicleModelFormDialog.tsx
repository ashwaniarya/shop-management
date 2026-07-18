'use client';

import { useState } from 'react';

import { FormActions } from '@/components/ui/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createVehicleModel, updateVehicleModel } from '@/lib/api';
import { vehicleModelCreateSchema, vehicleModelUpdateSchema, type VehicleClass, type VehicleMake, type VehicleModel } from '@shop/shared';

interface VehicleModelFormDialogProps {
  vehicleModel: VehicleModel | null;
  vehicleClasses: VehicleClass[];
  vehicleMakes: VehicleMake[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// A model's make and class are independent axes (a make isn't scoped to one class,
// and vice versa), unlike VehicleCascadeSelect's fitment-filtering cascade — so this
// form offers every make and every class rather than narrowing one by the other.
export function VehicleModelFormDialog({
  vehicleModel,
  vehicleClasses,
  vehicleMakes,
  isOpen,
  onClose,
  onSaved,
}: VehicleModelFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={vehicleModel ? `Edit vehicle model — ${vehicleModel.name}` : 'Add vehicle model'}>
      {isOpen ? (
        <VehicleModelForm
          key={vehicleModel ? `edit-${vehicleModel.id}` : 'create'}
          vehicleModel={vehicleModel}
          vehicleClasses={vehicleClasses}
          vehicleMakes={vehicleMakes}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function VehicleModelForm({
  vehicleModel,
  vehicleClasses,
  vehicleMakes,
  onClose,
  onSaved,
}: {
  vehicleModel: VehicleModel | null;
  vehicleClasses: VehicleClass[];
  vehicleMakes: VehicleMake[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(vehicleModel?.name ?? '');
  const [vehicleMakeId, setVehicleMakeId] = useState<number | ''>(vehicleModel?.vehicleMakeId ?? '');
  const [vehicleClassId, setVehicleClassId] = useState<number | ''>(vehicleModel?.vehicleClassId ?? '');

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(vehicleModelCreateSchema, createVehicleModel, { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    vehicleModelUpdateSchema,
    (data) => (vehicleModel ? updateVehicleModel(vehicleModel.id, data) : Promise.reject(new Error('No vehicle model selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = vehicleModel ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({
      name: name.trim(),
      vehicleMakeId: vehicleMakeId === '' ? undefined : vehicleMakeId,
      vehicleClassId: vehicleClassId === '' ? undefined : vehicleClassId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} error={fieldErrors.name} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Make"
          required
          value={vehicleMakeId}
          onChange={(event) => setVehicleMakeId(event.target.value === '' ? '' : Number(event.target.value))}
          error={fieldErrors.vehicleMakeId}
        >
          <option value="">Select a make…</option>
          {vehicleMakes.map((make) => (
            <option key={make.id} value={make.id}>
              {make.name}
            </option>
          ))}
        </Select>
        <Select
          label="Class"
          required
          value={vehicleClassId}
          onChange={(event) => setVehicleClassId(event.target.value === '' ? '' : Number(event.target.value))}
          error={fieldErrors.vehicleClassId}
        >
          <option value="">Select a class…</option>
          {vehicleClasses.map((vehicleClass) => (
            <option key={vehicleClass.id} value={vehicleClass.id}>
              {vehicleClass.name}
            </option>
          ))}
        </Select>
      </div>
      <FormActions
        submitLabel={vehicleModel ? 'Save changes' : 'Add vehicle model'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
