'use client';

import { useCallback, useState } from 'react';

import { InventorySettingsForm } from '@/components/InventorySettingsForm';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { ApiError, createStockTransaction, getInventoryItem, upsertInventoryItem } from '@/lib/api';
import { formatQuantity } from '@/lib/format';
import { stockTransactionCreateSchema, type StockTransactionType } from '@shop/shared';

const MOVEMENT_TYPE_OPTIONS: { value: StockTransactionType; label: string }[] = [
  { value: 'SALE', label: 'Sale' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
];

interface StockSectionProps {
  partId: number;
  shopId: number;
}

export function StockSection({ partId, shopId }: StockSectionProps) {
  const inventoryFetcher = useCallback(
    () =>
      getInventoryItem(shopId, partId).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }),
    [shopId, partId],
  );
  const { data: inventoryItem, isLoading, error, retry: refetchInventory } = useAsync(inventoryFetcher);
  const { user } = useAuth();
  const isStaff = user?.role === 'STAFF';
  const movementTypeOptions = isStaff
    ? MOVEMENT_TYPE_OPTIONS.filter((option) => option.value === 'SALE')
    : MOVEMENT_TYPE_OPTIONS;

  const [movementType, setMovementType] = useState<StockTransactionType>('SALE');
  const [quantityText, setQuantityText] = useState('');
  const [unitPriceText, setUnitPriceText] = useState('');
  const [movementNotes, setMovementNotes] = useState('');

  const {
    fieldErrors: movementFieldErrors,
    submitError: movementSubmitError,
    isSubmitting: isSubmittingMovement,
    run: runMovement,
  } = useZodSubmit(stockTransactionCreateSchema, (data) => createStockTransaction(shopId, data), {
    onSuccess: () => {
      setQuantityText('');
      setUnitPriceText('');
      setMovementNotes('');
      refetchInventory();
    },
  });

  function handleMovementSubmit(event: React.FormEvent) {
    event.preventDefault();
    runMovement({
      partId,
      type: movementType,
      quantity: quantityText.trim() === '' ? Number.NaN : Number(quantityText),
      unitPrice: unitPriceText.trim() === '' ? undefined : Number(unitPriceText),
      notes: movementNotes.trim() === '' ? undefined : movementNotes.trim(),
    });
  }

  if (isLoading) {
    return <LoadingBlock label="Loading stock position…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={refetchInventory} title="Could not load stock for this shop" />;
  }

  const isPriceRequired = movementType === 'SALE' || movementType === 'PURCHASE';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-1 rounded-md border border-ink-800 bg-ink-900 p-5">
        <p className="text-[11px] font-medium tracking-[0.14em] text-ink-500 uppercase">Quantity on hand</p>
        <p className="font-mono text-5xl font-semibold tabular-nums text-ink-50">
          {formatQuantity(inventoryItem?.quantityOnHand ?? 0)}
        </p>
        {!inventoryItem ? (
          <p className="mt-1 text-xs text-ink-500">Not yet stocked in this shop — post a purchase to begin.</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-ink-800 bg-ink-900 p-4">
          <p className="mb-3 text-xs font-medium tracking-wide text-ink-300 uppercase">Stock settings</p>
          <InventorySettingsForm
            initialItem={inventoryItem}
            onSaved={refetchInventory}
            submit={(data) => upsertInventoryItem(shopId, partId, data)}
          />
        </div>

        <form
          onSubmit={handleMovementSubmit}
          className="flex flex-col gap-3 rounded-md border border-ink-800 bg-ink-900 p-4"
        >
          <p className="text-xs font-medium tracking-wide text-ink-300 uppercase">Record stock movement</p>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-300">Type</span>
            <SegmentedControl
              label="Movement type"
              options={movementTypeOptions}
              value={movementType}
              onChange={setMovementType}
            />
          </div>
          <Input
            label="Quantity"
            required
            value={quantityText}
            onChange={(event) => setQuantityText(event.target.value)}
            error={movementFieldErrors.quantity}
            hint={
              isPriceRequired
                ? 'Positive quantity — the sign is applied automatically.'
                : 'Signed delta, e.g. -2 for a shrinkage write-off.'
            }
            type="number"
            step="any"
            min={isPriceRequired ? 0.01 : undefined}
            className="font-mono tabular-nums"
          />
          <Input
            label={`Unit price${isPriceRequired ? '' : ' (optional)'}`}
            required={isPriceRequired}
            value={unitPriceText}
            onChange={(event) => setUnitPriceText(event.target.value)}
            error={movementFieldErrors.unitPrice}
            type="number"
            step="any"
            min={0}
            className="font-mono tabular-nums"
          />
          <Input
            label="Notes"
            placeholder="Optional"
            value={movementNotes}
            onChange={(event) => setMovementNotes(event.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingMovement}>
              Post movement
            </Button>
            <FormError error={movementSubmitError} />
          </div>
        </form>
      </div>
    </div>
  );
}
