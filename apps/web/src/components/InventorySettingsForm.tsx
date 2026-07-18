'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { getFieldErrors } from '@/lib/zodFieldErrors';
import { inventoryItemUpdateSchema, type InventoryItem, type InventoryItemUpdate } from '@shop/shared';

interface InventorySettingsFormProps {
  initialItem: InventoryItem | null;
  onSaved: () => void;
  submit: (data: InventoryItemUpdate) => Promise<unknown>;
  submitLabel?: string;
}

// Shared by the part-360 Stock tab and the inventory list's edit dialog: both need the
// same reorderLevel/costPrice/sellingPrice/storageLocation form against the same
// strict inventoryItemUpdateSchema, just wired to different containers and submit fns.
export function InventorySettingsForm({ initialItem, onSaved, submit, submitLabel = 'Save settings' }: InventorySettingsFormProps) {
  const [reorderLevel, setReorderLevel] = useState(initialItem?.reorderLevel?.toString() ?? '');
  const [costPrice, setCostPrice] = useState(initialItem?.costPrice?.toString() ?? '');
  const [sellingPrice, setSellingPrice] = useState(initialItem?.sellingPrice?.toString() ?? '');
  const [storageLocation, setStorageLocation] = useState(initialItem?.storageLocation ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = inventoryItemUpdateSchema.safeParse({
      reorderLevel: reorderLevel.trim() === '' ? null : Number(reorderLevel),
      costPrice: costPrice.trim() === '' ? null : Number(costPrice),
      sellingPrice: sellingPrice.trim() === '' ? null : Number(sellingPrice),
      storageLocation: storageLocation.trim() === '' ? null : storageLocation.trim(),
    });

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    submit(parsed.data)
      .then(() => {
        onSaved();
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      })
      .catch((error: unknown) => setSubmitError(describeError(error)))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="Reorder level"
        value={reorderLevel}
        onChange={(event) => setReorderLevel(event.target.value)}
        error={fieldErrors.reorderLevel}
        type="number"
        step="any"
        className="font-mono tabular-nums"
      />
      <Input
        label="Cost price"
        value={costPrice}
        onChange={(event) => setCostPrice(event.target.value)}
        error={fieldErrors.costPrice}
        type="number"
        step="any"
        className="font-mono tabular-nums"
      />
      <Input
        label="Selling price"
        value={sellingPrice}
        onChange={(event) => setSellingPrice(event.target.value)}
        error={fieldErrors.sellingPrice}
        type="number"
        step="any"
        className="font-mono tabular-nums"
      />
      <Input
        label="Storage location"
        value={storageLocation}
        onChange={(event) => setStorageLocation(event.target.value)}
        error={fieldErrors.storageLocation}
        placeholder="e.g. Rack A1"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
        {justSaved ? <span className="text-xs text-positive-300">Saved</span> : null}
        {submitError ? <span className="font-mono text-xs text-accent-400">{submitError}</span> : null}
      </div>
    </form>
  );
}
