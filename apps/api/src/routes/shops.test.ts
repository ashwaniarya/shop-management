// Behavioural test: exercises the shops router and its nested users sub-resource end-to-end via supertest against the real DB
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { listResponseSchema, shopSchema, userSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('shops router', () => {
  const ts = Date.now();
  const shopIds: number[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shape', async () => {
    const createResponse = await request(app)
      .post('/api/v1/shops')
      .send({ name: `Arya Auto Parts ${ts}`, address: '12 MG Road', gstin: '27AABCA1111A1Z9' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/shops/${createResponse.body.id}`);
    const created = shopSchema.parse(createResponse.body);
    shopIds.push(created.id);

    const getResponse = await request(app).get(`/api/v1/shops/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(shopSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await request(app).get('/api/v1/shops').query({ limit: 100 });
    const envelope = listResponseSchema(shopSchema).parse(listResponse.body);
    expect(envelope.data.some((shop) => shop.id === created.id)).toBe(true);

    const updateResponse = await request(app).patch(`/api/v1/shops/${created.id}`).send({ phone: '+91 253 111' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.phone).toBe('+91 253 111');

    const deleteResponse = await request(app).delete(`/api/v1/shops/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app).get(`/api/v1/shops/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await request(app).post('/api/v1/shops').send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND for a nonexistent shop', async () => {
    const response = await request(app).get('/api/v1/shops/999999999');
    expect(response.status).toBe(404);
  });

  describe('shop users sub-resource', () => {
    let shopId: number;
    let otherShopId: number;

    beforeAll(async () => {
      const shop = await prisma.shop.create({ data: { name: `ShopUsers Test Shop ${ts}` } });
      shopId = shop.id;
      shopIds.push(shopId);
      const otherShop = await prisma.shop.create({ data: { name: `ShopUsers Test OtherShop ${ts}` } });
      otherShopId = otherShop.id;
      shopIds.push(otherShopId);
    });

    it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shape', async () => {
      const createResponse = await request(app)
        .post(`/api/v1/shops/${shopId}/users`)
        .send({ name: `Suresh Arya ${ts}`, role: 'OWNER', phone: '+91 98765 11111' });

      expect(createResponse.status).toBe(201);
      expect(createResponse.headers.location).toBe(`/api/v1/shops/${shopId}/users/${createResponse.body.id}`);
      const created = userSchema.parse(createResponse.body);
      expect(created.shopId).toBe(shopId);

      const getResponse = await request(app).get(`/api/v1/shops/${shopId}/users/${created.id}`);
      expect(getResponse.status).toBe(200);
      expect(userSchema.parse(getResponse.body)).toEqual(created);

      const listResponse = await request(app).get(`/api/v1/shops/${shopId}/users`).query({ limit: 100 });
      const envelope = listResponseSchema(userSchema).parse(listResponse.body);
      expect(envelope.data.some((user) => user.id === created.id)).toBe(true);

      const updateResponse = await request(app)
        .patch(`/api/v1/shops/${shopId}/users/${created.id}`)
        .send({ role: 'MANAGER' });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.role).toBe('MANAGER');

      const deleteResponse = await request(app).delete(`/api/v1/shops/${shopId}/users/${created.id}`);
      expect(deleteResponse.status).toBe(204);

      const afterDeleteResponse = await request(app).get(`/api/v1/shops/${shopId}/users/${created.id}`);
      expect(afterDeleteResponse.body.isActive).toBe(false);
    });

    it('returns 400 VALIDATION_ERROR when role is missing', async () => {
      const response = await request(app).post(`/api/v1/shops/${shopId}/users`).send({ name: 'x' });
      expect(response.status).toBe(400);
    });

    it('returns 404 NOT_FOUND when creating a user under a nonexistent shop', async () => {
      const response = await request(app)
        .post('/api/v1/shops/999999999/users')
        .send({ name: 'x', role: 'STAFF' });
      expect(response.status).toBe(404);
    });

    it('returns 404 NOT_FOUND for a user id that exists but under a different shop', async () => {
      const createResponse = await request(app)
        .post(`/api/v1/shops/${shopId}/users`)
        .send({ name: `Cross-shop test user ${ts}`, role: 'STAFF' });

      const response = await request(app).get(`/api/v1/shops/${otherShopId}/users/${createResponse.body.id}`);
      expect(response.status).toBe(404);
    });
  });
});
