import { z } from 'zod';

export const supplierSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  contactPerson: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  gstin: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Supplier = z.infer<typeof supplierSchema>;

export const supplierCreateSchema = z.object({
  name: z.string(),
  contactPerson: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type SupplierCreate = z.infer<typeof supplierCreateSchema>;

export const supplierUpdateSchema = supplierCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type SupplierUpdate = z.infer<typeof supplierUpdateSchema>;
