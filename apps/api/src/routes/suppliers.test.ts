// Behavioural test: exercises the suppliers router end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { listResponseSchema, supplierSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createUserWithCredentials, tokenFor } from '../services/test-fixtures';

// Every /api/v1/* request needs a Bearer token now; authApi wraps supertest with
// the header. The owning user is an OWNER so catalog mutations stay allowed.
let token = '';
const authApi = {
  get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
};

describe('suppliers router', () => {
  const ts = Date.now();
  const supplierIds: number[] = [];
  let shopId: number;
  let ownerUserId: number;

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `Suppliers Test Shop ${ts}` } });
    shopId = shop.id;
    const owner = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: `suppliers-owner-${ts}`,
      pin: '1234',
    });
    ownerUserId = owner.id;
    token = tokenFor(owner);
  });

  afterAll(async () => {
    await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } });
    await prisma.user.delete({ where: { id: ownerUserId } });
    await prisma.shop.delete({ where: { id: shopId } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await authApi.post('/api/v1/suppliers').send({
      name: `Shree Balaji ${ts}`,
      contactPerson: 'Rakesh Sharma',
      phone: '+91 98765 43210',
      gstin: '03AAFCS1234M1Z6',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/suppliers/${createResponse.body.id}`);
    const created = supplierSchema.parse(createResponse.body);
    supplierIds.push(created.id);
    expect(created.contactPerson).toBe('Rakesh Sharma');
    expect(created.email).toBeNull();
    expect(created.isActive).toBe(true);

    const getResponse = await authApi.get(`/api/v1/suppliers/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(supplierSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/suppliers').query({ limit: 100 });
    expect(listResponse.status).toBe(200);
    const envelope = listResponseSchema(supplierSchema).parse(listResponse.body);
    expect(envelope.data.some((supplier) => supplier.id === created.id)).toBe(true);

    const updateResponse = await authApi
      .patch(`/api/v1/suppliers/${created.id}`)
      .send({ email: 'sales@shreebalaji.in' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.email).toBe('sales@shreebalaji.in');

    const deleteResponse = await authApi.delete(`/api/v1/suppliers/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await authApi.get(`/api/v1/suppliers/${created.id}`);
    expect(afterDeleteResponse.status).toBe(200);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await authApi.post('/api/v1/suppliers').send({ phone: '123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for a nonexistent supplier', async () => {
    const response = await authApi.get('/api/v1/suppliers/999999999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
