'use client';

import { useState } from 'react';

import { buildPartFormPayload } from '@/components/parts/buildPartFormPayload';
import { PartFormFields, usePartFormValues } from '@/components/parts/PartFormFields';
import { Dialog } from '@/components/ui/Dialog';
import { FormActions } from '@/components/ui/FormActions';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { ApiError, createPart, updatePart } from '@/lib/api';
import { partCreateSchema, partUpdateSchema, type Category, type Manufacturer, type Part, type PartGrade } from '@shop/shared';

interface PartFormDialogProps {
  part: Part | null;
  manufacturers: Manufacturer[];
  categories: Category[];
  partGrades: PartGrade[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (part: Part) => void;
}

// The unique-sku and unique-(manufacturer, MPN) indexes both surface as a bare 409;
// rethrown with a message that names the two fields a counter operator can actually fix.
function rethrowWithDuplicateNumberMessage(error: unknown): never {
  if (error instanceof ApiError && error.status === 409) {
    throw new ApiError(409, {
      code: error.code,
      message: 'A part with this SKU or manufacturer part number already exists',
    });
  }
  throw error;
}

export function PartFormDialog({
  part,
  manufacturers,
  categories,
  partGrades,
  isOpen,
  onClose,
  onSaved,
}: PartFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={part ? `Edit part — ${part.sku}` : 'New part'}>
      {isOpen ? (
        <PartForm
          key={part ? `edit-${part.id}` : 'create'}
          part={part}
          manufacturers={manufacturers}
          categories={categories}
          partGrades={partGrades}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function PartForm({
  part,
  manufacturers,
  categories,
  partGrades,
  onClose,
  onSaved,
}: {
  part: Part | null;
  manufacturers: Manufacturer[];
  categories: Category[];
  partGrades: PartGrade[];
  onClose: () => void;
  onSaved: (part: Part) => void;
}) {
  const values = usePartFormValues(part);
  const [isActive, setIsActive] = useState(part?.isActive ?? true);

  const closeAfterSave = (savedPart: Part) => {
    onSaved(savedPart);
    onClose();
  };
  const createSubmit = useZodSubmit(
    partCreateSchema,
    (data) => createPart(data).catch(rethrowWithDuplicateNumberMessage),
    { onSuccess: closeAfterSave },
  );
  const updateSubmit = useZodSubmit(
    partUpdateSchema,
    (data) =>
      part
        ? updatePart(part.id, data).catch(rethrowWithDuplicateNumberMessage)
        : Promise.reject(new Error('No part selected')),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = part ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const sharedFields = buildPartFormPayload(values);
    run(part ? { ...sharedFields, isActive } : sharedFields);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <PartFormFields
        values={values}
        manufacturers={manufacturers}
        categories={categories}
        partGrades={partGrades}
        fieldErrors={fieldErrors}
      />
      {part ? (
        <label className="inline-flex items-center gap-1.5 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent-500"
          />
          Active in catalog
        </label>
      ) : null}
      <FormActions
        submitLabel={part ? 'Save changes' : 'Create part'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
