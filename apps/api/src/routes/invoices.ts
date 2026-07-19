import type { Prisma } from '@prisma/client';
import { invoiceCreateSchema, paginationQuerySchema } from '@shop/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireShop } from '../lib/assertExists';
import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { serializeInvoice, serializeInvoiceDetail } from '../lib/serialize';
import { requireSameShop } from '../middleware/authorize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';
import { createInvoice } from '../services/invoicing';

export const invoicesRouter = Router();

const listInvoicesQuerySchema = paginationQuerySchema.extend({
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

invoicesRouter.get(
  '/shops/:shopId/invoices',
  requireSameShop(),
  validateQuery(listInvoicesQuerySchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    await requireShop(shopId);
    const query = getQuery<z.infer<typeof listInvoicesQuerySchema>>(res);
    const { skip, take } = toSkipTake(query);

    const where: Prisma.InvoiceWhereInput = {
      shopId,
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { invoiceNumber: { contains: query.q, mode: 'insensitive' } },
              { customerName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { _count: { select: { lines: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      data: invoices.map((invoice) => ({ ...serializeInvoice(invoice), itemCount: invoice._count.lines })),
      meta: buildMeta(query, total),
    });
  }),
);

invoicesRouter.post(
  '/shops/:shopId/invoices',
  requireSameShop(),
  validate(invoiceCreateSchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const shop = await requireShop(shopId);

    // Any authenticated same-shop user may ring up a sale (no requireRole) — a
    // walk-in checkout is a STAFF action, unlike PURCHASE/ADJUSTMENT on the raw
    // ledger. The acting user comes from the token, never the body.
    const invoice = await createInvoice({
      shopId,
      userId: req.user!.id,
      customerName: req.body.customerName ?? null,
      customerPhone: req.body.customerPhone ?? null,
      notes: req.body.notes ?? null,
      lines: req.body.lines,
    });

    res
      .status(201)
      .set('Location', `/api/v1/shops/${shopId}/invoices/${invoice.id}`)
      .json(
        serializeInvoiceDetail(invoice, {
          salesmanName: req.user!.name,
          shop: { name: shop.name, address: shop.address, phone: shop.phone, gstin: shop.gstin },
        }),
      );
  }),
);

invoicesRouter.get(
  '/shops/:shopId/invoices/:id',
  requireSameShop(),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const id = requireIdParam(req.params.id);

    // Scoping the lookup by shopId (rather than looking up by id alone and
    // checking shopId after) means an invoice id that belongs to another shop
    // 404s instead of ever being fetched.
    const invoice = await prisma.invoice.findFirst({
      where: { id, shopId },
      include: {
        lines: { orderBy: { id: 'asc' } },
        user: { select: { name: true } },
        shop: { select: { name: true, address: true, phone: true, gstin: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundError(`Invoice ${id} not found in shop ${shopId}`);
    }

    res.json(serializeInvoiceDetail(invoice, { salesmanName: invoice.user.name, shop: invoice.shop }));
  }),
);
