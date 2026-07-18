import { z } from 'zod';

export const refTypeSchema = z.enum(['OEM', 'COMPETITOR', 'SUPERSEDES', 'ALTERNATE']);
export type RefType = z.infer<typeof refTypeSchema>;

export const partCrossReferenceSchema = z.object({
  id: z.number().int(),
  partId: z.number().int(),
  refType: refTypeSchema,
  refNumber: z.string(),
  refBrand: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});
export type PartCrossReference = z.infer<typeof partCrossReferenceSchema>;

export const partCrossReferenceCreateSchema = z.object({
  refType: refTypeSchema,
  refNumber: z.string(),
  refBrand: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type PartCrossReferenceCreate = z.infer<typeof partCrossReferenceCreateSchema>;
