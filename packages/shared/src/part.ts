import { z } from 'zod';

export const partSchema = z.object({
  id: z.number().int(),
  sku: z.string(),
  manufacturerId: z.number().int(),
  manufacturerPartNumber: z.string(),
  name: z.string(),
  categoryId: z.number().int(),
  description: z.string().nullable(),
  unitOfMeasure: z.string(),
  mrp: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Part = z.infer<typeof partSchema>;

export const partCreateSchema = z.object({
  sku: z.string(),
  manufacturerId: z.number().int(),
  manufacturerPartNumber: z.string(),
  name: z.string(),
  categoryId: z.number().int(),
  description: z.string().nullable().optional(),
  unitOfMeasure: z.string().default('piece'),
  mrp: z.number().nullable().optional(),
});
export type PartCreate = z.infer<typeof partCreateSchema>;

// .partial() leaves an already-`.default()`-ed field defaulting (zod only wraps the
// strictly-required fields), so unitOfMeasure needs an explicit override here: an
// omitted value on update must parse to `undefined` (leave the column untouched),
// not reset to 'piece' — the correct PATCH semantics, verified in part.test.ts.
export const partUpdateSchema = partCreateSchema.partial().extend({
  unitOfMeasure: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type PartUpdate = z.infer<typeof partUpdateSchema>;
