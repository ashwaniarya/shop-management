'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { useZodSubmit } from '@/hooks/useZodSubmit';
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
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (justSavedTimerRef.current) {
        clearTimeout(justSavedTimerRef.current);
      }
    },
    [],
  );

  const { fieldErrors, submitError, isSubmitting, run } = useZodSubmit(inventoryItemUpdateSchema, submit, {
    onSuccess: () => {
      onSaved();
      setJustSaved(true);
      if (justSavedTimerRef.current) {
        clearTimeout(justSavedTimerRef.current);
      }
      justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 2000);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run({
      reorderLevel: reorderLevel.trim() === '' ? null : Number(reorderLevel),
      costPrice: costPrice.trim() === '' ? null : Number(costPrice),
      sellingPrice: sellingPrice.trim() === '' ? null : Number(sellingPrice),
      storageLocation: storageLocation.trim() === '' ? null : storageLocation.trim(),
    });
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
        <FormError error={submitError} />
      </div>
    </form>
  );
}
