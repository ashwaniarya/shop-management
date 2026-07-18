'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { VehicleCascadeSelect, type VehicleCascadeValue } from '@/components/ui/VehicleCascadeSelect';
import { useVehicleCascadeData } from '@/hooks/useVehicleCascadeData';
import { createPartFitment, deletePartFitment, type PartFitmentExpanded } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
import { partFitmentCreateSchema } from '@shop/shared';

const EMPTY_CASCADE: VehicleCascadeValue = { classId: null, makeId: null, modelId: null };

interface FitmentsSectionProps {
  partId: number;
  fitments: PartFitmentExpanded[];
  onMutated: () => void;
}

export function FitmentsSection({ partId, fitments, onMutated }: FitmentsSectionProps) {
  const { vehicleClasses, vehicleMakes, vehicleModels } = useVehicleCascadeData();
  const [cascadeValue, setCascadeValue] = useState<VehicleCascadeValue>(EMPTY_CASCADE);
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = partFitmentCreateSchema.safeParse({
      vehicleClassId: cascadeValue.classId,
      vehicleMakeId: cascadeValue.makeId,
      vehicleModelId: cascadeValue.modelId,
      notes: notes.trim() === '' ? undefined : notes.trim(),
    });

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    createPartFitment(partId, parsed.data)
      .then(() => {
        setCascadeValue(EMPTY_CASCADE);
        setNotes('');
        onMutated();
      })
      .catch((error: unknown) => setSubmitError(describeError(error)))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <div className="flex flex-col gap-4">
      {fitments.length === 0 ? (
        <EmptyState title="No fitments recorded" description="This part has not been linked to any vehicle yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Class</Th>
              <Th>Make</Th>
              <Th>Model</Th>
              <Th>Notes</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {fitments.map((fitment) => (
              <Tr key={fitment.id}>
                <Td>{fitment.vehicleClassName}</Td>
                <Td className="text-ink-400">{fitment.vehicleMakeName ?? 'Any'}</Td>
                <Td className="text-ink-400">{fitment.vehicleModelName ?? 'Any'}</Td>
                <Td className="text-ink-400">{fitment.notes ?? '—'}</Td>
                <Td align="right">
                  <ConfirmButton onConfirm={() => deletePartFitment(partId, fitment.id).then(onMutated)} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-dashed border-ink-700 p-4">
        <p className="text-xs font-medium tracking-wide text-ink-300 uppercase">Add fitment</p>
        <VehicleCascadeSelect
          idPrefix="fitment-add"
          vehicleClasses={vehicleClasses}
          vehicleMakes={vehicleMakes}
          vehicleModels={vehicleModels}
          value={cascadeValue}
          onChange={setCascadeValue}
          classRequired
        />
        {fieldErrors.vehicleClassId ? <p className="text-xs text-accent-400">{fieldErrors.vehicleClassId}</p> : null}
        <Input
          label="Notes"
          placeholder="Optional"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          error={fieldErrors.notes}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Add fitment
          </Button>
          {submitError ? <span className="font-mono text-xs text-accent-400">{submitError}</span> : null}
        </div>
      </form>
    </div>
  );
}
