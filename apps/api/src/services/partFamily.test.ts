// Behavioural test: exercises the flat-family copy-link validators against the real DB
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma';
import { DomainValidationError, NotFoundError } from './errors';
import { validateCopyOfTarget } from './partFamily';
import { createCatalogFixture, createPartFixture } from './test-fixtures';

describe('validateCopyOfTarget', () => {
  const ts = Date.now();

  let manufacturerId: number;
  let categoryId: number;
  let originalPartId: number;
  let copyPartId: number;
  let standalonePartId: number;

  const partIds: number[] = [];

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `PartFamily Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;

    const original = await createPartFixture(prisma, {
      sku: `FAM-ORIG-${ts}`,
      manufacturerPartNumber: `FAM-ORIG-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    originalPartId = original.id;
    partIds.push(originalPartId);

    const copy = await createPartFixture(prisma, {
      sku: `FAM-COPY-${ts}`,
      manufacturerPartNumber: `FAM-COPY-MPN-${ts}`,
      manufacturerId,
      categoryId,
      copyOfPartId: originalPartId,
    });
    copyPartId = copy.id;
    partIds.push(copyPartId);

    const standalone = await createPartFixture(prisma, {
      sku: `FAM-SOLO-${ts}`,
      manufacturerPartNumber: `FAM-SOLO-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    standalonePartId = standalone.id;
    partIds.push(standalonePartId);
  });

  afterAll(async () => {
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
  });

  it('accepts a link to an original from a new part (null selfId)', async () => {
    await expect(validateCopyOfTarget(null, originalPartId)).resolves.toBeUndefined();
  });

  it('accepts a link to an original from an existing copy-free part', async () => {
    await expect(validateCopyOfTarget(standalonePartId, originalPartId)).resolves.toBeUndefined();
  });

  it('throws NotFoundError for an unknown target', async () => {
    await expect(validateCopyOfTarget(null, 999999999)).rejects.toThrow(NotFoundError);
  });

  it('rejects a self-link', async () => {
    await expect(validateCopyOfTarget(standalonePartId, standalonePartId)).rejects.toThrow(DomainValidationError);
    await expect(validateCopyOfTarget(standalonePartId, standalonePartId)).rejects.toThrow(
      'A part cannot be a copy of itself',
    );
  });

  it('rejects linking to a part that is itself a copy, naming the real original', async () => {
    await expect(validateCopyOfTarget(standalonePartId, copyPartId)).rejects.toThrow(DomainValidationError);
    await expect(validateCopyOfTarget(standalonePartId, copyPartId)).rejects.toThrow(
      `Part ${copyPartId} is itself a copy; link to its original (part ${originalPartId}) instead`,
    );
  });

  it('rejects turning a part that has copies into a copy', async () => {
    await expect(validateCopyOfTarget(originalPartId, standalonePartId)).rejects.toThrow(DomainValidationError);
    await expect(validateCopyOfTarget(originalPartId, standalonePartId)).rejects.toThrow(
      `Part ${originalPartId} has copies linked to it and cannot itself become a copy`,
    );
  });

  it('DB CHECK part_copy_of_not_self rejects a direct self-link update', async () => {
    await expect(
      prisma.part.update({ where: { id: standalonePartId }, data: { copyOfPartId: standalonePartId } }),
    ).rejects.toThrow(/part_copy_of_not_self/);
  });
});
