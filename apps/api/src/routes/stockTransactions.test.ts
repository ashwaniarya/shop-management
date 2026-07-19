// Behavioural test: exercises the stock-transactions ledger end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createCatalogFixture, createPartFixture, createUserWithCredentials, tokenFor } from '../services/test-fixtures';

// The acting user is now derived from the Bearer token (never the body). authApi
// carries an OWNER token in shopId; staffToken belongs to a STAFF user in the same
// shop, used to exercise the STAFF "sales only" gate.
let token = '';
let staffToken = '';
const authApi = {
  get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
};
const staffPost = (url: string) => request(app).post(url).set('Authorization', `Bearer ${staffToken}`);

describe('stock transactions router', () => {
  const ts = Date.now();
  let manufacturerId: number;
  let categoryId: number;
  let shopId: number;
  let otherShopId: number;
  let ownerUserId: number;
  let staffUserId: number;
  let partId: number;
  const partIds: number[] = [];

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `StockTx Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;
    const shop = await prisma.shop.create({ data: { name: `StockTx Test Shop ${ts}` } });
    shopId = shop.id;
    const otherShop = await prisma.shop.create({ data: { name: `StockTx Test Other Shop ${ts}` } });
    otherShopId = otherShop.id;

    const owner = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: `stocktx-owner-${ts}`,
      pin: '1234',
    });
    ownerUserId = owner.id;
    token = tokenFor(owner);

    const staff = await createUserWithCredentials({
      shopId,
      role: UserRole.STAFF,
      username: `stocktx-staff-${ts}`,
      pin: '1234',
    });
    staffUserId = staff.id;
    staffToken = tokenFor(staff);

    const part = await createPartFixture(prisma, {
      sku: `STX-SKU-${ts}`,
      manufacturerPartNumber: `STX-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partId = part.id;
    partIds.push(partId);
  });

  afterAll(async () => {
    await prisma.stockTransaction.deleteMany({ where: { shopId } });
    await prisma.inventoryItem.deleteMany({ where: { shopId } });
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.user.deleteMany({ where: { shopId } });
    await prisma.shop.delete({ where: { id: shopId } });
    await prisma.shop.delete({ where: { id: otherShopId } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
    await prisma.category.delete({ where: { id: categoryId } });
  });

  it('runs PURCHASE, SALE, an oversell 400, then verifies the ledger is newest-first and the summary math', async () => {
    const purchaseResponse = await authApi
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId, type: 'PURCHASE', quantity: 10, unitPrice: 100 });

    expect(purchaseResponse.status).toBe(201);
    expect(purchaseResponse.headers.location).toBe(
      `/api/v1/shops/${shopId}/stock-transactions/${purchaseResponse.body.id}`,
    );
    expect(purchaseResponse.body.quantity).toBe(10);
    // userId is taken from the authenticated token, not the request body.
    expect(purchaseResponse.body.userId).toBe(ownerUserId);

    const saleResponse = await authApi
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId, type: 'SALE', quantity: 4, unitPrice: 150 });

    expect(saleResponse.status).toBe(201);
    expect(saleResponse.body.quantity).toBe(-4);

    const oversellResponse = await authApi
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId, type: 'SALE', quantity: 100, unitPrice: 150 });

    expect(oversellResponse.status).toBe(400);
    expect(oversellResponse.body.error.code).toBe('INSUFFICIENT_STOCK');

    const listResponse = await authApi.get(`/api/v1/shops/${shopId}/stock-transactions`).query({ limit: 100 });
    expect(listResponse.status).toBe(200);
    const rows = listResponse.body.data;
    expect(rows.length).toBe(2);
    expect(rows[0].type).toBe('SALE');
    expect(rows[1].type).toBe('PURCHASE');

    const summaryResponse = await authApi.get(`/api/v1/shops/${shopId}/stock-transactions/summary`);
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.purchases).toEqual({ count: 1, quantity: 10, cost: 1000 });
    expect(summaryResponse.body.sales).toEqual({ count: 1, quantity: 4, revenue: 600 });
    expect(summaryResponse.body.adjustments).toEqual({ count: 0, quantity: 0 });
  });

  it('returns 400 VALIDATION_ERROR when required fields are missing', async () => {
    const response = await authApi.post(`/api/v1/shops/${shopId}/stock-transactions`).send({ partId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Was a 404 "nonexistent shop" case; requireSameShop now guards this route, so a
  // token scoped to shopId posting to any other shop is a 403 (cross-shop) before
  // the handler runs. otherShopId exists but isn't the caller's shop.
  it('returns 403 FORBIDDEN when a token for one shop posts to another shop', async () => {
    const response = await authApi
      .post(`/api/v1/shops/${otherShopId}/stock-transactions`)
      .send({ partId, type: 'PURCHASE', quantity: 1, unitPrice: 1 });

    expect(response.status).toBe(403);
  });

  it('filters the ledger by type', async () => {
    const response = await authApi
      .get(`/api/v1/shops/${shopId}/stock-transactions`)
      .query({ type: 'PURCHASE', limit: 100 });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((row: { type: string }) => row.type === 'PURCHASE')).toBe(true);
  });

  it('has no PATCH or DELETE routes on the ledger, since it is append-only', async () => {
    const patchOnCollection = await authApi.patch(`/api/v1/shops/${shopId}/stock-transactions`).send({});
    expect([404, 405]).toContain(patchOnCollection.status);

    const listResponse = await authApi.get(`/api/v1/shops/${shopId}/stock-transactions`).query({ limit: 1 });
    const anyTransactionId = listResponse.body.data[0].id;
    const deleteAttempt = await authApi.delete(
      `/api/v1/shops/${shopId}/stock-transactions/${anyTransactionId}`,
    );
    expect([404, 405]).toContain(deleteAttempt.status);
  });

  it('forbids a STAFF user from recording a PURCHASE (403)', async () => {
    const response = await staffPost(`/api/v1/shops/${shopId}/stock-transactions`).send({
      partId,
      type: 'PURCHASE',
      quantity: 1,
      unitPrice: 1,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('lets a STAFF user record a SALE when there is enough stock (201), crediting the token user', async () => {
    const part = await createPartFixture(prisma, {
      sku: `STX-STAFF-SALE-SKU-${ts}`,
      manufacturerPartNumber: `STX-STAFF-SALE-MPN-${ts}`,
      manufacturerId,
      categoryId,
    });
    partIds.push(part.id);

    // OWNER stocks the part first (STAFF may not PURCHASE).
    const purchase = await authApi
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId: part.id, type: 'PURCHASE', quantity: 5, unitPrice: 100 });
    expect(purchase.status).toBe(201);

    const sale = await staffPost(`/api/v1/shops/${shopId}/stock-transactions`).send({
      partId: part.id,
      type: 'SALE',
      quantity: 2,
      unitPrice: 150,
    });

    expect(sale.status).toBe(201);
    expect(sale.body.quantity).toBe(-2);
    expect(sale.body.userId).toBe(staffUserId);
  });
});
