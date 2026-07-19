import { paginationQuerySchema, shopCreateSchema, shopUpdateSchema, userCreateSchema, userUpdateSchema } from '@shop/shared';
import { Router } from 'express';

import { requireShop } from '../lib/assertExists';
import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { requireRole, requireSameShop } from '../middleware/authorize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';

export const shopsRouter = Router();

// --- Shops ----------------------------------------------------------------------

shopsRouter.get(
  '/shops',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [data, total] = await Promise.all([
      prisma.shop.findMany({ skip, take, orderBy: { id: 'asc' } }),
      prisma.shop.count(),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

shopsRouter.post(
  '/shops',
  requireRole('OWNER'),
  validate(shopCreateSchema),
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/shops/${shop.id}`).json(shop);
  }),
);

shopsRouter.get(
  '/shops/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const shop = await requireShop(id);

    res.json(shop);
  }),
);

shopsRouter.patch(
  '/shops/:id',
  requireRole('OWNER'),
  validate(shopUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const shop = await prisma.shop.update({ where: { id }, data: req.body });

    res.json(shop);
  }),
);

shopsRouter.delete(
  '/shops/:id',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.shop.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);

// --- Shop Users -------------------------------------------------------------------

async function requireShopUser(shopId: number, userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.shopId !== shopId) {
    throw new NotFoundError(`User ${userId} not found on shop ${shopId}`);
  }
  return user;
}

shopsRouter.get(
  '/shops/:shopId/users',
  requireSameShop(),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    await requireShop(shopId);
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [data, total] = await Promise.all([
      prisma.user.findMany({ where: { shopId }, skip, take, orderBy: { id: 'asc' } }),
      prisma.user.count({ where: { shopId } }),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

shopsRouter.post(
  '/shops/:shopId/users',
  requireRole('OWNER'),
  requireSameShop(),
  validate(userCreateSchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    await requireShop(shopId);

    const user = await prisma.user.create({ data: { ...req.body, shopId } });

    res.status(201).set('Location', `/api/v1/shops/${shopId}/users/${user.id}`).json(user);
  }),
);

shopsRouter.get(
  '/shops/:shopId/users/:id',
  requireSameShop(),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const id = requireIdParam(req.params.id);
    const user = await requireShopUser(shopId, id);

    res.json(user);
  }),
);

shopsRouter.patch(
  '/shops/:shopId/users/:id',
  requireRole('OWNER'),
  requireSameShop(),
  validate(userUpdateSchema),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const id = requireIdParam(req.params.id);
    await requireShopUser(shopId, id);

    const user = await prisma.user.update({ where: { id }, data: req.body });

    res.json(user);
  }),
);

shopsRouter.delete(
  '/shops/:shopId/users/:id',
  requireRole('OWNER'),
  requireSameShop(),
  asyncHandler(async (req, res) => {
    const shopId = requireIdParam(req.params.shopId, 'shopId');
    const id = requireIdParam(req.params.id);
    await requireShopUser(shopId, id);

    await prisma.user.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);
