import type { CopyOfPartSelection } from '@/components/parts/CopyOfPartPicker';

export interface PartFormValues {
  sku: string;
  name: string;
  manufacturerId: number | '';
  manufacturerPartNumber: string;
  categoryId: number | '';
  description: string;
  unitOfMeasure: string;
  mrp: string;
  gradeId: number | '';
  copyOf: CopyOfPartSelection | null;
}

// Shared submit-payload shape for both partCreateSchema and partUpdateSchema. The
// dialog's edit path spreads `isActive` on top of this; that field lives outside
// PartFormValues since only edit mode has it.
export function buildPartFormPayload(values: PartFormValues) {
  return {
    sku: values.sku.trim(),
    name: values.name.trim(),
    manufacturerId: values.manufacturerId === '' ? undefined : values.manufacturerId,
    manufacturerPartNumber: values.manufacturerPartNumber.trim(),
    categoryId: values.categoryId === '' ? undefined : values.categoryId,
    description: values.description.trim() === '' ? null : values.description.trim(),
    unitOfMeasure: values.unitOfMeasure.trim() === '' ? undefined : values.unitOfMeasure.trim(),
    mrp: values.mrp.trim() === '' ? null : Number(values.mrp),
    gradeId: values.gradeId === '' ? null : values.gradeId,
    copyOfPartId: values.copyOf?.id ?? null,
  };
}
