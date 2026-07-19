import type { Prisma } from '@prisma/client';
import { paginationQuerySchema, stockTransactionCreateSchema, stockTransactionTypeSchema } from '@shop/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireShop } from '../lib/assertExists';
import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { serializeStockTransaction } from '../lib/serialize';
import { requireSameShop } from '../middleware/authorize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { ForbiddenError } from '../services/errors';
import { appendStockTransaction, getTransactionsSummary } from '../services/stockLedger';

export const stockTransactionsRouter = Router();

const listStockTransactionsQuerySchema = paginationQuerySchema.extend({
  type: stockTransactionTypeSchema.optional(),
  partId: z.coerce.number().int().optional(),
  userId: z.coerce.number().int().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

stockTransactionsRouter.get(
  '/shops/:shopId/stock-transactions',
  requireSameShop(),
  validateQuery(listStockTransactionsQuerySchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    await requireShop(shopId);
    const query = getQuery<z.infer<typeof listStockTransactionsQuerySchema>>(res);
    const { skip, take } = toSkipTake(query);

    const where: Prisma.StockTransactionWhereInput = {
      shopId,
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.partId !== undefined ? { partId: query.partId } : {}),
      ...(query.userId !== undefined ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      // id DESC breaks createdAt ties deterministically in "newest first" order,
      // since autoincrement id order always matches insertion order.
      prisma.stockTransaction.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.stockTransaction.count({ where }),
    ]);

    res.json({ data: transactions.map(serializeStockTransaction), meta: buildMeta(query, total) });
  }),
);

stockTransactionsRouter.post(
  '/shops/:shopId/stock-transactions',
  requireSameShop(),
  validate(stockTransactionCreateSchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const { type } = req.body;

    // STAFF may only record sales; PURCHASE/ADJUSTMENT are manager/owner actions.
    if (type !== 'SALE' && req.user!.role === 'STAFF') {
      throw new ForbiddenError('Staff can only record sales');
    }

    // The acting user is taken from the authenticated token, never the body.
    // appendStockTransaction already validates shop/part/user existence and the
    // sign/insufficient-stock rules, so no separate pre-checks are needed here.
    const { transaction } = await appendStockTransaction({
      shopId,
      partId: req.body.partId,
      userId: req.user!.id,
      type,
      quantity: req.body.quantity,
      unitPrice: req.body.unitPrice ?? undefined,
      notes: req.body.notes ?? undefined,
    });

    res
      .status(201)
      .set('Location', `/api/v1/shops/${shopId}/stock-transactions/${transaction.id}`)
      .json(serializeStockTransaction(transaction));
  }),
);

const summaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

stockTransactionsRouter.get(
  '/shops/:shopId/stock-transactions/summary',
  requireSameShop(),
  validateQuery(summaryQuerySchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    await requireShop(shopId);
    const query = getQuery<z.infer<typeof summaryQuerySchema>>(res);

    const summary = await getTransactionsSummary(shopId, { from: query.from, to: query.to });

    res.json(summary);
  }),
);
