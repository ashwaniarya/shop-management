import {
  paginationQuerySchema,
  vehicleClassCreateSchema,
  vehicleClassUpdateSchema,
  vehicleMakeCreateSchema,
  vehicleMakeUpdateSchema,
  vehicleModelCreateSchema,
  vehicleModelUpdateSchema,
} from '@shop/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireVehicleClass, requireVehicleMake } from '../lib/assertExists';
import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/authorize';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';

export const vehiclesRouter = Router();

// --- Vehicle Classes ---------------------------------------------------------

vehiclesRouter.get(
  '/vehicle-classes',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [data, total] = await Promise.all([
      prisma.vehicleClass.findMany({ skip, take, orderBy: { id: 'asc' } }),
      prisma.vehicleClass.count(),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

vehiclesRouter.post(
  '/vehicle-classes',
  requireRole('OWNER', 'MANAGER'),
  validate(vehicleClassCreateSchema),
  asyncHandler(async (req, res) => {
    const vehicleClass = await prisma.vehicleClass.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/vehicle-classes/${vehicleClass.id}`).json(vehicleClass);
  }),
);

vehiclesRouter.get(
  '/vehicle-classes/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const vehicleClass = await prisma.vehicleClass.findUnique({ where: { id } });
    if (!vehicleClass) {
      throw new NotFoundError(`Vehicle class ${id} not found`);
    }

    res.json(vehicleClass);
  }),
);

vehiclesRouter.patch(
  '/vehicle-classes/:id',
  requireRole('OWNER', 'MANAGER'),
  validate(vehicleClassUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const vehicleClass = await prisma.vehicleClass.update({ where: { id }, data: req.body });

    res.json(vehicleClass);
  }),
);

vehiclesRouter.delete(
  '/vehicle-classes/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.vehicleClass.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);

// --- Vehicle Makes ------------------------------------------------------------

vehiclesRouter.get(
  '/vehicle-makes',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [data, total] = await Promise.all([
      prisma.vehicleMake.findMany({ skip, take, orderBy: { id: 'asc' } }),
      prisma.vehicleMake.count(),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

vehiclesRouter.post(
  '/vehicle-makes',
  requireRole('OWNER', 'MANAGER'),
  validate(vehicleMakeCreateSchema),
  asyncHandler(async (req, res) => {
    const vehicleMake = await prisma.vehicleMake.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/vehicle-makes/${vehicleMake.id}`).json(vehicleMake);
  }),
);

vehiclesRouter.get(
  '/vehicle-makes/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const vehicleMake = await prisma.vehicleMake.findUnique({ where: { id } });
    if (!vehicleMake) {
      throw new NotFoundError(`Vehicle make ${id} not found`);
    }

    res.json(vehicleMake);
  }),
);

vehiclesRouter.patch(
  '/vehicle-makes/:id',
  requireRole('OWNER', 'MANAGER'),
  validate(vehicleMakeUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const vehicleMake = await prisma.vehicleMake.update({ where: { id }, data: req.body });

    res.json(vehicleMake);
  }),
);

vehiclesRouter.delete(
  '/vehicle-makes/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.vehicleMake.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);

// --- Vehicle Models ------------------------------------------------------------

const listVehicleModelsQuerySchema = paginationQuerySchema.extend({
  makeId: z.coerce.number().int().optional(),
  classId: z.coerce.number().int().optional(),
});

vehiclesRouter.get(
  '/vehicle-models',
  validateQuery(listVehicleModelsQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<z.infer<typeof listVehicleModelsQuerySchema>>(res);
    const { skip, take } = toSkipTake(query);
    const where = {
      ...(query.makeId !== undefined ? { vehicleMakeId: query.makeId } : {}),
      ...(query.classId !== undefined ? { vehicleClassId: query.classId } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.vehicleModel.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
      prisma.vehicleModel.count({ where }),
    ]);

    res.json({ data, meta: buildMeta(query, total) });
  }),
);

vehiclesRouter.post(
  '/vehicle-models',
  requireRole('OWNER', 'MANAGER'),
  validate(vehicleModelCreateSchema),
  asyncHandler(async (req, res) => {
    await requireVehicleMake(req.body.vehicleMakeId);
    await requireVehicleClass(req.body.vehicleClassId);

    const vehicleModel = await prisma.vehicleModel.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/vehicle-models/${vehicleModel.id}`).json(vehicleModel);
  }),
);

vehiclesRouter.get(
  '/vehicle-models/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const vehicleModel = await prisma.vehicleModel.findUnique({ where: { id } });
    if (!vehicleModel) {
      throw new NotFoundError(`Vehicle model ${id} not found`);
    }

    res.json(vehicleModel);
  }),
);

vehiclesRouter.patch(
  '/vehicle-models/:id',
  requireRole('OWNER', 'MANAGER'),
  validate(vehicleModelUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    if (req.body.vehicleMakeId !== undefined) {
      await requireVehicleMake(req.body.vehicleMakeId);
    }
    if (req.body.vehicleClassId !== undefined) {
      await requireVehicleClass(req.body.vehicleClassId);
    }

    const vehicleModel = await prisma.vehicleModel.update({ where: { id }, data: req.body });

    res.json(vehicleModel);
  }),
);

vehiclesRouter.delete(
  '/vehicle-models/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.vehicleModel.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);
