// Behavioural test: exercises the invoices router end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createCatalogFixture, createPartFixture, createUserWithCredentials, tokenFor } from '../services/test-fixtures';

let token = '';
let otherShopToken = '';
const authApi = {
  get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
};
const otherShopApi = {
  post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${otherShopToken}`),
};

describe('invoices router', () => {
  const ts = Date.now();
  const ownerName = `Invoices Route Owner ${ts}`;

  let manufacturerId: number;
  let categoryId: number;
  let shopId: number;
  let otherShopId: number;
  let partAId: number;
  let partBId: number;
  let lowStockPartId: number;
  let foreignInvoiceId: number;
  const partIds: number[] = [];

  beforeAll(async () => {
    const catalog = await createCatalogFixture(prisma, `Invoices Route Test ${ts}`);
    manufacturerId = catalog.manufacturerId;
    categoryId = catalog.categoryId;

    const shop = await prisma.shop.create({
      data: {
        name: `Invoices Route Test Shop ${ts}`,
        address: `${ts} Test Street`,
        phone: '5550001111',
        gstin: `GSTIN-${ts}`,
      },
    });
    shopId = shop.id;
    const otherShop = await prisma.shop.create({ data: { name: `Invoices Route Test Other Shop ${ts}` } });
    otherShopId = otherShop.id;

    const owner = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: `invoices-owner-${ts}`,
      pin: '1234',
      name: ownerName,
    });
    token = tokenFor(owner);

    const otherOwner = await createUserWithCredentials({
      shopId: otherShopId,
      role: UserRole.OWNER,
      username: `invoices-other-owner-${ts}`,
      pin: '1234',
    });
    otherShopToken = tokenFor(otherOwner);

    const partA = await createPartFixture(prisma, {
      sku: `INVR-SKU-A-${ts}`,
      manufacturerPartNumber: `INVR-MPN-A-${ts}`,
      manufacturerId,
      categoryId,
    });
    partAId = partA.id;
    partIds.push(partAId);

    const partB = await createPartFixture(prisma, {
      sku: `INVR-SKU-B-${ts}`,
      manufacturerPartNumber: `INVR-MPN-B-${ts}`,
      manufacturerId,
      categoryId,
    });
    partBId = partB.id;
    partIds.push(partBId);

    const lowStockPart = await createPartFixture(prisma, {
      sku: `INVR-SKU-LOW-${ts}`,
      manufacturerPartNumber: `INVR-MPN-LOW-${ts}`,
      manufacturerId,
      categoryId,
    });
    lowStockPartId = lowStockPart.id;
    partIds.push(lowStockPartId);

    await authApi
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId: partAId, type: 'PURCHASE', quantity: 20, unitPrice: 100 });
    await authApi
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId: partBId, type: 'PURCHASE', quantity: 20, unitPrice: 50 });
    await authApi
      .post(`/api/v1/shops/${shopId}/stock-transactions`)
      .send({ partId: lowStockPartId, type: 'PURCHASE', quantity: 1, unitPrice: 10 });

    // A real invoice that belongs to a different shop, to prove a foreign id 404s
    // instead of leaking (rather than reaching into a shop the caller's token can't see).
    await otherShopApi
      .post(`/api/v1/shops/${otherShopId}/stock-transactions`)
      .send({ partId: partAId, type: 'PURCHASE', quantity: 5, unitPrice: 100 });
    const foreignInvoice = await otherShopApi
      .post(`/api/v1/shops/${otherShopId}/invoices`)
      .send({ lines: [{ partId: partAId, quantity: 1, unitPrice: 100 }] });
    foreignInvoiceId = foreignInvoice.body.id;
  });

  afterAll(async () => {
    const shopIds = [shopId, otherShopId];
    await prisma.invoiceLine.deleteMany({ where: { invoice: { shopId: { in: shopIds } } } });
    await prisma.invoice.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.invoiceSequence.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.stockTransaction.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.inventoryItem.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.user.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.manufacturer.delete({ where: { id: manufacturerId } });
    await prisma.category.delete({ where: { id: categoryId } });
  });

  let firstInvoiceId: number;

  it('checks out a 2-line invoice: 201, Location, full detail, and decrements inventory', async () => {
    const response = await authApi.post(`/api/v1/shops/${shopId}/invoices`).send({
      customerName: 'Walk-in',
      customerPhone: '9999999999',
      lines: [
        { partId: partAId, quantity: 2, unitPrice: 150 },
        { partId: partBId, quantity: 3, unitPrice: 50 },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(`/api/v1/shops/${shopId}/invoices/${response.body.id}`);
    expect(response.body.invoiceNumber).toMatch(/^INV-\d{6}$/);
    expect(response.body.total).toBe(450);
    expect(response.body.salesmanName).toBe(ownerName);
    expect(response.body.shop).toEqual({
      name: `Invoices Route Test Shop ${ts}`,
      address: `${ts} Test Street`,
      phone: '5550001111',
      gstin: `GSTIN-${ts}`,
    });

    expect(response.body.lines).toHaveLength(2);
    const [lineA, lineB] = response.body.lines;
    expect(lineA.partId).toBe(partAId);
    expect(lineA.quantity).toBe(2);
    expect(lineA.unitPrice).toBe(150);
    expect(lineA.lineTotal).toBe(300);
    expect(lineA.partSku).toBe(`INVR-SKU-A-${ts}`);
    expect(typeof lineA.stockTransactionId).toBe('number');
    expect(lineB.partId).toBe(partBId);
    expect(lineB.lineTotal).toBe(150);
    expect(typeof lineB.stockTransactionId).toBe('number');

    const inventoryA = await authApi.get(`/api/v1/shops/${shopId}/inventory/${partAId}`);
    expect(inventoryA.body.quantityOnHand).toBe(18);
    const inventoryB = await authApi.get(`/api/v1/shops/${shopId}/inventory/${partBId}`);
    expect(inventoryB.body.quantityOnHand).toBe(17);

    firstInvoiceId = response.body.id;
  });

  it('lists invoices newest-first with an itemCount per row', async () => {
    const secondResponse = await authApi
      .post(`/api/v1/shops/${shopId}/invoices`)
      .send({ lines: [{ partId: partAId, quantity: 1, unitPrice: 150 }] });
    expect(secondResponse.status).toBe(201);
    const secondInvoiceId = secondResponse.body.id;

    const listResponse = await authApi.get(`/api/v1/shops/${shopId}/invoices`).query({ limit: 100 });
    expect(listResponse.status).toBe(200);

    const rows = listResponse.body.data;
    const secondIndex = rows.findIndex((row: { id: number }) => row.id === secondInvoiceId);
    const firstIndex = rows.findIndex((row: { id: number }) => row.id === firstInvoiceId);
    expect(secondIndex).toBeGreaterThanOrEqual(0);
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeLessThan(firstIndex);
    expect(rows[secondIndex].itemCount).toBe(1);
    expect(rows[firstIndex].itemCount).toBe(2);
  });

  it('gets the full invoice detail by id', async () => {
    const response = await authApi.get(`/api/v1/shops/${shopId}/invoices/${firstInvoiceId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(firstInvoiceId);
    expect(response.body.lines).toHaveLength(2);
    expect(response.body.salesmanName).toBe(ownerName);
    expect(response.body.shop.name).toBe(`Invoices Route Test Shop ${ts}`);
  });

  it("404s when the invoice id belongs to a different shop", async () => {
    const response = await authApi.get(`/api/v1/shops/${shopId}/invoices/${foreignInvoiceId}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const response = await request(app).get(`/api/v1/shops/${shopId}/invoices`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it("forbids a token for one shop from checking out into another shop's path (403)", async () => {
    const response = await authApi
      .post(`/api/v1/shops/${otherShopId}/invoices`)
      .send({ lines: [{ partId: partAId, quantity: 1, unitPrice: 100 }] });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an empty lines array with 400', async () => {
    const response = await authApi.post(`/api/v1/shops/${shopId}/invoices`).send({ lines: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an oversell with 400 INSUFFICIENT_STOCK and writes no invoice', async () => {
    const invoiceCountBefore = await prisma.invoice.count({ where: { shopId } });

    const response = await authApi.post(`/api/v1/shops/${shopId}/invoices`).send({
      lines: [
        { partId: partAId, quantity: 1, unitPrice: 150 },
        { partId: lowStockPartId, quantity: 100, unitPrice: 10 }, // only 1 unit in stock
      ],
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');

    const invoiceCountAfter = await prisma.invoice.count({ where: { shopId } });
    expect(invoiceCountAfter).toBe(invoiceCountBefore);
  });
});
