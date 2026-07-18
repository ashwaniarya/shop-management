import { z } from 'zod';

export const inventoryItemSchema = z.object({
  id: z.number().int(),
  shopId: z.number().int(),
  partId: z.number().int(),
  quantityOnHand: z.number(),
  reorderLevel: z.number().nullable(),
  costPrice: z.number().nullable(),
  sellingPrice: z.number().nullable(),
  storageLocation: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

// Strict on purpose: quantityOnHand (and any other unrecognized key) must be
// rejected outright rather than silently stripped, since it can only change as a
// side effect of posting stock transactions.
export const inventoryItemUpdateSchema = z
  .object({
    reorderLevel: z.number().nullable().optional(),
    costPrice: z.number().nullable().optional(),
    sellingPrice: z.number().nullable().optional(),
    storageLocation: z.string().nullable().optional(),
  })
  .strict();
export type InventoryItemUpdate = z.infer<typeof inventoryItemUpdateSchema>;
