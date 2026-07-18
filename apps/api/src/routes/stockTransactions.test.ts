// Behavioural test: exercises the stock-transactions ledger end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createCatalogFixture, createPartFixture } from '../services/test-fixtures';

describe('stock transactions router', () => {
  const ts = Date.now();
  let manufacturerId: number;
  let categoryId: number;
  let shopId: number;
  let userId: number;
  let partId: number;

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `StockTx Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;
    const shop = await prisma.shop.create({ data: { name: `StockTx Test Shop ${ts}` } });
    shopId = shop.id;
    const user = await prisma.user.create({ data: { shopId, name: `StockTx Test User ${ts}`, role: UserRole.OWNER } });
    userId = user.id;
    const part = await createPartFixture(prisma, {
      sku: `STX-SKU-${ts}`,
      manufacturerPartNumber: `STX-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partId = part.id;
  });

  afterAll(async () => {
    await prisma.stockTransaction.deleteMany({ where: { shopId } });
    await prisma.inventoryItem.deleteMany({ where: { shopId } });
    await prisma.part.delete({ where: { id: partId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.shop.delete({ where: { id: shopId } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
    await prisma.category.delete({ where: { id: categoryId } });
  });

  it('runs PURCHASE, SALE, an oversell 400, then verifies the ledger is newest-first and the summary math', async () => {
    const purchaseResponse = await request(app)
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId, userId, type: 'PURCHASE', quantity: 10, unitPrice: 100 });

    expect(purchaseResponse.status).toBe(201);
    expect(purchaseResponse.headers.location).toBe(
      `/api/v1/shops/${shopId}/stock-transactions/${purchaseResponse.body.id}`,
    );
    expect(purchaseResponse.body.quantity).toBe(10);

    const saleResponse = await request(app)
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId, userId, type: 'SALE', quantity: 4, unitPrice: 150 });

    expect(saleResponse.status).toBe(201);
    expect(saleResponse.body.quantity).toBe(-4);

    const oversellResponse = await request(app)
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId, userId, type: 'SALE', quantity: 100, unitPrice: 150 });

    expect(oversellResponse.status).toBe(400);
    expect(oversellResponse.body.error.code).toBe('INSUFFICIENT_STOCK');

    const listResponse = await request(app).get(`/api/v1/shops/${shopId}/stock-transactions`).query({ limit: 100 });
    expect(listResponse.status).toBe(200);
    const rows = listResponse.body.data;
    expect(rows.length).toBe(2);
    expect(rows[0].type).toBe('SALE');
    expect(rows[1].type).toBe('PURCHASE');

    const summaryResponse = await request(app).get(`/api/v1/shops/${shopId}/stock-transactions/summary`);
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.purchases).toEqual({ count: 1, quantity: 10, cost: 1000 });
    expect(summaryResponse.body.sales).toEqual({ count: 1, quantity: 4, revenue: 600 });
    expect(summaryResponse.body.adjustments).toEqual({ count: 0, quantity: 0 });
  });

  it('returns 400 VALIDATION_ERROR when required fields are missing', async () => {
    const response = await request(app).post(`/api/v1/shops/${shopId}/stock-transactions`).send({ partId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND when the shop does not exist', async () => {
    const response = await request(app)
      .post('/api/v1/shops/999999999/stock-transactions')
      .send({ partId, userId, type: 'PURCHASE', quantity: 1, unitPrice: 1 });

    expect(response.status).toBe(404);
  });

  it('filters the ledger by type', async () => {
    const response = await request(app)
      .get(`/api/v1/shops/${shopId}/stock-transactions`)
      .query({ type: 'PURCHASE', limit: 100 });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((row: { type: string }) => row.type === 'PURCHASE')).toBe(true);
  });

  it('has no PATCH or DELETE routes on the ledger, since it is append-only', async () => {
    const patchOnCollection = await request(app).patch(`/api/v1/shops/${shopId}/stock-transactions`).send({});
    expect([404, 405]).toContain(patchOnCollection.status);

    const listResponse = await request(app).get(`/api/v1/shops/${shopId}/stock-transactions`).query({ limit: 1 });
    const anyTransactionId = listResponse.body.data[0].id;
    const deleteAttempt = await request(app).delete(
      `/api/v1/shops/${shopId}/stock-transactions/${anyTransactionId}`,
    );
    expect([404, 405]).toContain(deleteAttempt.status);
  });
});
