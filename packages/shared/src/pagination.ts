import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const metaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});
export type Meta = z.infer<typeof metaSchema>;

export function listResponseSchema<ItemSchema extends z.ZodType>(itemSchema: ItemSchema) {
  return z.object({
    data: z.array(itemSchema),
    meta: metaSchema,
  });
}
