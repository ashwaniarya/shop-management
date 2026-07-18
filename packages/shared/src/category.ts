import { z } from 'zod';

export const categorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  parentCategoryId: z.number().int().nullable(),
  displayOrder: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  parentCategoryId: z.number().int().nullable().optional(),
  displayOrder: z.number().int().optional(),
});
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = categoryCreateSchema.partial();
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
