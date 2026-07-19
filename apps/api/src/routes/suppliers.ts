import { paginationQuerySchema, supplierCreateSchema, supplierUpdateSchema } from '@shop/shared';
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/authorize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';

export const suppliersRouter = Router();

suppliersRouter.get(
  '/suppliers',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({ skip, take, orderBy: { id: 'asc' } }),
      prisma.supplier.count(),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

suppliersRouter.post(
  '/suppliers',
  requireRole('OWNER', 'MANAGER'),
  validate(supplierCreateSchema),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/suppliers/${supplier.id}`).json(supplier);
  }),
);

suppliersRouter.get(
  '/suppliers/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundError(`Supplier ${id} not found`);
    }

    res.json(supplier);
  }),
);

suppliersRouter.patch(
  '/suppliers/:id',
  requireRole('OWNER', 'MANAGER'),
  validate(supplierUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const supplier = await prisma.supplier.update({ where: { id }, data: req.body });

    res.json(supplier);
  }),
);

suppliersRouter.delete(
  '/suppliers/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);
