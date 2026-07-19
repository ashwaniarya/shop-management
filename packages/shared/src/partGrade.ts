import { z } from 'zod';

export const partGradeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PartGrade = z.infer<typeof partGradeSchema>;

export const partGradeCreateSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  displayOrder: z.number().int().optional(),
});
export type PartGradeCreate = z.infer<typeof partGradeCreateSchema>;

export const partGradeUpdateSchema = partGradeCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type PartGradeUpdate = z.infer<typeof partGradeUpdateSchema>;
