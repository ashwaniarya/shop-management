import type { Prisma } from '@prisma/client';
import {
  paginationQuerySchema,
  partCreateSchema,
  partCrossReferenceCreateSchema,
  partFitmentCreateSchema,
  partUpdateSchema,
  supplierPartCreateSchema,
  supplierPartUpdateSchema,
} from '@shop/shared';
import { Router } from 'express';
import { z } from 'zod';

import { requireCategory, requireManufacturer, requirePart, requirePartGrade, requireShop } from '../lib/assertExists';
import { asyncHandler } from '../lib/asyncHandler';
import { normalizeNumber } from '../lib/normalize';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { booleanQueryParam } from '../lib/queryBoolean';
import {
  serializeInventoryItem,
  serializePart,
  serializePartCrossReference,
  serializePartFitment,
  serializeSupplierPart,
} from '../lib/serialize';
import { requireRole } from '../middleware/authorize';
import { ForbiddenError } from '../services/errors';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { NotFoundError } from '../services/errors';
import { buildFitmentWhere, validateFitmentInput } from '../services/fitment';
import { type FamilyMember, resolveFamily, validateCopyOfTarget } from '../services/partFamily';
import { searchPartsByNumber } from '../services/partSearch';

export const partsRouter = Router();

// --- Parts CRUD + list + search ------------------------------------------------

const listPartsQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  manufacturerId: z.coerce.number().int().optional(),
  gradeId: z.coerce.number().int().optional(),
  isActive: booleanQueryParam.optional(),
  vehicleClassId: z.coerce.number().int().optional(),
  vehicleMakeId: z.coerce.number().int().optional(),
  vehicleModelId: z.coerce.number().int().optional(),
});

partsRouter.get(
  '/parts',
  validateQuery(listPartsQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<z.infer<typeof listPartsQuerySchema>>(res);
    const { skip, take } = toSkipTake(query);

    const fitmentWhere = await buildFitmentWhere({
      vehicleClassId: query.vehicleClassId,
      vehicleMakeId: query.vehicleMakeId,
      vehicleModelId: query.vehicleModelId,
    });

    const where: Prisma.PartWhereInput = {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.categoryId !== undefined ? { categoryId: query.categoryId } : {}),
      ...(query.manufacturerId !== undefined ? { manufacturerId: query.manufacturerId } : {}),
      ...(query.gradeId !== undefined ? { gradeId: query.gradeId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(fitmentWhere ?? {}),
    };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
      prisma.part.count({ where }),
    ]);

    res.json({ data: parts.map(serializePart), meta: buildMeta(query, total) });
  }),
);

partsRouter.post(
  '/parts',
  requireRole('OWNER', 'MANAGER'),
  validate(partCreateSchema),
  asyncHandler(async (req, res) => {
    await requireManufacturer(req.body.manufacturerId);
    await requireCategory(req.body.categoryId);
    if (req.body.gradeId != null) {
      await requirePartGrade(req.body.gradeId);
    }
    if (req.body.copyOfPartId != null) {
      await validateCopyOfTarget(null, req.body.copyOfPartId);
    }

    const part = await prisma.part.create({
      data: {
        ...req.body,
        skuNormalized: normalizeNumber(req.body.sku),
        mpnNormalized: normalizeNumber(req.body.manufacturerPartNumber),
      },
    });

    res.status(201).set('Location', `/api/v1/parts/${part.id}`).json(serializePart(part));
  }),
);

const partSearchQuerySchema = paginationQuerySchema.extend({
  number: z.string(),
});

partsRouter.get(
  '/parts/search',
  validateQuery(partSearchQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<z.infer<typeof partSearchQuerySchema>>(res);
    const allResults = await searchPartsByNumber(query.number);
    const { skip, take } = toSkipTake(query);
    const page = allResults.slice(skip, skip + take);

    const data = page.map((result) => ({
      ...serializePart(result.part),
      matchedBy: result.matchedBy,
      matchedNumber: result.matchedNumber,
    }));

    res.json({ data, meta: buildMeta(query, allResults.length) });
  }),
);

const partIncludeValues = ['fitments', 'crossReferences', 'suppliers', 'inventory'] as const;
type PartIncludeValue = (typeof partIncludeValues)[number];

function parseIncludeParam(rawInclude: unknown): Set<PartIncludeValue> {
  const raw = typeof rawInclude === 'string' ? rawInclude : '';
  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token): token is PartIncludeValue => (partIncludeValues as readonly string[]).includes(token));
  return new Set(tokens);
}

partsRouter.get(
  '/parts/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const part = await requirePart(id);
    const include = parseIncludeParam(req.query.include);

    const result: Record<string, unknown> = { ...serializePart(part) };

    if (include.has('fitments')) {
      const fitments = await prisma.partFitment.findMany({
        where: { partId: id },
        include: { vehicleClass: true, vehicleMake: true, vehicleModel: true },
        orderBy: { id: 'asc' },
      });
      result.fitments = fitments.map((fitment) => ({
        ...serializePartFitment(fitment),
        vehicleClassName: fitment.vehicleClass.name,
        vehicleMakeName: fitment.vehicleMake?.name ?? null,
        vehicleModelName: fitment.vehicleModel?.name ?? null,
      }));
    }

    if (include.has('crossReferences')) {
      const crossReferences = await prisma.partCrossReference.findMany({
        where: { partId: id },
        orderBy: { id: 'asc' },
      });
      result.crossReferences = crossReferences.map(serializePartCrossReference);
    }

    if (include.has('suppliers')) {
      const supplierParts = await prisma.supplierPart.findMany({
        where: { partId: id },
        include: { supplier: true },
        orderBy: { id: 'asc' },
      });
      result.suppliers = supplierParts.map((supplierPart) => ({
        ...serializeSupplierPart(supplierPart),
        supplierName: supplierPart.supplier.name,
      }));
    }

    if (include.has('inventory')) {
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: { partId: id },
        include: { shop: true },
        orderBy: { id: 'asc' },
      });
      result.inventory = inventoryItems.map((item) => ({
        ...serializeInventoryItem(item),
        shopName: item.shop.name,
      }));
    }

    res.json(result);
  }),
);

partsRouter.patch(
  '/parts/:id',
  requireRole('OWNER', 'MANAGER'),
  validate(partUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    if (req.body.manufacturerId !== undefined) {
      await requireManufacturer(req.body.manufacturerId);
    }
    if (req.body.categoryId !== undefined) {
      await requireCategory(req.body.categoryId);
    }
    if (req.body.gradeId != null) {
      await requirePartGrade(req.body.gradeId);
    }
    if (req.body.copyOfPartId != null) {
      await validateCopyOfTarget(id, req.body.copyOfPartId);
    }

    // Unchecked (not the plain PartUpdateInput): the body carries raw scalar FKs
    // (manufacturerId, categoryId), not Prisma's nested relation-connect syntax.
    const data: Prisma.PartUncheckedUpdateInput = {
      ...req.body,
      skuNormalized: req.body.sku !== undefined ? normalizeNumber(req.body.sku) : undefined,
      mpnNormalized:
        req.body.manufacturerPartNumber !== undefined ? normalizeNumber(req.body.manufacturerPartNumber) : undefined,
    };

    const part = await prisma.part.update({ where: { id }, data });

    res.json(serializePart(part));
  }),
);

partsRouter.delete(
  '/parts/:id',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await prisma.part.update({ where: { id }, data: { isActive: false } });

    res.status(204).end();
  }),
);

// --- Part Fitments --------------------------------------------------------------

partsRouter.get(
  '/parts/:id/fitments',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    await requirePart(partId);
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [fitments, total] = await Promise.all([
      prisma.partFitment.findMany({ where: { partId }, skip, take, orderBy: { id: 'asc' } }),
      prisma.partFitment.count({ where: { partId } }),
    ]);

    res.json({ data: fitments.map(serializePartFitment), meta: buildMeta(query, total) });
  }),
);

partsRouter.post(
  '/parts/:id/fitments',
  requireRole('OWNER', 'MANAGER'),
  validate(partFitmentCreateSchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    await requirePart(partId);

    await validateFitmentInput({
      vehicleClassId: req.body.vehicleClassId,
      vehicleMakeId: req.body.vehicleMakeId ?? undefined,
      vehicleModelId: req.body.vehicleModelId ?? undefined,
    });

    const fitment = await prisma.partFitment.create({
      data: {
        partId,
        vehicleClassId: req.body.vehicleClassId,
        vehicleMakeId: req.body.vehicleMakeId ?? null,
        vehicleModelId: req.body.vehicleModelId ?? null,
        notes: req.body.notes ?? null,
      },
    });

    res
      .status(201)
      .set('Location', `/api/v1/parts/${partId}/fitments/${fitment.id}`)
      .json(serializePartFitment(fitment));
  }),
);

partsRouter.delete(
  '/parts/:id/fitments/:fitmentId',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    const fitmentId = requireIdParam(req.params.fitmentId, 'fitmentId');

    const fitment = await prisma.partFitment.findUnique({ where: { id: fitmentId } });
    if (!fitment || fitment.partId !== partId) {
      throw new NotFoundError(`Fitment ${fitmentId} not found on part ${partId}`);
    }

    await prisma.partFitment.delete({ where: { id: fitmentId } });

    res.status(204).end();
  }),
);

// --- Part Cross References -------------------------------------------------------

partsRouter.get(
  '/parts/:id/cross-references',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    await requirePart(partId);
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [crossReferences, total] = await Promise.all([
      prisma.partCrossReference.findMany({ where: { partId }, skip, take, orderBy: { id: 'asc' } }),
      prisma.partCrossReference.count({ where: { partId } }),
    ]);

    res.json({ data: crossReferences.map(serializePartCrossReference), meta: buildMeta(query, total) });
  }),
);

partsRouter.post(
  '/parts/:id/cross-references',
  requireRole('OWNER', 'MANAGER'),
  validate(partCrossReferenceCreateSchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    await requirePart(partId);

    const crossReference = await prisma.partCrossReference.create({
      data: {
        partId,
        refType: req.body.refType,
        refNumber: req.body.refNumber,
        refNumberNormalized: normalizeNumber(req.body.refNumber),
        refBrand: req.body.refBrand ?? null,
        notes: req.body.notes ?? null,
      },
    });

    res
      .status(201)
      .set('Location', `/api/v1/parts/${partId}/cross-references/${crossReference.id}`)
      .json(serializePartCrossReference(crossReference));
  }),
);

partsRouter.delete(
  '/parts/:id/cross-references/:crossRefId',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    const crossRefId = requireIdParam(req.params.crossRefId, 'crossRefId');

    const crossReference = await prisma.partCrossReference.findUnique({ where: { id: crossRefId } });
    if (!crossReference || crossReference.partId !== partId) {
      throw new NotFoundError(`Cross-reference ${crossRefId} not found on part ${partId}`);
    }

    await prisma.partCrossReference.delete({ where: { id: crossRefId } });

    res.status(204).end();
  }),
);

// --- Part Suppliers ---------------------------------------------------------------

partsRouter.get(
  '/parts/:id/suppliers',
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    await requirePart(partId);
    const query = getQuery<typeof paginationQuerySchema._output>(res);
    const { skip, take } = toSkipTake(query);

    const [supplierParts, total] = await Promise.all([
      prisma.supplierPart.findMany({ where: { partId }, skip, take, orderBy: { id: 'asc' } }),
      prisma.supplierPart.count({ where: { partId } }),
    ]);

    res.json({ data: supplierParts.map(serializeSupplierPart), meta: buildMeta(query, total) });
  }),
);

partsRouter.post(
  '/parts/:id/suppliers',
  requireRole('OWNER', 'MANAGER'),
  validate(supplierPartCreateSchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    await requirePart(partId);

    const supplier = await prisma.supplier.findUnique({ where: { id: req.body.supplierId } });
    if (!supplier) {
      throw new NotFoundError(`Supplier ${req.body.supplierId} not found`);
    }

    const supplierPart = await prisma.supplierPart.create({
      data: {
        partId,
        supplierId: req.body.supplierId,
        supplierPartNumber: req.body.supplierPartNumber ?? null,
        supplierPartNumberNormalized:
          req.body.supplierPartNumber != null ? normalizeNumber(req.body.supplierPartNumber) : null,
        isPreferred: req.body.isPreferred,
      },
    });

    res
      .status(201)
      .set('Location', `/api/v1/parts/${partId}/suppliers/${supplierPart.id}`)
      .json(serializeSupplierPart(supplierPart));
  }),
);

partsRouter.patch(
  '/parts/:id/suppliers/:supplierPartId',
  requireRole('OWNER', 'MANAGER'),
  validate(supplierPartUpdateSchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    const supplierPartId = requireIdParam(req.params.supplierPartId, 'supplierPartId');

    const existing = await prisma.supplierPart.findUnique({ where: { id: supplierPartId } });
    if (!existing || existing.partId !== partId) {
      throw new NotFoundError(`Supplier link ${supplierPartId} not found on part ${partId}`);
    }

    const data: Prisma.SupplierPartUpdateInput = {
      ...req.body,
      supplierPartNumberNormalized:
        req.body.supplierPartNumber === undefined
          ? undefined
          : req.body.supplierPartNumber === null
            ? null
            : normalizeNumber(req.body.supplierPartNumber),
    };

    const supplierPart = await prisma.supplierPart.update({ where: { id: supplierPartId }, data });

    res.json(serializeSupplierPart(supplierPart));
  }),
);

partsRouter.delete(
  '/parts/:id/suppliers/:supplierPartId',
  requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    const supplierPartId = requireIdParam(req.params.supplierPartId, 'supplierPartId');

    const existing = await prisma.supplierPart.findUnique({ where: { id: supplierPartId } });
    if (!existing || existing.partId !== partId) {
      throw new NotFoundError(`Supplier link ${supplierPartId} not found on part ${partId}`);
    }

    await prisma.supplierPart.delete({ where: { id: supplierPartId } });

    res.status(204).end();
  }),
);

// --- Part Family ------------------------------------------------------------------

const partFamilyQuerySchema = z.object({
  shopId: z.coerce.number().int().optional(),
});

partsRouter.get(
  '/parts/:id/family',
  validateQuery(partFamilyQuerySchema),
  asyncHandler(async (req, res) => {
    const partId = requireIdParam(req.params.id);
    const part = await requirePart(partId);
    const { shopId } = getQuery<z.infer<typeof partFamilyQuerySchema>>(res);
    if (shopId !== undefined) {
      // Stock/price projection is shop-scoped: a user may only see their own shop's numbers.
      if (shopId !== req.user!.shopId) {
        throw new ForbiddenError('You can only view stock for your own shop');
      }
      await requireShop(shopId);
    }

    const family = await resolveFamily(part, shopId);

    const serializeFamilyMember = (member: FamilyMember) => {
      const stock = member.inventoryItem === null ? null : serializeInventoryItem(member.inventoryItem);
      return {
        ...serializePart(member.part),
        gradeName: member.part.grade?.name ?? null,
        ...(shopId !== undefined
          ? { quantityOnHand: stock?.quantityOnHand ?? null, sellingPrice: stock?.sellingPrice ?? null }
          : {}),
      };
    };

    res.json({
      original: serializeFamilyMember(family.original),
      copies: family.copies.map(serializeFamilyMember),
    });
  }),
);
