import { paginationQuerySchema, partGradeCreateSchema, partGradeUpdateSchema } from '@shop/shared';
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/authorize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';

export const partGradesRouter = Router();

partGradesRouter.get(
  '/part-grades',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [data, total] = await Promise.all([
      prisma.partGrade.findMany({ skip, take, orderBy: { id: 'asc' } }),
      prisma.partGrade.count(),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

partGradesRouter.post(
  '/part-grades',
  requireRole('OWNER', 'MANAGER'),
  validate(partGradeCreateSchema),
  asyncHandler(async (req, res) => {
    const partGrade = await prisma.partGrade.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/part-grades/${partGrade.id}`).json(partGrade);
  }),
);

partGradesRouter.get(
  '/part-grades/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const partGrade = await prisma.partGrade.findUnique({ where: { id } });
    if (!partGrade) {
      throw new NotFoundError(`Part grade ${id} not found`);
    }

    res.json(partGrade);
  }),
);

partGradesRouter.patch(
  '/part-grades/:id',
  requireRole('OWNER', 'MANAGER'),
  validate(partGradeUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const partGrade = await prisma.partGrade.update({ where: { id }, data: req.body });

    res.json(partGrade);
  }),
);

partGradesRouter.delete(
  '/part-grades/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.partGrade.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);
