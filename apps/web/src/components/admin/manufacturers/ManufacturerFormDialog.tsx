'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { createManufacturer, updateManufacturer } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = { name: name.trim(), code: code.trim() === '' ? null : code.trim() };

    // Branched fully (rather than picking a schema with one ternary and the request
    // function with another) so TypeScript can narrow `parsed.data` against the one
    // schema actually used in each branch, instead of the union of both.
    if (manufacturer) {
      const parsed = manufacturerUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateManufacturer(manufacturer.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parsed = manufacturerCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createManufacturer(parsed.data)
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
