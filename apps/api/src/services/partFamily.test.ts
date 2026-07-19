// Behavioural test: exercises the flat-family copy-link validators and the
// family projection against the real DB
import type { Part } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma';
import { DomainValidationError, NotFoundError } from './errors';
import { resolveFamily, validateCopyOfTarget } from './partFamily';
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

describe('resolveFamily', () => {
  const ts = Date.now();

  let manufacturerId: number;
  let categoryId: number;
  let shopId: number;
  let originalPart: Part;
  let earlyGradeCopy: Part;
  let lateGradeCopy: Part;
  let ungradedCopy: Part;
  let standalonePart: Part;
  let originalInventoryItemId: number;
  let earlyCopyInventoryItemId: number;

  const partIds: number[] = [];
  const gradeIds: number[] = [];
  const inventoryItemIds: number[] = [];

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `ResolveFamily Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;

    const earlyGrade = await prisma.partGrade.create({
      data: { name: `ResolveFamily Grade Early ${ts}`, displayOrder: 1 },
    });
    gradeIds.push(earlyGrade.id);
    const lateGrade = await prisma.partGrade.create({
      data: { name: `ResolveFamily Grade Late ${ts}`, displayOrder: 2 },
    });
    gradeIds.push(lateGrade.id);

    originalPart = await createPartFixture(prisma, {
      sku: `RESFAM-ORIG-${ts}`,
      manufacturerPartNumber: `RESFAM-ORIG-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(originalPart.id);

    // Late-grade copy created before the early-grade one, so id order and
    // displayOrder order disagree and the sort assertion has teeth
    lateGradeCopy = await createPartFixture(prisma, {
      sku: `RESFAM-LATE-${ts}`,
      manufacturerPartNumber: `RESFAM-LATE-MPN-${ts}`,
      manufacturerId,
      categoryId,
      gradeId: lateGrade.id,
      copyOfPartId: originalPart.id,
    });
    partIds.push(lateGradeCopy.id);

    earlyGradeCopy = await createPartFixture(prisma, {
      sku: `RESFAM-EARLY-${ts}`,
      manufacturerPartNumber: `RESFAM-EARLY-MPN-${ts}`,
      manufacturerId,
      categoryId,
      gradeId: earlyGrade.id,
      copyOfPartId: originalPart.id,
    });
    partIds.push(earlyGradeCopy.id);

    ungradedCopy = await createPartFixture(prisma, {
      sku: `RESFAM-UNGRADED-${ts}`,
      manufacturerPartNumber: `RESFAM-UNGRADED-MPN-${ts}`,
      manufacturerId,
      categoryId,
      copyOfPartId: originalPart.id,
    });
    partIds.push(ungradedCopy.id);

    standalonePart = await createPartFixture(prisma, {
      sku: `RESFAM-SOLO-${ts}`,
      manufacturerPartNumber: `RESFAM-SOLO-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(standalonePart.id);

    const shop = await prisma.shop.create({ data: { name: `ResolveFamily Shop ${ts}` } });
    shopId = shop.id;

    const originalInventoryItem = await prisma.inventoryItem.create({
      data: { shopId, partId: originalPart.id, quantityOnHand: 7, sellingPrice: 120.5 },
    });
    originalInventoryItemId = originalInventoryItem.id;
    inventoryItemIds.push(originalInventoryItemId);

    const earlyCopyInventoryItem = await prisma.inventoryItem.create({
      data: { shopId, partId: earlyGradeCopy.id, quantityOnHand: 3, sellingPrice: 99.99 },
    });
    earlyCopyInventoryItemId = earlyCopyInventoryItem.id;
    inventoryItemIds.push(earlyCopyInventoryItemId);
  });

  afterAll(async () => {
    await prisma.inventoryItem.deleteMany({ where: { id: { in: inventoryItemIds } } });
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.partGrade.deleteMany({ where: { id: { in: gradeIds } } });
    await prisma.shop.delete({ where: { id: shopId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
  });

  function familyMemberIds(family: { original: { part: Part }; copies: { part: Part }[] }): number[] {
    return [family.original.part.id, ...family.copies.map((member) => member.part.id)].sort(
      (left, right) => left - right,
    );
  }

  it('returns the identical family whether called from the original or from a copy', async () => {
    const fromOriginal = await resolveFamily(originalPart);
    const fromCopy = await resolveFamily(lateGradeCopy);

    expect(fromOriginal.original.part.id).toBe(originalPart.id);
    expect(fromCopy.original.part.id).toBe(originalPart.id);
    expect(familyMemberIds(fromCopy)).toEqual(familyMemberIds(fromOriginal));
    expect(familyMemberIds(fromOriginal)).toEqual(
      [originalPart.id, lateGradeCopy.id, earlyGradeCopy.id, ungradedCopy.id].sort((left, right) => left - right),
    );
  });

  it('sorts copies by grade displayOrder with the ungraded copy last', async () => {
    const family = await resolveFamily(originalPart);

    expect(family.copies.map((member) => member.part.id)).toEqual([
      earlyGradeCopy.id,
      lateGradeCopy.id,
      ungradedCopy.id,
    ]);
    expect(family.copies[0]?.part.grade?.name).toBe(`ResolveFamily Grade Early ${ts}`);
  });

  it('attaches the shop inventory item to stocked members and null to unstocked ones', async () => {
    const family = await resolveFamily(originalPart, shopId);

    expect(family.original.inventoryItem?.id).toBe(originalInventoryItemId);
    const stockedCopy = family.copies.find((member) => member.part.id === earlyGradeCopy.id);
    expect(stockedCopy?.inventoryItem?.id).toBe(earlyCopyInventoryItemId);
    const unstockedCopy = family.copies.find((member) => member.part.id === lateGradeCopy.id);
    expect(unstockedCopy?.inventoryItem).toBeNull();
  });

  it('attaches no inventory data when shopId is not given', async () => {
    const family = await resolveFamily(originalPart);

    expect(family.original.inventoryItem).toBeNull();
    expect(family.copies.every((member) => member.inventoryItem === null)).toBe(true);
  });

  it('returns a standalone part as its own original with no copies', async () => {
    const family = await resolveFamily(standalonePart);

    expect(family.original.part.id).toBe(standalonePart.id);
    expect(family.copies).toEqual([]);
    expect(family.original.inventoryItem).toBeNull();
  });
});
