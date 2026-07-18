import type { Prisma } from '@prisma/client';
import { inventoryItemUpdateSchema, paginationQuerySchema } from '@shop/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requirePart, requireShop } from '../lib/assertExists';
import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { booleanQueryParam } from '../lib/queryBoolean';
import { serializeInventoryItem } from '../lib/serialize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';

export const inventoryRouter = Router();

const inventoryRowInclude = { part: { include: { manufacturer: true } } } as const;
type InventoryRowPayload = Prisma.InventoryItemGetPayload<{ include: typeof inventoryRowInclude }>;

function toInventoryRowDto(item: InventoryRowPayload) {
  return {
    ...serializeInventoryItem(item),
    part: {
      sku: item.part.sku,
      name: item.part.name,
      manufacturerName: item.part.manufacturer.name,
    },
  };
}

const listInventoryQuerySchema = paginationQuerySchema.extend({
  belowReorder: booleanQueryParam.optional(),
  categoryId: z.coerce.number().int().optional(),
  q: z.string().optional(),
});

inventoryRouter.get(
  '/shops/:shopId/inventory',
  validateQuery(listInventoryQuerySchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    await requireShop(shopId);
    const query = getQuery<z.infer<typeof listInventoryQuerySchema>>(res);

    const where: Prisma.InventoryItemWhereInput = {
      shopId,
      ...(query.categoryId !== undefined || query.q
        ? {
            part: {
              ...(query.categoryId !== undefined ? { categoryId: query.categoryId } : {}),
              ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
            },
          }
        : {}),
    };

    if (query.belowReorder) {
      // reorderLevel and quantityOnHand live on the same row, so Prisma's filter DSL
      // can't compare them directly (it has no field-to-field operator); a shop's
      // inventory is small enough that filtering this one case in memory is simpler
      // than a raw-SQL escape hatch.
      const candidates = await prisma.inventoryItem.findMany({
        where,
        include: inventoryRowInclude,
        orderBy: { id: 'asc' },
      });
      const belowReorderRows = candidates.filter(
        (item) => item.reorderLevel !== null && item.quantityOnHand.lte(item.reorderLevel),
      );
      const { skip, take } = toSkipTake(query);
      const page = belowReorderRows.slice(skip, skip + take);

      res.json({ data: page.map(toInventoryRowDto), meta: buildMeta(query, belowReorderRows.length) });
      return;
    }

    const { skip, take } = toSkipTake(query);
    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({ where, include: inventoryRowInclude, skip, take, orderBy: { id: 'asc' } }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({ data: items.map(toInventoryRowDto), meta: buildMeta(query, total) });
  }),
);

inventoryRouter.get(
  '/shops/:shopId/inventory/:partId',
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const partId = requireIdParam(req.params.partId, 'partId');
    await requireShop(shopId);

    const item = await prisma.inventoryItem.findUnique({ where: { shopId_partId: { shopId, partId } } });
    if (!item) {
      throw new NotFoundError(`Inventory item for part ${partId} not found in shop ${shopId}`);
    }

    res.json(serializeInventoryItem(item));
  }),
);

inventoryRouter.put(
  '/shops/:shopId/inventory/:partId',
  validate(inventoryItemUpdateSchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const partId = requireIdParam(req.params.partId, 'partId');
    await requireShop(shopId);
    await requirePart(partId);

    const item = await prisma.inventoryItem.upsert({
      where: { shopId_partId: { shopId, partId } },
      create: { shopId, partId, ...req.body },
      update: req.body,
    });

    res.json(serializeInventoryItem(item));
  }),
);
