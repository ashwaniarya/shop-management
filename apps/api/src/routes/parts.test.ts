// Behavioural test: exercises the parts router (CRUD, search, 360 view, and the
// fitments/cross-references/suppliers sub-resources) end-to-end via supertest
// against the real DB
import { RefType } from '@prisma/client';
import { listResponseSchema, partSchema } from '@shop/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { normalizeNumber } from '../lib/normalize';
import { prisma } from '../lib/prisma';
import { createCatalogFixture, createPartFixture } from '../services/test-fixtures';

describe('parts router', () => {
  const ts = Date.now();

  let manufacturerId: number;
  let otherManufacturerId: number;
  let categoryId: number;
  let partGradeId: number;
  const categoryIds: number[] = [];
  const partIds: number[] = [];
  const partGradeIds: number[] = [];

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `Parts Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;
    categoryIds.push(categoryId);

    const otherManufacturer = await prisma.manufacturer.create({ data: { name: `Parts Test Other Mfr ${ts}` } });
    otherManufacturerId = otherManufacturer.id;

    const partGrade = await prisma.partGrade.create({ data: { name: `Parts Test Grade ${ts}` } });
    partGradeId = partGrade.id;
    partGradeIds.push(partGradeId);
  });

  afterAll(async () => {
    // Children before parents: FKs from InventoryItem/StockTransaction to Part are
    // Restrict, so those must go before the parts themselves. PartFitment /
    // PartCrossReference / SupplierPart cascade on Part delete but are cleared
    // explicitly anyway, matching this repo's existing cleanup convention.
    await prisma.stockTransaction.deleteMany({ where: { partId: { in: partIds } } });
    await prisma.inventoryItem.deleteMany({ where: { partId: { in: partIds } } });
    await prisma.supplierPart.deleteMany({ where: { partId: { in: partIds } } });
    await prisma.partCrossReference.deleteMany({ where: { partId: { in: partIds } } });
    await prisma.partFitment.deleteMany({ where: { partId: { in: partIds } } });
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.partGrade.deleteMany({ where: { id: { in: partGradeIds } } });
    await prisma.manufacturer.deleteMany({ where: { id: { in: [manufacturerId, otherManufacturerId] } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  });

  describe('CRUD', () => {
    it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shape', async () => {
      const createResponse = await request(app).post('/api/v1/parts').send({
        sku: `SKU-CRUD-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-CRUD-${ts}`,
        name: `Test Part ${ts}`,
        categoryId,
        mrp: 199.5,
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.headers.location).toBe(`/api/v1/parts/${createResponse.body.id}`);
      const created = partSchema.parse(createResponse.body);
      partIds.push(created.id);
      expect(created.unitOfMeasure).toBe('piece');
      expect(created.mrp).toBe(199.5);

      const getResponse = await request(app).get(`/api/v1/parts/${created.id}`);
      expect(getResponse.status).toBe(200);
      expect(partSchema.parse(getResponse.body)).toEqual(created);

      const listResponse = await request(app).get('/api/v1/parts').query({ limit: 100 });
      const envelope = listResponseSchema(partSchema).parse(listResponse.body);
      expect(envelope.data.some((part) => part.id === created.id)).toBe(true);

      const updateResponse = await request(app).patch(`/api/v1/parts/${created.id}`).send({ name: `Renamed ${ts}` });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(`Renamed ${ts}`);

      const deleteResponse = await request(app).delete(`/api/v1/parts/${created.id}`);
      expect(deleteResponse.status).toBe(204);

      const afterDeleteResponse = await request(app).get(`/api/v1/parts/${created.id}`);
      expect(afterDeleteResponse.body.isActive).toBe(false);
    });

    it('actually reassigns manufacturerId and categoryId via PATCH, not just scalar fields', async () => {
      // Dedicated manufacturer/category rather than the shared otherManufacturerId/
      // categoryId fixtures: the "list filters" block below asserts an exact-match
      // count against those, which a reassignment landing on them would inflate.
      const reassignTargetManufacturer = await prisma.manufacturer.create({
        data: { name: `Reassign Target Mfr ${ts}` },
      });
      const reassignTargetCategory = await prisma.category.create({ data: { name: `Reassign Target Category ${ts}` } });

      const createResponse = await request(app).post('/api/v1/parts').send({
        sku: `SKU-REASSIGN-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-REASSIGN-${ts}`,
        name: `Reassign Test Part ${ts}`,
        categoryId,
      });
      partIds.push(createResponse.body.id);

      const updateResponse = await request(app)
        .patch(`/api/v1/parts/${createResponse.body.id}`)
        .send({ manufacturerId: reassignTargetManufacturer.id, categoryId: reassignTargetCategory.id });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.manufacturerId).toBe(reassignTargetManufacturer.id);
      expect(updateResponse.body.categoryId).toBe(reassignTargetCategory.id);

      const persisted = await prisma.part.findUniqueOrThrow({ where: { id: createResponse.body.id } });
      expect(persisted.manufacturerId).toBe(reassignTargetManufacturer.id);
      expect(persisted.categoryId).toBe(reassignTargetCategory.id);

      // Reassign back onto the shared fixtures before the outer afterAll runs, so
      // the dedicated manufacturer/category are the only rows left referencing
      // this part and can be deleted without violating their Restrict FKs.
      await request(app)
        .patch(`/api/v1/parts/${createResponse.body.id}`)
        .send({ manufacturerId, categoryId });
      await prisma.manufacturer.delete({ where: { id: reassignTargetManufacturer.id } });
      await prisma.category.delete({ where: { id: reassignTargetCategory.id } });
    });

    it('round-trips gradeId and copyOfPartId through create and the response', async () => {
      const originalResponse = await request(app).post('/api/v1/parts').send({
        sku: `SKU-FAM-ORIG-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-FAM-ORIG-${ts}`,
        name: `Family Original ${ts}`,
        categoryId,
      });
      partIds.push(originalResponse.body.id);

      const copyResponse = await request(app).post('/api/v1/parts').send({
        sku: `SKU-FAM-COPY-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-FAM-COPY-${ts}`,
        name: `Family Copy ${ts}`,
        categoryId,
        gradeId: partGradeId,
        copyOfPartId: originalResponse.body.id,
      });

      expect(copyResponse.status).toBe(201);
      const created = partSchema.parse(copyResponse.body);
      partIds.push(created.id);
      expect(created.gradeId).toBe(partGradeId);
      expect(created.copyOfPartId).toBe(originalResponse.body.id);

      const getResponse = await request(app).get(`/api/v1/parts/${created.id}`);
      const fetched = partSchema.parse(getResponse.body);
      expect(fetched.gradeId).toBe(partGradeId);
      expect(fetched.copyOfPartId).toBe(originalResponse.body.id);
    });

    it('sets and then clears gradeId and copyOfPartId via PATCH', async () => {
      const originalResponse = await request(app).post('/api/v1/parts').send({
        sku: `SKU-PATCHFAM-ORIG-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-PATCHFAM-ORIG-${ts}`,
        name: `Patch Family Original ${ts}`,
        categoryId,
      });
      partIds.push(originalResponse.body.id);

      const createResponse = await request(app).post('/api/v1/parts').send({
        sku: `SKU-PATCHFAM-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-PATCHFAM-${ts}`,
        name: `Patch Family Part ${ts}`,
        categoryId,
      });
      partIds.push(createResponse.body.id);
      expect(createResponse.body.gradeId).toBeNull();
      expect(createResponse.body.copyOfPartId).toBeNull();

      const setResponse = await request(app)
        .patch(`/api/v1/parts/${createResponse.body.id}`)
        .send({ gradeId: partGradeId, copyOfPartId: originalResponse.body.id });
      expect(setResponse.status).toBe(200);
      expect(setResponse.body.gradeId).toBe(partGradeId);
      expect(setResponse.body.copyOfPartId).toBe(originalResponse.body.id);

      const unrelatedResponse = await request(app)
        .patch(`/api/v1/parts/${createResponse.body.id}`)
        .send({ name: `Patch Family Renamed ${ts}` });
      expect(unrelatedResponse.body.gradeId).toBe(partGradeId);
      expect(unrelatedResponse.body.copyOfPartId).toBe(originalResponse.body.id);

      const clearResponse = await request(app)
        .patch(`/api/v1/parts/${createResponse.body.id}`)
        .send({ gradeId: null, copyOfPartId: null });
      expect(clearResponse.status).toBe(200);
      expect(clearResponse.body.gradeId).toBeNull();
      expect(clearResponse.body.copyOfPartId).toBeNull();
    });

    it('returns 400 VALIDATION_ERROR when required fields are missing', async () => {
      const response = await request(app).post('/api/v1/parts').send({ name: 'x' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND for a nonexistent part', async () => {
      const response = await request(app).get('/api/v1/parts/999999999');

      expect(response.status).toBe(404);
    });

    it('returns 404 NOT_FOUND when manufacturerId does not exist', async () => {
      const response = await request(app).post('/api/v1/parts').send({
        sku: `SKU-GHOST-MFR-${ts}`,
        manufacturerId: 999999999,
        manufacturerPartNumber: `MPN-GHOST-${ts}`,
        name: 'Ghost',
        categoryId,
      });

      expect(response.status).toBe(404);
    });

    it('returns 404 NOT_FOUND when gradeId does not exist', async () => {
      const response = await request(app).post('/api/v1/parts').send({
        sku: `SKU-GHOST-GRADE-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-GHOST-GRADE-${ts}`,
        name: 'Ghost Grade',
        categoryId,
        gradeId: 999999999,
      });

      expect(response.status).toBe(404);
    });

    it('returns 409 CONFLICT when creating a part with a duplicate sku', async () => {
      const sku = `SKU-DUP-${ts}`;
      const first = await request(app)
        .post('/api/v1/parts')
        .send({ sku, manufacturerId, manufacturerPartNumber: `MPN-DUP-A-${ts}`, name: 'A', categoryId });
      partIds.push(first.body.id);

      const second = await request(app)
        .post('/api/v1/parts')
        .send({ sku, manufacturerId, manufacturerPartNumber: `MPN-DUP-B-${ts}`, name: 'B', categoryId });

      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('CONFLICT');
    });

    it('returns 409 CONFLICT when creating a part with a duplicate manufacturerId+manufacturerPartNumber pair', async () => {
      const manufacturerPartNumber = `MPN-DUPPAIR-${ts}`;
      const first = await request(app)
        .post('/api/v1/parts')
        .send({ sku: `SKU-DUPPAIR-A-${ts}`, manufacturerId, manufacturerPartNumber, name: 'A', categoryId });
      partIds.push(first.body.id);

      const second = await request(app)
        .post('/api/v1/parts')
        .send({ sku: `SKU-DUPPAIR-B-${ts}`, manufacturerId, manufacturerPartNumber, name: 'B', categoryId });

      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('CONFLICT');
    });
  });

  describe('flat-family invariant', () => {
    let familyOriginalId: number;
    let familyCopyId: number;
    let familyStandaloneId: number;

    beforeAll(async () => {
      const original = await createPartFixture(prisma, {
        sku: `SKU-FLAT-ORIG-${ts}`,
        manufacturerPartNumber: `MPN-FLAT-ORIG-${ts}`,
        manufacturerId,
        categoryId,
      });
      familyOriginalId = original.id;
      partIds.push(familyOriginalId);

      const copy = await createPartFixture(prisma, {
        sku: `SKU-FLAT-COPY-${ts}`,
        manufacturerPartNumber: `MPN-FLAT-COPY-${ts}`,
        manufacturerId,
        categoryId,
        copyOfPartId: familyOriginalId,
      });
      familyCopyId = copy.id;
      partIds.push(familyCopyId);

      const standalone = await createPartFixture(prisma, {
        sku: `SKU-FLAT-SOLO-${ts}`,
        manufacturerPartNumber: `MPN-FLAT-SOLO-${ts}`,
        manufacturerId,
        categoryId,
      });
      familyStandaloneId = standalone.id;
      partIds.push(familyStandaloneId);
    });

    it('POST linking to a part that is itself a copy returns 400 VALIDATION_ERROR naming the real original', async () => {
      const response = await request(app).post('/api/v1/parts').send({
        sku: `SKU-FLAT-CHAIN-${ts}`,
        manufacturerId,
        manufacturerPartNumber: `MPN-FLAT-CHAIN-${ts}`,
        name: 'Chain Attempt',
        categoryId,
        copyOfPartId: familyCopyId,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain(`part ${familyOriginalId}`);
    });

    it('PATCH turning a part that has copies into a copy returns 400 VALIDATION_ERROR', async () => {
      const response = await request(app)
        .patch(`/api/v1/parts/${familyOriginalId}`)
        .send({ copyOfPartId: familyStandaloneId });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH linking a part to itself returns 400 VALIDATION_ERROR', async () => {
      const response = await request(app)
        .patch(`/api/v1/parts/${familyStandaloneId}`)
        .send({ copyOfPartId: familyStandaloneId });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('list filters', () => {
    let searchablePartId: number;
    let inactivePartId: number;
    let otherCategoryId: number;
    let otherCategoryPartId: number;
    let otherManufacturerPartId: number;
    let filterGradeId: number;
    let gradedPartId: number;

    beforeAll(async () => {
      const searchable = await createPartFixture(prisma, {
        sku: `SKU-SEARCHABLE-${ts}`,
        manufacturerPartNumber: `MPN-SEARCHABLE-${ts}`,
        name: `Zorglub Widget ${ts}`,
        manufacturerId,
        categoryId,
      });
      searchablePartId = searchable.id;
      partIds.push(searchablePartId);

      const inactive = await createPartFixture(prisma, {
        sku: `SKU-INACTIVE-${ts}`,
        manufacturerPartNumber: `MPN-INACTIVE-${ts}`,
        manufacturerId,
        categoryId,
      });
      inactivePartId = inactive.id;
      partIds.push(inactivePartId);
      await prisma.part.update({ where: { id: inactivePartId }, data: { isActive: false } });

      const otherCategory = await prisma.category.create({ data: { name: `Parts Test OtherCat ${ts}` } });
      otherCategoryId = otherCategory.id;
      categoryIds.push(otherCategoryId);
      const otherCategoryPart = await createPartFixture(prisma, {
        sku: `SKU-OTHERCAT-${ts}`,
        manufacturerPartNumber: `MPN-OTHERCAT-${ts}`,
        manufacturerId,
        categoryId: otherCategoryId,
      });
      otherCategoryPartId = otherCategoryPart.id;
      partIds.push(otherCategoryPartId);

      const otherManufacturerPart = await createPartFixture(prisma, {
        sku: `SKU-OTHERMFR-${ts}`,
        manufacturerPartNumber: `MPN-OTHERMFR-${ts}`,
        manufacturerId: otherManufacturerId,
        categoryId,
      });
      otherManufacturerPartId = otherManufacturerPart.id;
      partIds.push(otherManufacturerPartId);

      const filterGrade = await prisma.partGrade.create({ data: { name: `Parts Filter Grade ${ts}` } });
      filterGradeId = filterGrade.id;
      partGradeIds.push(filterGradeId);
      const gradedPart = await createPartFixture(prisma, {
        sku: `SKU-GRADED-${ts}`,
        manufacturerPartNumber: `MPN-GRADED-${ts}`,
        manufacturerId,
        categoryId,
        gradeId: filterGradeId,
      });
      gradedPartId = gradedPart.id;
      partIds.push(gradedPartId);
    });

    it('filters by free-text q against the part name', async () => {
      const response = await request(app).get('/api/v1/parts').query({ q: 'Zorglub' });

      expect(response.body.data.map((part: { id: number }) => part.id)).toEqual([searchablePartId]);
    });

    it('filters by categoryId', async () => {
      const response = await request(app).get('/api/v1/parts').query({ categoryId: otherCategoryId });

      expect(response.body.data.map((part: { id: number }) => part.id)).toEqual([otherCategoryPartId]);
    });

    it('filters by manufacturerId', async () => {
      const response = await request(app).get('/api/v1/parts').query({ manufacturerId: otherManufacturerId });

      expect(response.body.data.map((part: { id: number }) => part.id)).toEqual([otherManufacturerPartId]);
    });

    it('filters by gradeId', async () => {
      const response = await request(app).get('/api/v1/parts').query({ gradeId: filterGradeId });

      expect(response.body.data.map((part: { id: number }) => part.id)).toEqual([gradedPartId]);
    });

    it('filters by isActive=false', async () => {
      const response = await request(app)
        .get('/api/v1/parts')
        .query({ isActive: 'false', manufacturerId, categoryId, limit: 100 });

      const ids = response.body.data.map((part: { id: number }) => part.id);
      expect(ids).toContain(inactivePartId);
      expect(ids).not.toContain(searchablePartId);
    });
  });

  describe('vehicle fitment filters', () => {
    let vehicleClassId: number;
    let vehicleMakeId: number;
    let vehicleModelId: number;
    let classWidePartId: number;
    let modelSpecificPartId: number;
    let universalPartId: number;

    beforeAll(async () => {
      const vehicleClass = await prisma.vehicleClass.create({ data: { name: `PartsFilter Class ${ts}` } });
      vehicleClassId = vehicleClass.id;
      const vehicleMake = await prisma.vehicleMake.create({ data: { name: `PartsFilter Make ${ts}` } });
      vehicleMakeId = vehicleMake.id;
      const vehicleModel = await prisma.vehicleModel.create({
        data: { name: `PartsFilter Model ${ts}`, vehicleMakeId, vehicleClassId },
      });
      vehicleModelId = vehicleModel.id;

      const classWide = await createPartFixture(prisma, {
        sku: `SKU-CLASSWIDE-${ts}`,
        manufacturerPartNumber: `MPN-CLASSWIDE-${ts}`,
        manufacturerId,
        categoryId,
      });
      classWidePartId = classWide.id;
      partIds.push(classWidePartId);
      await prisma.partFitment.create({ data: { partId: classWidePartId, vehicleClassId } });

      const modelSpecific = await createPartFixture(prisma, {
        sku: `SKU-MODELSPECIFIC-${ts}`,
        manufacturerPartNumber: `MPN-MODELSPECIFIC-${ts}`,
        manufacturerId,
        categoryId,
      });
      modelSpecificPartId = modelSpecific.id;
      partIds.push(modelSpecificPartId);
      await prisma.partFitment.create({
        data: { partId: modelSpecificPartId, vehicleClassId, vehicleMakeId, vehicleModelId },
      });

      const universal = await createPartFixture(prisma, {
        sku: `SKU-UNIVERSAL-${ts}`,
        manufacturerPartNumber: `MPN-UNIVERSAL-${ts}`,
        manufacturerId,
        categoryId,
      });
      universalPartId = universal.id;
      partIds.push(universalPartId);
    });

    afterAll(async () => {
      // PartFitment rows must go before their VehicleClass/Make/Model targets
      // (Restrict), and must be removed here rather than left to the outer
      // afterAll's Part cascade, since nested afterAll hooks run before it.
      await prisma.partFitment.deleteMany({
        where: { partId: { in: [classWidePartId, modelSpecificPartId, universalPartId] } },
      });
      await prisma.vehicleModel.delete({ where: { id: vehicleModelId } });
      await prisma.vehicleMake.delete({ where: { id: vehicleMakeId } });
      await prisma.vehicleClass.delete({ where: { id: vehicleClassId } });
    });

    it('vehicleClassId matches class-wide and model-specific parts, excluding the universal (fitment-less) part', async () => {
      const response = await request(app).get('/api/v1/parts').query({ vehicleClassId, limit: 100 });

      const ids = response.body.data.map((part: { id: number }) => part.id);
      expect(ids).toEqual(expect.arrayContaining([classWidePartId, modelSpecificPartId]));
      expect(ids).not.toContain(universalPartId);
    });

    it('vehicleModelId matches class-wide and model-specific parts', async () => {
      const response = await request(app).get('/api/v1/parts').query({ vehicleModelId, limit: 100 });

      const ids = response.body.data.map((part: { id: number }) => part.id);
      expect(ids).toEqual(expect.arrayContaining([classWidePartId, modelSpecificPartId]));
    });

    it('vehicleMakeId matches the model-specific part under that make', async () => {
      const response = await request(app).get('/api/v1/parts').query({ vehicleMakeId, limit: 100 });

      const ids = response.body.data.map((part: { id: number }) => part.id);
      expect(ids).toContain(modelSpecificPartId);
    });
  });

  describe('GET /parts/search', () => {
    let searchPartId: number;
    const sku = `SEARCH-SKU-${ts}`;
    const crossRefNumber = `SEARCH-XREF-${ts}`;

    beforeAll(async () => {
      const part = await createPartFixture(prisma, {
        sku,
        manufacturerPartNumber: `SEARCH-MPN-${ts}`,
        manufacturerId,
        categoryId,
      });
      searchPartId = part.id;
      partIds.push(searchPartId);

      await prisma.partCrossReference.create({
        data: {
          partId: searchPartId,
          refType: RefType.OEM,
          refNumber: crossRefNumber,
          refNumberNormalized: normalizeNumber(crossRefNumber),
        },
      });
    });

    it('finds a part by SKU and reports matchedBy', async () => {
      const response = await request(app).get('/api/v1/parts/search').query({ number: sku });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].matchedBy).toBe('SKU');
      expect(response.body.data[0].matchedNumber).toBe(sku);
      expect(response.body.data[0].id).toBe(searchPartId);
    });

    it('finds a part by a cross-reference number and reports matchedBy', async () => {
      const response = await request(app).get('/api/v1/parts/search').query({ number: crossRefNumber });

      expect(response.body.data[0].matchedBy).toBe('CROSS_REFERENCE');
      expect(response.body.data[0].id).toBe(searchPartId);
    });

    it('recomputes skuNormalized on PATCH so search follows the new sku', async () => {
      const oldSku = `RECOMP-OLD-SKU-${ts}`;
      const newSku = `RECOMP-NEW-SKU-${ts}`;
      const createResponse = await request(app).post('/api/v1/parts').send({
        sku: oldSku,
        manufacturerId,
        manufacturerPartNumber: `RECOMP-SKU-MPN-${ts}`,
        name: `Recompute Sku Part ${ts}`,
        categoryId,
      });
      partIds.push(createResponse.body.id);

      const beforePatch = await request(app).get('/api/v1/parts/search').query({ number: oldSku });
      expect(beforePatch.body.data).toHaveLength(1);
      expect(beforePatch.body.data[0].matchedBy).toBe('SKU');

      const patchResponse = await request(app)
        .patch(`/api/v1/parts/${createResponse.body.id}`)
        .send({ sku: newSku });
      expect(patchResponse.status).toBe(200);

      const oldAfterPatch = await request(app).get('/api/v1/parts/search').query({ number: oldSku });
      expect(oldAfterPatch.body.data).toHaveLength(0);

      const newAfterPatch = await request(app).get('/api/v1/parts/search').query({ number: newSku });
      expect(newAfterPatch.body.data).toHaveLength(1);
      expect(newAfterPatch.body.data[0].matchedBy).toBe('SKU');
      expect(newAfterPatch.body.data[0].id).toBe(createResponse.body.id);
    });

    it('recomputes mpnNormalized on PATCH so search follows the new manufacturer part number', async () => {
      const oldMpn = `RECOMP-OLD-MPN-${ts}`;
      const newMpn = `RECOMP-NEW-MPN-${ts}`;
      const createResponse = await request(app).post('/api/v1/parts').send({
        sku: `RECOMP-MPN-SKU-${ts}`,
        manufacturerId,
        manufacturerPartNumber: oldMpn,
        name: `Recompute Mpn Part ${ts}`,
        categoryId,
      });
      partIds.push(createResponse.body.id);

      const beforePatch = await request(app).get('/api/v1/parts/search').query({ number: oldMpn });
      expect(beforePatch.body.data).toHaveLength(1);
      expect(beforePatch.body.data[0].matchedBy).toBe('MPN');

      const patchResponse = await request(app)
        .patch(`/api/v1/parts/${createResponse.body.id}`)
        .send({ manufacturerPartNumber: newMpn });
      expect(patchResponse.status).toBe(200);

      const oldAfterPatch = await request(app).get('/api/v1/parts/search').query({ number: oldMpn });
      expect(oldAfterPatch.body.data).toHaveLength(0);

      const newAfterPatch = await request(app).get('/api/v1/parts/search').query({ number: newMpn });
      expect(newAfterPatch.body.data).toHaveLength(1);
      expect(newAfterPatch.body.data[0].matchedBy).toBe('MPN');
      expect(newAfterPatch.body.data[0].id).toBe(createResponse.body.id);
    });

    it('returns 400 VALIDATION_ERROR when number is missing', async () => {
      const response = await request(app).get('/api/v1/parts/search');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /parts/:id 360 view', () => {
    let p360PartId: number;
    let shopId: number;
    let vehicleClassId: number;
    let supplierId: number;

    beforeAll(async () => {
      const part = await createPartFixture(prisma, {
        sku: `P360-SKU-${ts}`,
        manufacturerPartNumber: `P360-MPN-${ts}`,
        manufacturerId,
        categoryId,
      });
      p360PartId = part.id;
      partIds.push(p360PartId);

      const vehicleClass = await prisma.vehicleClass.create({ data: { name: `P360 Class ${ts}` } });
      vehicleClassId = vehicleClass.id;
      await prisma.partFitment.create({ data: { partId: p360PartId, vehicleClassId } });

      const crossRefNumber = `P360-XREF-${ts}`;
      await prisma.partCrossReference.create({
        data: {
          partId: p360PartId,
          refType: RefType.OEM,
          refNumber: crossRefNumber,
          refNumberNormalized: normalizeNumber(crossRefNumber),
        },
      });

      const supplier = await prisma.supplier.create({ data: { name: `P360 Supplier ${ts}` } });
      supplierId = supplier.id;
      await prisma.supplierPart.create({
        data: { partId: p360PartId, supplierId, supplierPartNumber: `P360-SUPNUM-${ts}` },
      });

      const shop = await prisma.shop.create({ data: { name: `P360 Shop ${ts}` } });
      shopId = shop.id;
      await prisma.inventoryItem.create({ data: { shopId, partId: p360PartId, quantityOnHand: 5 } });
    });

    afterAll(async () => {
      await prisma.inventoryItem.deleteMany({ where: { partId: p360PartId } });
      await prisma.shop.delete({ where: { id: shopId } });
      await prisma.supplierPart.deleteMany({ where: { partId: p360PartId } });
      await prisma.supplier.delete({ where: { id: supplierId } });
      await prisma.partCrossReference.deleteMany({ where: { partId: p360PartId } });
      await prisma.partFitment.deleteMany({ where: { partId: p360PartId } });
      await prisma.vehicleClass.delete({ where: { id: vehicleClassId } });
    });

    it('embeds all four related collections when include=fitments,crossReferences,suppliers,inventory', async () => {
      const response = await request(app)
        .get(`/api/v1/parts/${p360PartId}`)
        .query({ include: 'fitments,crossReferences,suppliers,inventory' });

      expect(response.status).toBe(200);
      expect(response.body.fitments).toHaveLength(1);
      expect(response.body.fitments[0].vehicleClassName).toBeTruthy();
      expect(response.body.crossReferences).toHaveLength(1);
      expect(response.body.suppliers).toHaveLength(1);
      expect(response.body.suppliers[0].supplierName).toBeTruthy();
      expect(response.body.inventory).toHaveLength(1);
      expect(response.body.inventory[0].shopName).toBeTruthy();
      expect(response.body.inventory[0].quantityOnHand).toBe(5);
    });

    it('omits every related collection when include is not given', async () => {
      const response = await request(app).get(`/api/v1/parts/${p360PartId}`);

      expect(response.status).toBe(200);
      expect(response.body.fitments).toBeUndefined();
      expect(response.body.crossReferences).toBeUndefined();
      expect(response.body.suppliers).toBeUndefined();
      expect(response.body.inventory).toBeUndefined();
    });
  });

  describe('part fitments sub-resource', () => {
    let fitmentPartId: number;
    let vehicleClassId: number;
    let vehicleMakeId: number;
    let vehicleModelId: number;

    beforeAll(async () => {
      const part = await createPartFixture(prisma, {
        sku: `FIT-SKU-${ts}`,
        manufacturerPartNumber: `FIT-MPN-${ts}`,
        manufacturerId,
        categoryId,
      });
      fitmentPartId = part.id;
      partIds.push(fitmentPartId);

      const vehicleClass = await prisma.vehicleClass.create({ data: { name: `Fitments Class ${ts}` } });
      vehicleClassId = vehicleClass.id;
      const vehicleMake = await prisma.vehicleMake.create({ data: { name: `Fitments Make ${ts}` } });
      vehicleMakeId = vehicleMake.id;
      const vehicleModel = await prisma.vehicleModel.create({
        data: { name: `Fitments Model ${ts}`, vehicleMakeId, vehicleClassId },
      });
      vehicleModelId = vehicleModel.id;
    });

    afterAll(async () => {
      await prisma.partFitment.deleteMany({ where: { partId: fitmentPartId } });
      await prisma.vehicleModel.delete({ where: { id: vehicleModelId } });
      await prisma.vehicleMake.delete({ where: { id: vehicleMakeId } });
      await prisma.vehicleClass.delete({ where: { id: vehicleClassId } });
    });

    it('creates, lists, and deletes a fitment, asserting the Location header', async () => {
      const createResponse = await request(app)
        .post(`/api/v1/parts/${fitmentPartId}/fitments`)
        .send({ vehicleClassId, vehicleMakeId, vehicleModelId });

      expect(createResponse.status).toBe(201);
      expect(createResponse.headers.location).toBe(
        `/api/v1/parts/${fitmentPartId}/fitments/${createResponse.body.id}`,
      );

      const listResponse = await request(app).get(`/api/v1/parts/${fitmentPartId}/fitments`);
      expect(listResponse.body.data.some((fitment: { id: number }) => fitment.id === createResponse.body.id)).toBe(
        true,
      );

      const deleteResponse = await request(app).delete(
        `/api/v1/parts/${fitmentPartId}/fitments/${createResponse.body.id}`,
      );
      expect(deleteResponse.status).toBe(204);

      const afterDeleteResponse = await request(app).get(`/api/v1/parts/${fitmentPartId}/fitments`);
      expect(
        afterDeleteResponse.body.data.some((fitment: { id: number }) => fitment.id === createResponse.body.id),
      ).toBe(false);
    });

    it('returns 400 VALIDATION_ERROR when vehicleModelId is set without vehicleMakeId', async () => {
      const response = await request(app)
        .post(`/api/v1/parts/${fitmentPartId}/fitments`)
        .send({ vehicleClassId, vehicleModelId });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND when the part does not exist', async () => {
      const response = await request(app).post('/api/v1/parts/999999999/fitments').send({ vehicleClassId });

      expect(response.status).toBe(404);
    });

    it('returns 404 NOT_FOUND when deleting a nonexistent fitment', async () => {
      const response = await request(app).delete(`/api/v1/parts/${fitmentPartId}/fitments/999999999`);

      expect(response.status).toBe(404);
    });

    it('returns 409 CONFLICT when creating the same class-level fitment twice', async () => {
      const first = await request(app).post(`/api/v1/parts/${fitmentPartId}/fitments`).send({ vehicleClassId });
      expect(first.status).toBe(201);

      const second = await request(app).post(`/api/v1/parts/${fitmentPartId}/fitments`).send({ vehicleClassId });

      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('CONFLICT');
    });
  });

  describe('part cross-references sub-resource', () => {
    let crossRefPartId: number;

    beforeAll(async () => {
      const part = await createPartFixture(prisma, {
        sku: `XREF-SKU-${ts}`,
        manufacturerPartNumber: `XREF-MPN-${ts}`,
        manufacturerId,
        categoryId,
      });
      crossRefPartId = part.id;
      partIds.push(crossRefPartId);
    });

    it('creates, lists, and deletes a cross-reference, asserting the Location header', async () => {
      const createResponse = await request(app)
        .post(`/api/v1/parts/${crossRefPartId}/cross-references`)
        .send({ refType: 'OEM', refNumber: `XREF-NUM-${ts}`, refBrand: 'Bosch' });

      expect(createResponse.status).toBe(201);
      expect(createResponse.headers.location).toBe(
        `/api/v1/parts/${crossRefPartId}/cross-references/${createResponse.body.id}`,
      );

      const listResponse = await request(app).get(`/api/v1/parts/${crossRefPartId}/cross-references`);
      expect(listResponse.body.data.some((ref: { id: number }) => ref.id === createResponse.body.id)).toBe(true);

      const deleteResponse = await request(app).delete(
        `/api/v1/parts/${crossRefPartId}/cross-references/${createResponse.body.id}`,
      );
      expect(deleteResponse.status).toBe(204);
    });

    it('returns 400 VALIDATION_ERROR when refType is invalid', async () => {
      const response = await request(app)
        .post(`/api/v1/parts/${crossRefPartId}/cross-references`)
        .send({ refType: 'BOGUS', refNumber: 'x' });

      expect(response.status).toBe(400);
    });

    it('returns 404 NOT_FOUND when the part does not exist', async () => {
      const response = await request(app)
        .post('/api/v1/parts/999999999/cross-references')
        .send({ refType: 'OEM', refNumber: 'x' });

      expect(response.status).toBe(404);
    });

    it('returns 404 NOT_FOUND when deleting a nonexistent cross-reference', async () => {
      const response = await request(app).delete(`/api/v1/parts/${crossRefPartId}/cross-references/999999999`);

      expect(response.status).toBe(404);
    });
  });

  describe('part suppliers sub-resource', () => {
    let supplierPartOwnerId: number;
    let supplierId: number;

    beforeAll(async () => {
      const part = await createPartFixture(prisma, {
        sku: `SUPL-SKU-${ts}`,
        manufacturerPartNumber: `SUPL-MPN-${ts}`,
        manufacturerId,
        categoryId,
      });
      supplierPartOwnerId = part.id;
      partIds.push(supplierPartOwnerId);

      const supplier = await prisma.supplier.create({ data: { name: `PartSuppliers Test Supplier ${ts}` } });
      supplierId = supplier.id;
    });

    afterAll(async () => {
      await prisma.supplier.delete({ where: { id: supplierId } });
    });

    it('creates, lists, updates, and deletes a supplier link, asserting the Location header', async () => {
      const createResponse = await request(app)
        .post(`/api/v1/parts/${supplierPartOwnerId}/suppliers`)
        .send({ supplierId, supplierPartNumber: `SUPL-NUM-${ts}` });

      expect(createResponse.status).toBe(201);
      expect(createResponse.headers.location).toBe(
        `/api/v1/parts/${supplierPartOwnerId}/suppliers/${createResponse.body.id}`,
      );
      expect(createResponse.body.isPreferred).toBe(false);

      const listResponse = await request(app).get(`/api/v1/parts/${supplierPartOwnerId}/suppliers`);
      expect(listResponse.body.data.some((link: { id: number }) => link.id === createResponse.body.id)).toBe(true);

      const updateResponse = await request(app)
        .patch(`/api/v1/parts/${supplierPartOwnerId}/suppliers/${createResponse.body.id}`)
        .send({ isPreferred: true });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.isPreferred).toBe(true);

      const deleteResponse = await request(app).delete(
        `/api/v1/parts/${supplierPartOwnerId}/suppliers/${createResponse.body.id}`,
      );
      expect(deleteResponse.status).toBe(204);
    });

    it('returns 400 VALIDATION_ERROR when supplierId is missing', async () => {
      const response = await request(app).post(`/api/v1/parts/${supplierPartOwnerId}/suppliers`).send({});

      expect(response.status).toBe(400);
    });

    it('returns 404 NOT_FOUND when the part does not exist', async () => {
      const response = await request(app).post('/api/v1/parts/999999999/suppliers').send({ supplierId });

      expect(response.status).toBe(404);
    });

    it('returns 404 NOT_FOUND when updating a nonexistent supplier link', async () => {
      const response = await request(app)
        .patch(`/api/v1/parts/${supplierPartOwnerId}/suppliers/999999999`)
        .send({ isPreferred: true });

      expect(response.status).toBe(404);
    });
  });
});
