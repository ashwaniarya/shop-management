// Behavioural test: exercises the part grades router end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { partGradeSchema, listResponseSchema } from '@shop/shared';

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

describe('part grades router', () => {
  const ts = Date.now();
  const partGradeIds: number[] = [];
  let shopId: number;
  let ownerUserId: number;

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `PartGrades Test Shop ${ts}` } });
    shopId = shop.id;
    const owner = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: `partgrades-owner-${ts}`,
      pin: '1234',
    });
    ownerUserId = owner.id;
    token = tokenFor(owner);
  });

  afterAll(async () => {
    await prisma.partGrade.deleteMany({ where: { id: { in: partGradeIds } } });
    await prisma.user.delete({ where: { id: ownerUserId } });
    await prisma.shop.delete({ where: { id: shopId } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await authApi
      .post('/api/v1/part-grades')
      .send({ name: `Original ${ts}`, displayOrder: 1 });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/part-grades/${createResponse.body.id}`);
    const created = partGradeSchema.parse(createResponse.body);
    partGradeIds.push(created.id);

    const getResponse = await authApi.get(`/api/v1/part-grades/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(partGradeSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/part-grades').query({ limit: 100 });
    const envelope = listResponseSchema(partGradeSchema).parse(listResponse.body);
    expect(envelope.data.some((partGrade) => partGrade.id === created.id)).toBe(true);

    const updateResponse = await authApi
      .patch(`/api/v1/part-grades/${created.id}`)
      .send({ displayOrder: 9 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.displayOrder).toBe(9);

    const deleteResponse = await authApi.delete(`/api/v1/part-grades/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await authApi.get(`/api/v1/part-grades/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await authApi.post('/api/v1/part-grades').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for a nonexistent part grade', async () => {
    const response = await authApi.get('/api/v1/part-grades/999999999');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 409 CONFLICT on duplicate name', async () => {
    const firstResponse = await authApi
      .post('/api/v1/part-grades')
      .send({ name: `Duplicate Grade ${ts}` });
    expect(firstResponse.status).toBe(201);
    partGradeIds.push(firstResponse.body.id);

    const duplicateResponse = await authApi
      .post('/api/v1/part-grades')
      .send({ name: `Duplicate Grade ${ts}` });
    if (duplicateResponse.status === 201) {
      partGradeIds.push(duplicateResponse.body.id);
    }
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe('CONFLICT');
  });
});
