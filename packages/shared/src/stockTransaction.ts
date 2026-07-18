import { z } from 'zod';

export const stockTransactionTypeSchema = z.enum(['SALE', 'PURCHASE', 'ADJUSTMENT']);
export type StockTransactionType = z.infer<typeof stockTransactionTypeSchema>;

export const stockTransactionSchema = z.object({
  id: z.number().int(),
  shopId: z.number().int(),
  partId: z.number().int(),
  userId: z.number().int(),
  type: stockTransactionTypeSchema,
  quantity: z.number(),
  unitPrice: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});
export type StockTransaction = z.infer<typeof stockTransactionSchema>;

const stockTransactionCreateShape = z.object({
  partId: z.number().int(),
  userId: z.number().int(),
  type: stockTransactionTypeSchema,
  quantity: z.number(),
  unitPrice: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// The sign rule: SALE/PURCHASE are always entered as a positive quantity (the API
// applies the sign) and must carry a unitPrice; ADJUSTMENT passes its signed delta
// directly and unitPrice stays optional. This mirrors, and fails fast ahead of, the
// same checks appendStockTransaction() makes against the database.
export const stockTransactionCreateSchema = stockTransactionCreateShape.superRefine((value, ctx) => {
  if (value.type === 'SALE' || value.type === 'PURCHASE') {
    if (!(value.quantity > 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: `quantity must be positive for ${value.type}`,
      });
    }
    if (value.unitPrice === undefined || value.unitPrice === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['unitPrice'],
        message: `unitPrice is required for ${value.type}`,
      });
    }
  } else if (value.quantity === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'quantity must be non-zero for ADJUSTMENT',
    });
  }
});
export type StockTransactionCreate = z.infer<typeof stockTransactionCreateSchema>;
