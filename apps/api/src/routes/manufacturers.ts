import { manufacturerCreateSchema, manufacturerUpdateSchema, paginationQuerySchema } from '@shop/shared';
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/authorize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';

export const manufacturersRouter = Router();

manufacturersRouter.get(
  '/manufacturers',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [data, total] = await Promise.all([
      prisma.manufacturer.findMany({ skip, take, orderBy: { id: 'asc' } }),
      prisma.manufacturer.count(),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

manufacturersRouter.post(
  '/manufacturers',
  requireRole('OWNER', 'MANAGER'),
  validate(manufacturerCreateSchema),
  asyncHandler(async (req, res) => {
    const manufacturer = await prisma.manufacturer.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/manufacturers/${manufacturer.id}`).json(manufacturer);
  }),
);

manufacturersRouter.get(
  '/manufacturers/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const manufacturer = await prisma.manufacturer.findUnique({ where: { id } });
    if (!manufacturer) {
      throw new NotFoundError(`Manufacturer ${id} not found`);
    }

    res.json(manufacturer);
  }),
);

manufacturersRouter.patch(
  '/manufacturers/:id',
  requireRole('OWNER', 'MANAGER'),
  validate(manufacturerUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const manufacturer = await prisma.manufacturer.update({ where: { id }, data: req.body });

    res.json(manufacturer);
  }),
);

manufacturersRouter.delete(
  '/manufacturers/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.manufacturer.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);
