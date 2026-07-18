import { z } from 'zod';

export const supplierPartSchema = z.object({
  id: z.number().int(),
  partId: z.number().int(),
  supplierId: z.number().int(),
  supplierPartNumber: z.string().nullable(),
  isPreferred: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupplierPart = z.infer<typeof supplierPartSchema>;

export const supplierPartCreateSchema = z.object({
  supplierId: z.number().int(),
  supplierPartNumber: z.string().nullable().optional(),
  isPreferred: z.boolean().default(false),
});
export type SupplierPartCreate = z.infer<typeof supplierPartCreateSchema>;

// Not derived from Create: supplierId cannot be reassigned on an existing link, so
// Update carries only the two fields the contract's SupplierPartUpdate documents.
export const supplierPartUpdateSchema = z.object({
  supplierPartNumber: z.string().nullable().optional(),
  isPreferred: z.boolean().optional(),
});
export type SupplierPartUpdate = z.infer<typeof supplierPartUpdateSchema>;
