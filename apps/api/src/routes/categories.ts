import { categoryCreateSchema, categoryUpdateSchema, paginationQuerySchema } from '@shop/shared';
import type { Category } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../lib/asyncHandler';
import { buildMeta, toSkipTake } from '../lib/pagination';
import { requireIdParam } from '../lib/params';
import { prisma } from '../lib/prisma';
import { booleanQueryParam } from '../lib/queryBoolean';
import { getQuery, validate, validateQuery } from '../middleware/validate';
import { ConflictError, NotFoundError } from '../services/errors';

export const categoriesRouter = Router();

const listCategoriesQuerySchema = paginationQuerySchema.extend({
  parentId: z.coerce.number().int().optional(),
  tree: booleanQueryParam.optional(),
});

type CategoryTreeNode = Category & { children: CategoryTreeNode[] };

async function assertParentCategoryExists(parentCategoryId: number | null | undefined): Promise<void> {
  if (parentCategoryId === undefined || parentCategoryId === null) {
    return;
  }
  const parent = await prisma.category.findUnique({ where: { id: parentCategoryId } });
  if (!parent) {
    throw new NotFoundError(`Category ${parentCategoryId} not found`);
  }
}

categoriesRouter.get(
  '/categories',
  validateQuery(listCategoriesQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = getQuery<z.infer<typeof listCategoriesQuerySchema>>(res);
    const { skip, take } = toSkipTake(query);

    if (!query.tree) {
      const where = query.parentId !== undefined ? { parentCategoryId: query.parentId } : {};
      const [data, total] = await Promise.all([
        prisma.category.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
        prisma.category.count({ where }),
      ]);
      res.json({ data, meta: buildMeta(query, total) });
      return;
    }

    // Tree mode paginates over the ROOT set (top-level categories, or the direct
    // children of parentId when given) so meta.total counts roots, not every node
    // across every nesting level; each root's full subtree is then assembled in
    // memory from a single flat fetch of all categories.
    const rootWhere = { parentCategoryId: query.parentId ?? null };
    const [roots, total, allCategories] = await Promise.all([
      prisma.category.findMany({ where: rootWhere, skip, take, orderBy: { id: 'asc' } }),
      prisma.category.count({ where: rootWhere }),
      prisma.category.findMany({ orderBy: { id: 'asc' } }),
    ]);

    const childrenByParentId = new Map<number, Category[]>();
    for (const category of allCategories) {
      if (category.parentCategoryId === null) {
        continue;
      }
      const siblings = childrenByParentId.get(category.parentCategoryId) ?? [];
      siblings.push(category);
      childrenByParentId.set(category.parentCategoryId, siblings);
    }

    function toTreeNode(category: Category): CategoryTreeNode {
      const children = childrenByParentId.get(category.id) ?? [];
      return { ...category, children: children.map(toTreeNode) };
    }

    res.json({ data: roots.map(toTreeNode), meta: buildMeta(query, total) });
  }),
);

categoriesRouter.post(
  '/categories',
  validate(categoryCreateSchema),
  asyncHandler(async (req, res) => {
    await assertParentCategoryExists(req.body.parentCategoryId);

    const category = await prisma.category.create({ data: req.body });

    res.status(201).set('Location', `/api/v1/categories/${category.id}`).json(category);
  }),
);

categoriesRouter.get(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError(`Category ${id} not found`);
    }

    res.json(category);
  }),
);

categoriesRouter.patch(
  '/categories/:id',
  validate(categoryUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    await assertParentCategoryExists(req.body.parentCategoryId);

    const category = await prisma.category.update({ where: { id }, data: req.body });

    res.json(category);
  }),
);

categoriesRouter.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const id = requireIdParam(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError(`Category ${id} not found`);
    }

    const [childCount, partCount] = await Promise.all([
      prisma.category.count({ where: { parentCategoryId: id } }),
      prisma.part.count({ where: { categoryId: id } }),
    ]);
    if (childCount > 0 || partCount > 0) {
      throw new ConflictError(`Category ${id} has child categories or parts assigned and cannot be deleted`);
    }

    await prisma.category.delete({ where: { id } });

    res.status(204).end();
  }),
);
