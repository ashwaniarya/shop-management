'use client';

import { useState } from 'react';

import { FormActions } from '@/components/ui/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createPartGrade, updatePartGrade } from '@/lib/api';
import { partGradeCreateSchema, partGradeUpdateSchema, type PartGrade } from '@shop/shared';

interface PartGradeFormDialogProps {
  partGrade: PartGrade | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PartGradeFormDialog({ partGrade, isOpen, onClose, onSaved }: PartGradeFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={partGrade ? `Edit grade — ${partGrade.name}` : 'Add grade'}>
      {isOpen ? (
        <PartGradeForm
          key={partGrade ? `edit-${partGrade.id}` : 'create'}
          partGrade={partGrade}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function PartGradeForm({
  partGrade,
  onClose,
  onSaved,
}: {
  partGrade: PartGrade | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(partGrade?.name ?? '');
  const [displayOrder, setDisplayOrder] = useState(partGrade ? String(partGrade.displayOrder) : '0');

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(partGradeCreateSchema, createPartGrade, { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    partGradeUpdateSchema,
    (data) => (partGrade ? updatePartGrade(partGrade.id, data) : Promise.reject(new Error('No grade selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = partGrade ? updateSubmit : createSubmit;

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
        submitLabel={partGrade ? 'Save changes' : 'Add grade'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
