'use client';

import { useState } from 'react';

import { FormActions } from '@/components/ui/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createManufacturer, updateManufacturer } from '@/lib/api';
import { manufacturerCreateSchema, manufacturerUpdateSchema, type Manufacturer } from '@shop/shared';

interface ManufacturerFormDialogProps {
  manufacturer: Manufacturer | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// `manufacturer === null` means "create"; any Manufacturer means "edit that row" —
// mirrors InventoryEditDialog's row-or-null convention.
export function ManufacturerFormDialog({ manufacturer, isOpen, onClose, onSaved }: ManufacturerFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={manufacturer ? `Edit manufacturer — ${manufacturer.name}` : 'Add manufacturer'}>
      {isOpen ? (
        <ManufacturerForm
          key={manufacturer ? `edit-${manufacturer.id}` : 'create'}
          manufacturer={manufacturer}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function ManufacturerForm({
  manufacturer,
  onClose,
  onSaved,
}: {
  manufacturer: Manufacturer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(manufacturer?.name ?? '');
  const [code, setCode] = useState(manufacturer?.code ?? '');

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(manufacturerCreateSchema, createManufacturer, { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    manufacturerUpdateSchema,
    (data) => (manufacturer ? updateManufacturer(manufacturer.id, data) : Promise.reject(new Error('No manufacturer selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = manufacturer ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({ name: name.trim(), code: code.trim() === '' ? null : code.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} error={fieldErrors.name} />
      <Input
        label="Code"
        placeholder="Optional"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        error={fieldErrors.code}
        className="font-mono"
      />
      <FormActions
        submitLabel={manufacturer ? 'Save changes' : 'Add manufacturer'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
