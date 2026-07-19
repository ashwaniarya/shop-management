// Behavioural test: exercises the manufacturers router end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { listResponseSchema, manufacturerSchema } from '@shop/shared';

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

describe('manufacturers router', () => {
  const ts = Date.now();
  const manufacturerIds: number[] = [];
  let shopId: number;
  let ownerUserId: number;

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `Manufacturers Test Shop ${ts}` } });
    shopId = shop.id;
    const owner = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: `manufacturers-owner-${ts}`,
      pin: '1234',
    });
    ownerUserId = owner.id;
    token = tokenFor(owner);
  });

  afterAll(async () => {
    await prisma.part.deleteMany({ where: { manufacturerId: { in: manufacturerIds } } });
    await prisma.manufacturer.deleteMany({ where: { id: { in: manufacturerIds } } });
    await prisma.user.delete({ where: { id: ownerUserId } });
    await prisma.shop.delete({ where: { id: shopId } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await authApi
      .post('/api/v1/manufacturers')
      .send({ name: `Bosch ${ts}`, code: 'BSH' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/manufacturers/${createResponse.body.id}`);
    const created = manufacturerSchema.parse(createResponse.body);
    manufacturerIds.push(created.id);
    expect(created.name).toBe(`Bosch ${ts}`);
    expect(created.code).toBe('BSH');
    expect(created.isActive).toBe(true);

    const getResponse = await authApi.get(`/api/v1/manufacturers/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(manufacturerSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/manufacturers').query({ limit: 100 });
    expect(listResponse.status).toBe(200);
    const listEnvelope = listResponseSchema(manufacturerSchema).parse(listResponse.body);
    expect(listEnvelope.meta.limit).toBe(100);
    expect(listEnvelope.data.some((manufacturer) => manufacturer.id === created.id)).toBe(true);

    const updateResponse = await authApi
      .patch(`/api/v1/manufacturers/${created.id}`)
      .send({ code: 'BSH2' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.code).toBe('BSH2');
    expect(updateResponse.body.name).toBe(`Bosch ${ts}`);

    const deleteResponse = await authApi.delete(`/api/v1/manufacturers/${created.id}`);
    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.body).toEqual({});

    const afterDeleteResponse = await authApi.get(`/api/v1/manufacturers/${created.id}`);
    expect(afterDeleteResponse.status).toBe(200);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await authApi.post('/api/v1/manufacturers').send({ code: 'XYZ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for a nonexistent manufacturer', async () => {
    const response = await authApi.get('/api/v1/manufacturers/999999999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 NOT_FOUND when updating a nonexistent manufacturer', async () => {
    const response = await authApi.patch('/api/v1/manufacturers/999999999').send({ name: 'x' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 409 CONFLICT when creating a manufacturer with a duplicate name', async () => {
    const name = `Duplicate Co ${ts}`;
    const first = await authApi.post('/api/v1/manufacturers').send({ name });
    manufacturerIds.push(first.body.id);

    const second = await authApi.post('/api/v1/manufacturers').send({ name });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });
});
