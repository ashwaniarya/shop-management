// Behavioural test: exercises the fitment specificity ladder against the real DB
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma';
import { DomainValidationError, NotFoundError } from './errors';
import { buildFitmentWhere, validateFitmentInput } from './fitment';
import { createCatalogFixture, createPartFixture } from './test-fixtures';

describe('fitment ladder', () => {
  const ts = Date.now();

  let manufacturerId: number;
  let categoryId: number;
  let vehicleClassId: number;
  let vehicleMakeM1Id: number;
  let vehicleMakeM2Id: number;
  let vehicleModelMod1Id: number;
  let vehicleModelMod2Id: number;
  let vehicleModelMod1SiblingId: number;

  let pClassWideId: number;
  let pMakeWideId: number;
  let pModelSpecificId: number;
  let pUniversalId: number;
  let pOtherMakeId: number;
  let pSiblingOnlyId: number;

  const partIds: number[] = [];

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `Fitment Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;

    const vehicleClass = await prisma.vehicleClass.create({
      data: { name: `Tractor_T${ts}` },
    });
    vehicleClassId = vehicleClass.id;

    const makeM1 = await prisma.vehicleMake.create({ data: { name: `M1_${ts}` } });
    vehicleMakeM1Id = makeM1.id;
    const makeM2 = await prisma.vehicleMake.create({ data: { name: `M2_${ts}` } });
    vehicleMakeM2Id = makeM2.id;

    const modelMod1 = await prisma.vehicleModel.create({
      data: { name: `Mod1_${ts}`, vehicleMakeId: vehicleMakeM1Id, vehicleClassId },
    });
    vehicleModelMod1Id = modelMod1.id;
    const modelMod2 = await prisma.vehicleModel.create({
      data: { name: `Mod2_${ts}`, vehicleMakeId: vehicleMakeM2Id, vehicleClassId },
    });
    vehicleModelMod2Id = modelMod2.id;
    const modelMod1Sibling = await prisma.vehicleModel.create({
      data: { name: `Mod1Sibling_${ts}`, vehicleMakeId: vehicleMakeM1Id, vehicleClassId },
    });
    vehicleModelMod1SiblingId = modelMod1Sibling.id;

    async function createPart(sku: string, mpn: string): Promise<number> {
      const part = await createPartFixture(prisma, {
        sku,
        manufacturerPartNumber: mpn,
        manufacturerId,
        categoryId,
      });
      partIds.push(part.id);
      return part.id;
    }

    pClassWideId = await createPart(`P-CLASSWIDE-${ts}`, `MPN-CLASSWIDE-${ts}`);
    pMakeWideId = await createPart(`P-MAKEWIDE-${ts}`, `MPN-MAKEWIDE-${ts}`);
    pModelSpecificId = await createPart(`P-MODELSPECIFIC-${ts}`, `MPN-MODELSPECIFIC-${ts}`);
    pUniversalId = await createPart(`P-UNIVERSAL-${ts}`, `MPN-UNIVERSAL-${ts}`);
    pOtherMakeId = await createPart(`P-OTHERMAKE-${ts}`, `MPN-OTHERMAKE-${ts}`);
    pSiblingOnlyId = await createPart(`P-SIBLINGONLY-${ts}`, `MPN-SIBLINGONLY-${ts}`);

    await prisma.partFitment.createMany({
      data: [
        { partId: pClassWideId, vehicleClassId },
        { partId: pMakeWideId, vehicleClassId, vehicleMakeId: vehicleMakeM1Id },
        {
          partId: pModelSpecificId,
          vehicleClassId,
          vehicleMakeId: vehicleMakeM1Id,
          vehicleModelId: vehicleModelMod1Id,
        },
        {
          partId: pOtherMakeId,
          vehicleClassId,
          vehicleMakeId: vehicleMakeM2Id,
          vehicleModelId: vehicleModelMod2Id,
        },
        {
          partId: pSiblingOnlyId,
          vehicleClassId,
          vehicleMakeId: vehicleMakeM1Id,
          vehicleModelId: vehicleModelMod1SiblingId,
        },
      ],
    });
    // pUniversalId intentionally receives zero fitment rows
  });

  afterAll(async () => {
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.vehicleModel.deleteMany({
      where: { id: { in: [vehicleModelMod1Id, vehicleModelMod2Id, vehicleModelMod1SiblingId] } },
    });
    await prisma.vehicleMake.deleteMany({ where: { id: { in: [vehicleMakeM1Id, vehicleMakeM2Id] } } });
    await prisma.vehicleClass.delete({ where: { id: vehicleClassId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
  });

  async function partIdsMatching(where: Awaited<ReturnType<typeof buildFitmentWhere>>): Promise<Set<number>> {
    const parts = await prisma.part.findMany({
      where: { ...(where ?? {}), id: { in: partIds } },
    });
    return new Set(parts.map((part) => part.id));
  }

  describe('buildFitmentWhere', () => {
    it('filtering by model returns class-wide, make-wide, and model-specific parts', async () => {
      const where = await buildFitmentWhere({ vehicleModelId: vehicleModelMod1Id });
      const matched = await partIdsMatching(where);

      expect(matched).toEqual(new Set([pClassWideId, pMakeWideId, pModelSpecificId]));
    });

    it('filtering by make (with class) returns class-wide, make-wide, and model-specific parts under that make', async () => {
      const where = await buildFitmentWhere({ vehicleMakeId: vehicleMakeM1Id, vehicleClassId });
      const matched = await partIdsMatching(where);

      expect(matched).toEqual(new Set([pClassWideId, pMakeWideId, pModelSpecificId, pSiblingOnlyId]));
    });

    it('filtering by make alone (no class) omits class-wide fitments it cannot resolve', async () => {
      const where = await buildFitmentWhere({ vehicleMakeId: vehicleMakeM1Id });
      const matched = await partIdsMatching(where);

      expect(matched).toEqual(new Set([pMakeWideId, pModelSpecificId, pSiblingOnlyId]));
    });

    it('filtering by class returns every fitted part but never the universal (fitment-less) part', async () => {
      const where = await buildFitmentWhere({ vehicleClassId });
      const matched = await partIdsMatching(where);

      expect(matched).toEqual(
        new Set([pClassWideId, pMakeWideId, pModelSpecificId, pOtherMakeId, pSiblingOnlyId]),
      );
      expect(matched.has(pUniversalId)).toBe(false);
    });

    it('filtering by a model excludes parts fitted only to a same-make sibling model', async () => {
      const byModel = await partIdsMatching(await buildFitmentWhere({ vehicleModelId: vehicleModelMod1Id }));
      const byMake = await partIdsMatching(await buildFitmentWhere({ vehicleMakeId: vehicleMakeM1Id }));

      expect(byModel.has(pSiblingOnlyId)).toBe(false);
      expect(byMake.has(pSiblingOnlyId)).toBe(true);
    });

    it('returns undefined when no vehicle filter is given', async () => {
      const where = await buildFitmentWhere({});

      expect(where).toBeUndefined();
    });

    it('throws NotFoundError when the model does not exist', async () => {
      await expect(buildFitmentWhere({ vehicleModelId: -1 })).rejects.toThrow(NotFoundError);
    });

    it('throws DomainValidationError when the given make does not match the resolved model', async () => {
      await expect(
        buildFitmentWhere({ vehicleModelId: vehicleModelMod1Id, vehicleMakeId: vehicleMakeM2Id }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('throws DomainValidationError when the given class does not match the resolved model', async () => {
      const otherClass = await prisma.vehicleClass.create({ data: { name: `OtherClass_${ts}` } });

      await expect(
        buildFitmentWhere({ vehicleModelId: vehicleModelMod1Id, vehicleClassId: otherClass.id }),
      ).rejects.toThrow(DomainValidationError);

      await prisma.vehicleClass.delete({ where: { id: otherClass.id } });
    });
  });

  describe('validateFitmentInput', () => {
    it('rejects a model given without a make', async () => {
      await expect(
        validateFitmentInput({ vehicleClassId, vehicleModelId: vehicleModelMod1Id }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('rejects a model that does not belong to the given make and class', async () => {
      await expect(
        validateFitmentInput({
          vehicleClassId,
          vehicleMakeId: vehicleMakeM2Id,
          vehicleModelId: vehicleModelMod1Id,
        }),
      ).rejects.toThrow(DomainValidationError);
    });

    it('accepts a valid three-level class+make+model input', async () => {
      await expect(
        validateFitmentInput({
          vehicleClassId,
          vehicleMakeId: vehicleMakeM1Id,
          vehicleModelId: vehicleModelMod1Id,
        }),
      ).resolves.toBeUndefined();
    });

    it('accepts a valid class-only input', async () => {
      await expect(validateFitmentInput({ vehicleClassId })).resolves.toBeUndefined();
    });

    it('accepts a valid class+make input with no model', async () => {
      await expect(
        validateFitmentInput({ vehicleClassId, vehicleMakeId: vehicleMakeM1Id }),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundError when the vehicle class does not exist', async () => {
      await expect(validateFitmentInput({ vehicleClassId: -1 })).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when the vehicle make does not exist', async () => {
      await expect(validateFitmentInput({ vehicleClassId, vehicleMakeId: -1 })).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when the vehicle model does not exist despite a valid make', async () => {
      await expect(
        validateFitmentInput({ vehicleClassId, vehicleMakeId: vehicleMakeM1Id, vehicleModelId: -1 }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('model-requires-make DB constraint', () => {
    it('rejects a direct insert of a model-level fitment without a make', async () => {
      const part = await createPartFixture(prisma, {
        sku: `P-CONSTRAINT-${ts}`,
        manufacturerPartNumber: `MPN-CONSTRAINT-${ts}`,
        manufacturerId,
        categoryId,
      });
      partIds.push(part.id);

      await expect(
        prisma.partFitment.create({
          data: { partId: part.id, vehicleClassId, vehicleModelId: vehicleModelMod1Id },
        }),
      ).rejects.toThrow(/part_fitment_model_requires_make|constraint/i);
    });
  });
});
