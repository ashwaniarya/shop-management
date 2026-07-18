import { z } from 'zod';

export const shopSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  gstin: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Shop = z.infer<typeof shopSchema>;

export const shopCreateSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
});
export type ShopCreate = z.infer<typeof shopCreateSchema>;

export const shopUpdateSchema = shopCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type ShopUpdate = z.infer<typeof shopUpdateSchema>;
