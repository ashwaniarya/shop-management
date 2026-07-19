import { z } from 'zod';

export const invoiceLineCreateSchema = z.object({
  partId: z.number().int().positive(),
  quantity: z.number().positive().finite(),
  unitPrice: z.number().min(0).finite(),
});
export type InvoiceLineCreate = z.infer<typeof invoiceLineCreateSchema>;

export const invoiceCreateSchema = z.object({
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(invoiceLineCreateSchema).min(1, 'an invoice needs at least one line'),
});
export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>;

export const invoiceLineSchema = z.object({
  id: z.number().int(),
  invoiceId: z.number().int(),
  partId: z.number().int(),
  stockTransactionId: z.number().int(),
  partSku: z.string(),
  partName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

export const invoiceSchema = z.object({
  id: z.number().int(),
  shopId: z.number().int(),
  userId: z.number().int(),
  invoiceNumber: z.string(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  notes: z.string().nullable(),
  total: z.number(),
  createdAt: z.string(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceListItemSchema = invoiceSchema.extend({
  itemCount: z.number().int(),
});
export type InvoiceListItem = z.infer<typeof invoiceListItemSchema>;

export const invoiceDetailSchema = invoiceSchema.extend({
  lines: z.array(invoiceLineSchema),
  salesmanName: z.string(),
  shop: z.object({
    name: z.string(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    gstin: z.string().nullable(),
  }),
});
export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;

export function formatInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(6, '0')}`;
}
