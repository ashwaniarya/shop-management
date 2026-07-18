'use client';

import { useCallback, useState } from 'react';

import { InventorySettingsForm } from '@/components/InventorySettingsForm';
import { Button } from '@/components/ui/Button';
import { describeError, ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { useAsync } from '@/hooks/useAsync';
import { useShopUsersLookup } from '@/hooks/useShopUsersLookup';
import { ApiError, createStockTransaction, getInventoryItem, upsertInventoryItem } from '@/lib/api';
import { formatQuantity } from '@/lib/format';
import { getFieldErrors } from '@/lib/zodFieldErrors';
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
  const { users } = useShopUsersLookup(shopId);

  const [movementType, setMovementType] = useState<StockTransactionType>('SALE');
  const [quantityText, setQuantityText] = useState('');
  const [unitPriceText, setUnitPriceText] = useState('');
  const [userId, setUserId] = useState<number | ''>('');
  const [movementNotes, setMovementNotes] = useState('');
  const [movementFieldErrors, setMovementFieldErrors] = useState<Record<string, string>>({});
  const [movementSubmitError, setMovementSubmitError] = useState<string | null>(null);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  function handleMovementSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMovementSubmitError(null);

    const parsed = stockTransactionCreateSchema.safeParse({
      partId,
      userId: userId === '' ? undefined : userId,
      type: movementType,
      quantity: quantityText.trim() === '' ? Number.NaN : Number(quantityText),
      unitPrice: unitPriceText.trim() === '' ? undefined : Number(unitPriceText),
      notes: movementNotes.trim() === '' ? undefined : movementNotes.trim(),
    });

    if (!parsed.success) {
      setMovementFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setMovementFieldErrors({});
    setIsSubmittingMovement(true);

    createStockTransaction(shopId, parsed.data)
      .then(() => {
        setQuantityText('');
        setUnitPriceText('');
        setMovementNotes('');
        refetchInventory();
      })
      .catch((submitError: unknown) => setMovementSubmitError(describeError(submitError)))
      .finally(() => setIsSubmittingMovement(false));
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
              options={MOVEMENT_TYPE_OPTIONS}
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
          <Select
            label="Staff member"
            required
            value={userId}
            onChange={(event) => setUserId(event.target.value === '' ? '' : Number(event.target.value))}
            error={movementFieldErrors.userId}
          >
            <option value="">Select…</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
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
            {movementSubmitError ? <span className="font-mono text-xs text-accent-400">{movementSubmitError}</span> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
