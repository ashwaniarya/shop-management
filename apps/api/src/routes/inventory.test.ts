// Behavioural test: exercises the inventory router end-to-end via supertest against the real DB
import { StockTransactionType, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { appendStockTransaction } from '../services/stockLedger';
import { createCatalogFixture, createPartFixture } from '../services/test-fixtures';

describe('inventory router', () => {
  const ts = Date.now();
  let manufacturerId: number;
  let categoryId: number;
  let shopId: number;
  const partIds: number[] = [];
  const userIds: number[] = [];

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `Inventory Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;
    const shop = await prisma.shop.create({ data: { name: `Inventory Test Shop ${ts}` } });
    shopId = shop.id;
  });

  afterAll(async () => {
    await prisma.stockTransaction.deleteMany({ where: { shopId } });
    await prisma.inventoryItem.deleteMany({ where: { shopId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.shop.delete({ where: { id: shopId } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
    await prisma.category.delete({ where: { id: categoryId } });
  });

  it('creates settings via PUT, reads them back, updates them, and lists the row with its part summary', async () => {
    const part = await createPartFixture(prisma, {
      sku: `INV-SKU-${ts}`,
      manufacturerPartNumber: `INV-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(part.id);

    const createResponse = await request(app)
      .put(`/api/v1/shops/${shopId}/inventory/${part.id}`)
      .send({ reorderLevel: 5, costPrice: 100, sellingPrice: 150, storageLocation: 'Rack A1' });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.quantityOnHand).toBe(0);
    expect(createResponse.body.reorderLevel).toBe(5);
    expect(createResponse.body.storageLocation).toBe('Rack A1');

    const getResponse = await request(app).get(`/api/v1/shops/${shopId}/inventory/${part.id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toEqual(createResponse.body);

    const updateResponse = await request(app)
      .put(`/api/v1/shops/${shopId}/inventory/${part.id}`)
      .send({ reorderLevel: 8 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.reorderLevel).toBe(8);
    expect(updateResponse.body.storageLocation).toBe('Rack A1');

    const listResponse = await request(app).get(`/api/v1/shops/${shopId}/inventory`).query({ limit: 100 });
    expect(listResponse.status).toBe(200);
    const row = listResponse.body.data.find((item: { partId: number }) => item.partId === part.id);
    expect(row).toBeDefined();
    expect(row.part.sku).toBe(`INV-SKU-${ts}`);
    expect(row.part.manufacturerName).toBeTruthy();
  });

  it('rejects quantityOnHand in the PUT body even alongside otherwise-valid fields (strict rejection)', async () => {
    const part = await createPartFixture(prisma, {
      sku: `INV-STRICT-SKU-${ts}`,
      manufacturerPartNumber: `INV-STRICT-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(part.id);

    const response = await request(app)
      .put(`/api/v1/shops/${shopId}/inventory/${part.id}`)
      .send({ reorderLevel: 5, quantityOnHand: 999 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');

    const afterResponse = await request(app).get(`/api/v1/shops/${shopId}/inventory/${part.id}`);
    expect(afterResponse.status).toBe(404);
  });

  it('returns 404 NOT_FOUND when the shop does not exist', async () => {
    const part = await createPartFixture(prisma, {
      sku: `INV-NOSHOP-SKU-${ts}`,
      manufacturerPartNumber: `INV-NOSHOP-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(part.id);

    const response = await request(app)
      .put(`/api/v1/shops/999999999/inventory/${part.id}`)
      .send({ reorderLevel: 1 });

    expect(response.status).toBe(404);
  });

  it('returns 404 NOT_FOUND when the part does not exist', async () => {
    const response = await request(app).put(`/api/v1/shops/${shopId}/inventory/999999999`).send({ reorderLevel: 1 });

    expect(response.status).toBe(404);
  });

  it('returns 404 NOT_FOUND when getting inventory for a part with no record yet', async () => {
    const part = await createPartFixture(prisma, {
      sku: `INV-NOREC-SKU-${ts}`,
      manufacturerPartNumber: `INV-NOREC-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(part.id);

    const response = await request(app).get(`/api/v1/shops/${shopId}/inventory/${part.id}`);

    expect(response.status).toBe(404);
  });

  it('filters by belowReorder, comparing quantityOnHand against each row\'s own reorderLevel', async () => {
    const user = await prisma.user.create({
      data: { shopId, name: `Inventory BelowReorder User ${ts}`, role: UserRole.OWNER },
    });
    userIds.push(user.id);

    const lowStockPart = await createPartFixture(prisma, {
      sku: `INV-LOW-SKU-${ts}`,
      manufacturerPartNumber: `INV-LOW-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(lowStockPart.id);
    await request(app).put(`/api/v1/shops/${shopId}/inventory/${lowStockPart.id}`).send({ reorderLevel: 10 });

    const healthyStockPart = await createPartFixture(prisma, {
      sku: `INV-HEALTHY-SKU-${ts}`,
      manufacturerPartNumber: `INV-HEALTHY-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(healthyStockPart.id);
    await request(app).put(`/api/v1/shops/${shopId}/inventory/${healthyStockPart.id}`).send({ reorderLevel: 2 });
    await appendStockTransaction({
      shopId,
      partId: healthyStockPart.id,
      userId: user.id,
      type: StockTransactionType.PURCHASE,
      quantity: 20,
      unitPrice: 10,
    });

    const response = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .query({ belowReorder: 'true', limit: 100 });

    const ids = response.body.data.map((row: { partId: number }) => row.partId);
    expect(ids).toContain(lowStockPart.id);
    expect(ids).not.toContain(healthyStockPart.id);
  });
});
