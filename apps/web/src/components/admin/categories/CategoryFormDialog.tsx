'use client';

import { useState } from 'react';

import { FormActions } from '@/components/admin/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { createCategory, updateCategory } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (isEdit) {
      const parsed = categoryUpdateSchema.safeParse({
        name: name.trim(),
        displayOrder: displayOrder.trim() === '' ? undefined : Number(displayOrder),
      });
      if (!parsed.success) {
        setFieldErrors(getFieldErrors(parsed.error));
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      updateCategory(target.category.id, parsed.data)
        .then(() => {
          onSaved();
          onClose();
        })
        .catch((error: unknown) => setSubmitError(describeError(error)))
        .finally(() => setIsSubmitting(false));
      return;
    }

    const parentCategoryId = target.kind === 'create-child' ? target.parent.id : null;
    const parsed = categoryCreateSchema.safeParse({ name: name.trim(), parentCategoryId });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    createCategory(parsed.data)
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
