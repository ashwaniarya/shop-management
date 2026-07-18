'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createCategory, updateCategory } from '@/lib/api';
import { categoryCreateSchema, categoryUpdateSchema, type Category } from '@shop/shared';

export type CategoryDialogTarget =
  | { kind: 'create-root' }
  | { kind: 'create-child'; parent: Category }
  | { kind: 'edit'; category: Category }
  | null;

interface CategoryFormDialogProps {
  target: CategoryDialogTarget;
  onClose: () => void;
  onSaved: () => void;
}

// Root add, per-node "add subcategory", and edit all share one form: only the title,
// the parentCategoryId sent on create, and whether displayOrder is shown (edit only,
// per the task's field list) differ between the three dialog states.
export function CategoryFormDialog({ target, onClose, onSaved }: CategoryFormDialogProps) {
  const isOpen = target !== null;
  const title =
    target === null
      ? ''
      : target.kind === 'create-root'
        ? 'Add category'
        : target.kind === 'create-child'
          ? `Add subcategory — under ${target.parent.name}`
          : `Edit category — ${target.category.name}`;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      {target ? (
        <CategoryForm
          key={target.kind === 'edit' ? `edit-${target.category.id}` : target.kind === 'create-child' ? `create-${target.parent.id}` : 'create-root'}
          target={target}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function CategoryForm({
  target,
  onClose,
  onSaved,
}: {
  target: Exclude<CategoryDialogTarget, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = target.kind === 'edit';
  const [name, setName] = useState(isEdit ? target.category.name : '');
  const [displayOrder, setDisplayOrder] = useState(isEdit ? String(target.category.displayOrder) : '0');

  const closeAfterSave = () => {
    onSaved();
    onClose();
  };
  const createSubmit = useZodSubmit(categoryCreateSchema, createCategory, { onSuccess: closeAfterSave });
  const updateSubmit = useZodSubmit(
    categoryUpdateSchema,
    (data) => (target.kind === 'edit' ? updateCategory(target.category.id, data) : Promise.reject(new Error('No category selected'))),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = isEdit ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isEdit) {
      run({
        name: name.trim(),
        displayOrder: displayOrder.trim() === '' ? undefined : Number(displayOrder),
      });
      return;
    }
    run({
      name: name.trim(),
      parentCategoryId: target.kind === 'create-child' ? target.parent.id : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} error={fieldErrors.name} />
      {isEdit ? (
        <Input
          label="Display order"
          value={displayOrder}
          onChange={(event) => setDisplayOrder(event.target.value)}
          error={fieldErrors.displayOrder}
          type="number"
          step="1"
          className="font-mono tabular-nums"
        />
      ) : null}
      <FormActions
        submitLabel={isEdit ? 'Save changes' : target.kind === 'create-child' ? 'Add subcategory' : 'Add category'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
