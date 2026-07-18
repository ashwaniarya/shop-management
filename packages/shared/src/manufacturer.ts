import { z } from 'zod';

export const manufacturerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  code: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Manufacturer = z.infer<typeof manufacturerSchema>;

export const manufacturerCreateSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  code: z.string().nullable().optional(),
});
export type ManufacturerCreate = z.infer<typeof manufacturerCreateSchema>;

export const manufacturerUpdateSchema = manufacturerCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type ManufacturerUpdate = z.infer<typeof manufacturerUpdateSchema>;
