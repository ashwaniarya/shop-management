'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { buildPartFormPayload } from '@/components/parts/buildPartFormPayload';
import { PartFormFields, usePartFormValues } from '@/components/parts/PartFormFields';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useShop } from '@/context/ShopContext';
import { useCategoriesLookup } from '@/hooks/useCategoriesLookup';
import { useManufacturersLookup } from '@/hooks/useManufacturersLookup';
import { usePartGradesLookup } from '@/hooks/usePartGradesLookup';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { ApiError, createPart, upsertInventoryItem } from '@/lib/api';
import { describeError } from '@/lib/describeError';
import { partCreateSchema, type Part } from '@shop/shared';

// Mirrors PartFormDialog's own rethrow — the two 409-shaping call sites don't
// otherwise share code, so this stays local rather than forcing a shared import.
function rethrowWithDuplicateNumberMessage(error: unknown): never {
  if (error instanceof ApiError && error.status === 409) {
    throw new ApiError(409, {
      code: error.code,
      message: 'A part with this SKU or manufacturer part number already exists',
    });
  }
  throw error;
}

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M9.5 3 4 8l5.5 5M4.5 8h8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NewPartPage() {
  const router = useRouter();
  const { shops, isLoading, selectedShopId } = useShop();
  const { manufacturers } = useManufacturersLookup();
  const { categories } = useCategoriesLookup();
  const { partGrades } = usePartGradesLookup();

  const values = usePartFormValues(null);
  const [sellingPrice, setSellingPrice] = useState('');

  // Set only when createPart succeeded but the follow-up inventory write failed — the
  // part already exists at this point, so the page drops into a small recovery view
  // instead of silently losing that fact.
  const [createdPart, setCreatedPart] = useState<Part | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceSaveError, setPriceSaveError] = useState<string | null>(null);

  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? null;

  async function saveSellingPriceThenNavigate(part: Part) {
    const trimmedSellingPrice = sellingPrice.trim();
    if (trimmedSellingPrice === '' || selectedShopId === null) {
      router.push(`/parts/${part.id}`);
      return;
    }
    setIsSavingPrice(true);
    setPriceSaveError(null);
    try {
      await upsertInventoryItem(selectedShopId, part.id, { sellingPrice: Number(trimmedSellingPrice) });
      router.push(`/parts/${part.id}`);
    } catch (error) {
      setCreatedPart(part);
      setPriceSaveError(describeError(error));
    } finally {
      setIsSavingPrice(false);
    }
  }

  const { fieldErrors, submitError, isSubmitting, run } = useZodSubmit(
    partCreateSchema,
    (data) => createPart(data).catch(rethrowWithDuplicateNumberMessage),
    { onSuccess: saveSellingPriceThenNavigate },
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    run(buildPartFormPayload(values));
  }

  if (createdPart) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-5 py-10">
        <div className="rounded-md border border-accent-800 bg-accent-950 p-5">
          <p className="text-sm font-medium text-ink-100">
            Part <span className="font-mono">{createdPart.sku}</span> was created.
          </p>
          <p className="mt-1.5 font-mono text-xs text-accent-300">Saving the selling price failed: {priceSaveError}</p>
        </div>
        <Input
          label="Selling price (this shop)"
          value={sellingPrice}
          onChange={(event) => setSellingPrice(event.target.value)}
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          className="font-mono tabular-nums"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            isLoading={isSavingPrice}
            onClick={() => saveSellingPriceThenNavigate(createdPart)}
          >
            Retry saving price
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/parts/${createdPart.id}`)}>
            Skip — view part
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 pb-28">
        <div>
          <Link
            href="/parts"
            className="-ml-2.5 inline-flex h-11 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-100"
          >
            <BackArrowIcon />
            Parts catalog
          </Link>
          <h1 className="font-display mt-2 text-2xl font-bold tracking-wide text-ink-50 uppercase">New part</h1>
          <p className="mt-1 text-sm text-ink-500">Add a part to the shared catalog.</p>
        </div>

        <form id="new-part-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
          <PartFormFields
            values={values}
            manufacturers={manufacturers}
            categories={categories}
            partGrades={partGrades}
            fieldErrors={fieldErrors}
            layout="page"
          />

          <section className="flex flex-col gap-4">
            <SectionHeading>Selling price</SectionHeading>
            {isLoading ? (
              <LoadingBlock label="Loading shops…" />
            ) : shops.length === 0 ? (
              <EmptyState
                title="No shops configured yet"
                description="Add a shop from the Shops screen to set a per-shop selling price."
              />
            ) : selectedShopId === null ? (
              <EmptyState
                title="Select a shop"
                description="Choose a shop from the header above to set a selling price for this part."
              />
            ) : (
              <Input
                label={`Selling price — ${selectedShop?.name ?? 'this shop'}`}
                placeholder="Optional"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                className="font-mono tabular-nums"
                hint="Sets this shop's inventory price for the new part. Leave blank to set it later from Inventory."
              />
            )}
          </section>
        </form>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-ink-800 bg-ink-900 px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
          <Button
            type="submit"
            form="new-part-form"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Create part
          </Button>
          <FormError error={submitError} />
        </div>
      </div>
    </div>
  );
}
