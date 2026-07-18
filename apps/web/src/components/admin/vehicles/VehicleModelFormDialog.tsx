'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createVehicleModel, updateVehicleModel } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      vehicleMakeId: vehicleMakeId === '' ? undefined : vehicleMakeId,
      vehicleClassId: vehicleClassId === '' ? undefined : vehicleClassId,
    };
    // Branched fully (rather than picking a schema with one ternary and the request
    // function with another) so TypeScript can narrow `parsed.data` against the one
    // schema actually used in each branch, instead of the union of both.
    if (vehicleModel) {
      const parsed = vehicleModelUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateVehicleModel(vehicleModel.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parsed = vehicleModelCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createVehicleModel(parsed.data)
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
