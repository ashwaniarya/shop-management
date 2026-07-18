'use client';

import { useState } from 'react';

import { FormActions } from '@/components/ui/FormActions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { ApiError, createPart, updatePart } from '@/lib/api';
import { buildCategoryOptions } from '@/lib/categoryTree';
import { partCreateSchema, partUpdateSchema, type Category, type Manufacturer, type Part } from '@shop/shared';

interface PartFormDialogProps {
  part: Part | null;
  manufacturers: Manufacturer[];
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (part: Part) => void;
}

// The unique-sku and unique-(manufacturer, MPN) indexes both surface as a bare 409;
// rethrown with a message that names the two fields a counter operator can actually fix.
function rethrowWithDuplicateNumberMessage(error: unknown): never {
  if (error instanceof ApiError && error.status === 409) {
    throw new ApiError(409, {
      code: error.code,
      message: 'A part with this SKU or manufacturer part number already exists',
    });
  }
  throw error;
}

export function PartFormDialog({ part, manufacturers, categories, isOpen, onClose, onSaved }: PartFormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={part ? `Edit part — ${part.sku}` : 'New part'}>
      {isOpen ? (
        <PartForm
          key={part ? `edit-${part.id}` : 'create'}
          part={part}
          manufacturers={manufacturers}
          categories={categories}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function PartForm({
  part,
  manufacturers,
  categories,
  onClose,
  onSaved,
}: {
  part: Part | null;
  manufacturers: Manufacturer[];
  categories: Category[];
  onClose: () => void;
  onSaved: (part: Part) => void;
}) {
  const [sku, setSku] = useState(part?.sku ?? '');
  const [name, setName] = useState(part?.name ?? '');
  const [manufacturerId, setManufacturerId] = useState<number | ''>(part?.manufacturerId ?? '');
  const [manufacturerPartNumber, setManufacturerPartNumber] = useState(part?.manufacturerPartNumber ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(part?.categoryId ?? '');
  const [description, setDescription] = useState(part?.description ?? '');
  const [unitOfMeasure, setUnitOfMeasure] = useState(part?.unitOfMeasure ?? 'piece');
  const [mrp, setMrp] = useState(part?.mrp?.toString() ?? '');
  const [isActive, setIsActive] = useState(part?.isActive ?? true);

  const categoryOptions = buildCategoryOptions(categories);

  const closeAfterSave = (savedPart: Part) => {
    onSaved(savedPart);
    onClose();
  };
  const createSubmit = useZodSubmit(
    partCreateSchema,
    (data) => createPart(data).catch(rethrowWithDuplicateNumberMessage),
    { onSuccess: closeAfterSave },
  );
  const updateSubmit = useZodSubmit(
    partUpdateSchema,
    (data) =>
      part
        ? updatePart(part.id, data).catch(rethrowWithDuplicateNumberMessage)
        : Promise.reject(new Error('No part selected')),
    { onSuccess: closeAfterSave },
  );
  const { fieldErrors, submitError, isSubmitting, run } = part ? updateSubmit : createSubmit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const sharedFields = {
      sku: sku.trim(),
      name: name.trim(),
      manufacturerId: manufacturerId === '' ? undefined : manufacturerId,
      manufacturerPartNumber: manufacturerPartNumber.trim(),
      categoryId: categoryId === '' ? undefined : categoryId,
      description: description.trim() === '' ? null : description.trim(),
      unitOfMeasure: unitOfMeasure.trim() === '' ? undefined : unitOfMeasure.trim(),
      mrp: mrp.trim() === '' ? null : Number(mrp),
    };
    run(part ? { ...sharedFields, isActive } : sharedFields);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="SKU"
          required
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          error={fieldErrors.sku}
          className="font-mono"
        />
        <Input
          label="Mfr. part number"
          required
          value={manufacturerPartNumber}
          onChange={(event) => setManufacturerPartNumber(event.target.value)}
          error={fieldErrors.manufacturerPartNumber}
          className="font-mono"
        />
      </div>
      <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} error={fieldErrors.name} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Manufacturer"
          required
          value={manufacturerId}
          onChange={(event) => setManufacturerId(event.target.value === '' ? '' : Number(event.target.value))}
          error={fieldErrors.manufacturerId}
        >
          <option value="">Select a manufacturer…</option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </Select>
        <Select
          label="Category"
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value === '' ? '' : Number(event.target.value))}
          error={fieldErrors.categoryId}
        >
          <option value="">Select a category…</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Description"
        placeholder="Optional"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={fieldErrors.description}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Unit of measure"
          value={unitOfMeasure}
          onChange={(event) => setUnitOfMeasure(event.target.value)}
          error={fieldErrors.unitOfMeasure}
        />
        <Input
          label="MRP"
          placeholder="Optional"
          value={mrp}
          onChange={(event) => setMrp(event.target.value)}
          error={fieldErrors.mrp}
          type="number"
          step="any"
          min={0}
          className="font-mono tabular-nums"
        />
      </div>
      {part ? (
        <label className="inline-flex items-center gap-1.5 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent-500"
          />
          Active in catalog
        </label>
      ) : null}
      <FormActions
        submitLabel={part ? 'Save changes' : 'Create part'}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={onClose}
      />
    </form>
  );
}
