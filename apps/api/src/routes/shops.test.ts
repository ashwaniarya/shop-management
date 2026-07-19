// Behavioural test: exercises the shops router and its nested users sub-resource end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { listResponseSchema, shopSchema, userSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createUserWithCredentials, tokenFor } from '../services/test-fixtures';

// Every /api/v1/* request needs a Bearer token now; authApi wraps supertest with
// the header. The caller is an OWNER in authShopId; nested users tests reuse that
// shop as their :shopId so requireSameShop passes on the happy paths.
let token = '';
const authApi = {
  get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
};

describe('shops router', () => {
  const ts = Date.now();
  const shopIds: number[] = [];
  let authShopId: number;

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `Shops Auth Shop ${ts}` } });
    authShopId = shop.id;
    shopIds.push(authShopId);
    const owner = await createUserWithCredentials({
      shopId: authShopId,
      role: UserRole.OWNER,
      username: `shops-owner-${ts}`,
      pin: '1234',
    });
    token = tokenFor(owner);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { shopId: { in: shopIds } } });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shape', async () => {
    const createResponse = await authApi
      .post('/api/v1/shops')
      .send({ name: `Arya Auto Parts ${ts}`, address: '12 MG Road', gstin: '27AABCA1111A1Z9' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/shops/${createResponse.body.id}`);
    const created = shopSchema.parse(createResponse.body);
    shopIds.push(created.id);

    const getResponse = await authApi.get(`/api/v1/shops/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(shopSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/shops').query({ limit: 100 });
    const envelope = listResponseSchema(shopSchema).parse(listResponse.body);
    expect(envelope.data.some((shop) => shop.id === created.id)).toBe(true);

    const updateResponse = await authApi.patch(`/api/v1/shops/${created.id}`).send({ phone: '+91 253 111' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.phone).toBe('+91 253 111');

    const deleteResponse = await authApi.delete(`/api/v1/shops/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await authApi.get(`/api/v1/shops/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await authApi.post('/api/v1/shops').send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND for a nonexistent shop', async () => {
    const response = await authApi.get('/api/v1/shops/999999999');
    expect(response.status).toBe(404);
  });

  describe('shop users sub-resource', () => {
    // shopId is the caller's OWN shop so requireSameShop passes; otherShopId is a
    // foreign shop used to exercise the cross-shop guard and ownership checks.
    let shopId: number;
    let otherShopId: number;

    beforeAll(async () => {
      shopId = authShopId;
      const otherShop = await prisma.shop.create({ data: { name: `ShopUsers Test OtherShop ${ts}` } });
      otherShopId = otherShop.id;
      shopIds.push(otherShopId);
    });

    it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shape', async () => {
      const createResponse = await authApi
        .post(`/api/v1/shops/${shopId}/users`)
        .send({ name: `Suresh Arya ${ts}`, role: 'OWNER', phone: '+91 98765 11111' });

      expect(createResponse.status).toBe(201);
      expect(createResponse.headers.location).toBe(`/api/v1/shops/${shopId}/users/${createResponse.body.id}`);
      const created = userSchema.parse(createResponse.body);
      expect(created.shopId).toBe(shopId);

      const getResponse = await authApi.get(`/api/v1/shops/${shopId}/users/${created.id}`);
      expect(getResponse.status).toBe(200);
      expect(userSchema.parse(getResponse.body)).toEqual(created);

      const listResponse = await authApi.get(`/api/v1/shops/${shopId}/users`).query({ limit: 100 });
      const envelope = listResponseSchema(userSchema).parse(listResponse.body);
      expect(envelope.data.some((user) => user.id === created.id)).toBe(true);

      const updateResponse = await authApi
        .patch(`/api/v1/shops/${shopId}/users/${created.id}`)
        .send({ role: 'MANAGER' });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.role).toBe('MANAGER');

      const deleteResponse = await authApi.delete(`/api/v1/shops/${shopId}/users/${created.id}`);
      expect(deleteResponse.status).toBe(204);

      const afterDeleteResponse = await authApi.get(`/api/v1/shops/${shopId}/users/${created.id}`);
      expect(afterDeleteResponse.body.isActive).toBe(false);
    });

    it('returns 400 VALIDATION_ERROR when role is missing', async () => {
      const response = await authApi.post(`/api/v1/shops/${shopId}/users`).send({ name: 'x' });
      expect(response.status).toBe(400);
    });

    // Was a 404 "nonexistent shop" case; requireSameShop now guards this route, so
    // creating a user under any shop that isn't the caller's is a 403 before the
    // handler's shop-existence check can run.
    it('returns 403 FORBIDDEN when creating a user under a shop the caller is not in', async () => {
      const response = await authApi
        .post(`/api/v1/shops/${otherShopId}/users`)
        .send({ name: 'x', role: 'STAFF' });
      expect(response.status).toBe(403);
    });

    it('returns 404 NOT_FOUND for a user id that exists but under a different shop', async () => {
      const otherShopUser = await prisma.user.create({
        data: { shopId: otherShopId, name: `Cross-shop test user ${ts}`, role: UserRole.STAFF },
      });

      // The URL's shopId is the caller's own shop (so requireSameShop passes), but the
      // target user belongs to another shop, so the handler's ownership check 404s.
      const response = await authApi.get(`/api/v1/shops/${shopId}/users/${otherShopUser.id}`);
      expect(response.status).toBe(404);
    });
  });
});
