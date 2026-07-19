'use client';

import { useEffect, useState } from 'react';

import type { PartFormValues } from '@/components/parts/buildPartFormPayload';
import { CopyOfPartPicker, type CopyOfPartSelection } from '@/components/parts/CopyOfPartPicker';
import { reconcileCopyOfPrefill } from '@/components/parts/reconcileCopyOfPrefill';
import { Input } from '@/components/ui/Input';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Select } from '@/components/ui/Select';
import { getPart360 } from '@/lib/api';
import { buildCategoryOptions } from '@/lib/categoryTree';
import type { Category, Manufacturer, Part, PartGrade } from '@shop/shared';

export interface PartFormValuesController extends PartFormValues {
  setSku: (value: string) => void;
  setName: (value: string) => void;
  setManufacturerId: (value: number | '') => void;
  setManufacturerPartNumber: (value: string) => void;
  setCategoryId: (value: number | '') => void;
  setDescription: (value: string) => void;
  setUnitOfMeasure: (value: string) => void;
  setMrp: (value: string) => void;
  setGradeId: (value: number | '') => void;
  setCopyOf: (value: CopyOfPartSelection | null) => void;
}

// Shared by PartFormDialog (create + edit) and the full-screen /parts/new page: seeds
// from an existing part when editing, and resolves the copy-of picker's prefill the
// same way in both hosts.
export function usePartFormValues(part: Part | null): PartFormValuesController {
  const [sku, setSku] = useState(part?.sku ?? '');
  const [name, setName] = useState(part?.name ?? '');
  const [manufacturerId, setManufacturerId] = useState<number | ''>(part?.manufacturerId ?? '');
  const [manufacturerPartNumber, setManufacturerPartNumber] = useState(part?.manufacturerPartNumber ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(part?.categoryId ?? '');
  const [description, setDescription] = useState(part?.description ?? '');
  const [unitOfMeasure, setUnitOfMeasure] = useState(part?.unitOfMeasure ?? 'piece');
  const [mrp, setMrp] = useState(part?.mrp?.toString() ?? '');
  const [gradeId, setGradeId] = useState<number | ''>(part?.gradeId ?? '');
  // Seeded with an id-only placeholder so a save during (or after a failed) sku/name
  // lookup still submits the existing link instead of silently clearing it.
  const [copyOf, setCopyOf] = useState<CopyOfPartSelection | null>(
    part?.copyOfPartId ? { id: part.copyOfPartId, sku: `#${part.copyOfPartId}`, name: '' } : null,
  );

  const linkedCopyOfPartId = part?.copyOfPartId;
  useEffect(() => {
    if (!linkedCopyOfPartId) {
      return;
    }
    let isCancelled = false;
    getPart360(linkedCopyOfPartId)
      .then((originalPart) => {
        if (isCancelled) {
          return;
        }
        setCopyOf((current) =>
          reconcileCopyOfPrefill(current, { id: originalPart.id, sku: originalPart.sku, name: originalPart.name }),
        );
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [linkedCopyOfPartId]);

  return {
    sku,
    setSku,
    name,
    setName,
    manufacturerId,
    setManufacturerId,
    manufacturerPartNumber,
    setManufacturerPartNumber,
    categoryId,
    setCategoryId,
    description,
    setDescription,
    unitOfMeasure,
    setUnitOfMeasure,
    mrp,
    setMrp,
    gradeId,
    setGradeId,
    copyOf,
    setCopyOf,
  };
}

interface PartFormFieldsProps {
  values: PartFormValuesController;
  manufacturers: Manufacturer[];
  categories: Category[];
  partGrades: PartGrade[];
  fieldErrors: Record<string, string>;
  // 'dialog' (default) renders the exact compact grouping PartFormDialog has always
  // used. 'page' renders the same fields under generously spaced, headed sections for
  // the full-screen /parts/new route — same inputs and state, different arrangement.
  layout?: 'dialog' | 'page';
}

export function PartFormFields({
  values,
  manufacturers,
  categories,
  partGrades,
  fieldErrors,
  layout = 'dialog',
}: PartFormFieldsProps) {
  const categoryOptions = buildCategoryOptions(categories);

  const skuField = (
    <Input
      label="SKU"
      required
      value={values.sku}
      onChange={(event) => values.setSku(event.target.value)}
      error={fieldErrors.sku}
      className="font-mono"
    />
  );
  const manufacturerPartNumberField = (
    <Input
      label="Mfr. part number"
      required
      value={values.manufacturerPartNumber}
      onChange={(event) => values.setManufacturerPartNumber(event.target.value)}
      error={fieldErrors.manufacturerPartNumber}
      className="font-mono"
    />
  );
  const nameField = (
    <Input
      label="Name"
      required
      value={values.name}
      onChange={(event) => values.setName(event.target.value)}
      error={fieldErrors.name}
    />
  );
  const manufacturerField = (
    <Select
      label="Manufacturer"
      required
      value={values.manufacturerId}
      onChange={(event) => values.setManufacturerId(event.target.value === '' ? '' : Number(event.target.value))}
      error={fieldErrors.manufacturerId}
    >
      <option value="">Select a manufacturer…</option>
      {manufacturers.map((manufacturer) => (
        <option key={manufacturer.id} value={manufacturer.id}>
          {manufacturer.name}
        </option>
      ))}
    </Select>
  );
  const categoryField = (
    <Select
      label="Category"
      required
      value={values.categoryId}
      onChange={(event) => values.setCategoryId(event.target.value === '' ? '' : Number(event.target.value))}
      error={fieldErrors.categoryId}
    >
      <option value="">Select a category…</option>
      {categoryOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </Select>
  );
  const gradeField = (
    <Select
      label="Grade"
      value={values.gradeId}
      onChange={(event) => values.setGradeId(event.target.value === '' ? '' : Number(event.target.value))}
      error={fieldErrors.gradeId}
    >
      <option value="">Ungraded</option>
      {partGrades.map((grade) => (
        <option key={grade.id} value={grade.id}>
          {grade.name}
        </option>
      ))}
    </Select>
  );
  const copyOfField = <CopyOfPartPicker value={values.copyOf} onSelect={values.setCopyOf} />;
  const descriptionField = (
    <Input
      label="Description"
      placeholder="Optional"
      value={values.description}
      onChange={(event) => values.setDescription(event.target.value)}
      error={fieldErrors.description}
    />
  );
  const unitOfMeasureField = (
    <Input
      label="Unit of measure"
      value={values.unitOfMeasure}
      onChange={(event) => values.setUnitOfMeasure(event.target.value)}
      error={fieldErrors.unitOfMeasure}
    />
  );
  const mrpField = (
    <Input
      label="MRP"
      placeholder="Optional"
      value={values.mrp}
      onChange={(event) => values.setMrp(event.target.value)}
      error={fieldErrors.mrp}
      type="number"
      inputMode="decimal"
      step="any"
      min={0}
      className="font-mono tabular-nums"
    />
  );

  if (layout === 'page') {
    return (
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <SectionHeading>Identity</SectionHeading>
          {skuField}
          {manufacturerPartNumberField}
          {nameField}
        </section>
        <section className="flex flex-col gap-4">
          <SectionHeading>Classification</SectionHeading>
          {manufacturerField}
          {categoryField}
          {gradeField}
          {copyOfField}
          {descriptionField}
          {unitOfMeasureField}
        </section>
        <section className="flex flex-col gap-4">
          <SectionHeading>Pricing</SectionHeading>
          {mrpField}
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {skuField}
        {manufacturerPartNumberField}
      </div>
      {nameField}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {manufacturerField}
        {categoryField}
        {gradeField}
      </div>
      {copyOfField}
      {descriptionField}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {unitOfMeasureField}
        {mrpField}
      </div>
    </>
  );
}
