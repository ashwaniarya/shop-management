// Behavioural test: exercises the vehicle classes/makes/models routers end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { vehicleClassSchema, vehicleMakeSchema, vehicleModelSchema, listResponseSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createUserWithCredentials, tokenFor } from '../services/test-fixtures';

// Every /api/v1/* request needs a Bearer token now; authApi wraps supertest with
// the header. One OWNER user (shop-agnostic, catalog routes aren't shop-scoped)
// is shared across the three describe blocks in this file.
const authTs = Date.now();
let token = '';
let authShopId: number;
let authUserId: number;
const authApi = {
  get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
};

beforeAll(async () => {
  const shop = await prisma.shop.create({ data: { name: `Vehicles Test Shop ${authTs}` } });
  authShopId = shop.id;
  const owner = await createUserWithCredentials({
    shopId: authShopId,
    role: UserRole.OWNER,
    username: `vehicles-owner-${authTs}`,
    pin: '1234',
  });
  authUserId = owner.id;
  token = tokenFor(owner);
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: authUserId } });
  await prisma.shop.delete({ where: { id: authShopId } });
});

describe('vehicle classes router', () => {
  const ts = Date.now();
  const vehicleClassIds: number[] = [];

  afterAll(async () => {
    await prisma.vehicleClass.deleteMany({ where: { id: { in: vehicleClassIds } } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await authApi
      .post('/api/v1/vehicle-classes')
      .send({ name: `Tractor ${ts}`, displayOrder: 1 });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/vehicle-classes/${createResponse.body.id}`);
    const created = vehicleClassSchema.parse(createResponse.body);
    vehicleClassIds.push(created.id);

    const getResponse = await authApi.get(`/api/v1/vehicle-classes/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(vehicleClassSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/vehicle-classes').query({ limit: 100 });
    const envelope = listResponseSchema(vehicleClassSchema).parse(listResponse.body);
    expect(envelope.data.some((vehicleClass) => vehicleClass.id === created.id)).toBe(true);

    const updateResponse = await authApi
      .patch(`/api/v1/vehicle-classes/${created.id}`)
      .send({ displayOrder: 9 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.displayOrder).toBe(9);

    const deleteResponse = await authApi.delete(`/api/v1/vehicle-classes/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await authApi.get(`/api/v1/vehicle-classes/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await authApi.post('/api/v1/vehicle-classes').send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND for a nonexistent vehicle class', async () => {
    const response = await authApi.get('/api/v1/vehicle-classes/999999999');
    expect(response.status).toBe(404);
  });
});

describe('vehicle makes router', () => {
  const ts = Date.now();
  const vehicleMakeIds: number[] = [];

  afterAll(async () => {
    await prisma.vehicleMake.deleteMany({ where: { id: { in: vehicleMakeIds } } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await authApi.post('/api/v1/vehicle-makes').send({ name: `Mahindra ${ts}` });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/vehicle-makes/${createResponse.body.id}`);
    const created = vehicleMakeSchema.parse(createResponse.body);
    vehicleMakeIds.push(created.id);

    const getResponse = await authApi.get(`/api/v1/vehicle-makes/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(vehicleMakeSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/vehicle-makes').query({ limit: 100 });
    const envelope = listResponseSchema(vehicleMakeSchema).parse(listResponse.body);
    expect(envelope.data.some((vehicleMake) => vehicleMake.id === created.id)).toBe(true);

    const updateResponse = await authApi
      .patch(`/api/v1/vehicle-makes/${created.id}`)
      .send({ name: `Mahindra Renamed ${ts}` });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe(`Mahindra Renamed ${ts}`);

    const deleteResponse = await authApi.delete(`/api/v1/vehicle-makes/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await authApi.get(`/api/v1/vehicle-makes/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await authApi.post('/api/v1/vehicle-makes').send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND for a nonexistent vehicle make', async () => {
    const response = await authApi.get('/api/v1/vehicle-makes/999999999');
    expect(response.status).toBe(404);
  });
});

describe('vehicle models router', () => {
  const ts = Date.now();
  const vehicleModelIds: number[] = [];
  let vehicleMakeId: number;
  let otherMakeId: number;
  let vehicleClassId: number;

  afterAll(async () => {
    await prisma.vehicleModel.deleteMany({ where: { id: { in: vehicleModelIds } } });
    await prisma.vehicleMake.deleteMany({ where: { id: { in: [vehicleMakeId, otherMakeId] } } });
    await prisma.vehicleClass.deleteMany({ where: { id: vehicleClassId } });
  });

  beforeAll(async () => {
    const make = await prisma.vehicleMake.create({ data: { name: `ModelTest Make ${ts}` } });
    vehicleMakeId = make.id;
    const otherMake = await prisma.vehicleMake.create({ data: { name: `ModelTest OtherMake ${ts}` } });
    otherMakeId = otherMake.id;
    const vehicleClass = await prisma.vehicleClass.create({ data: { name: `ModelTest Class ${ts}` } });
    vehicleClassId = vehicleClass.id;
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await authApi
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId, vehicleClassId, name: `575 DI ${ts}` });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/vehicle-models/${createResponse.body.id}`);
    const created = vehicleModelSchema.parse(createResponse.body);
    vehicleModelIds.push(created.id);

    const getResponse = await authApi.get(`/api/v1/vehicle-models/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(vehicleModelSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/vehicle-models').query({ limit: 100 });
    const envelope = listResponseSchema(vehicleModelSchema).parse(listResponse.body);
    expect(envelope.data.some((vehicleModel) => vehicleModel.id === created.id)).toBe(true);

    const updateResponse = await authApi
      .patch(`/api/v1/vehicle-models/${created.id}`)
      .send({ name: `575 DI Renamed ${ts}` });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe(`575 DI Renamed ${ts}`);

    const deleteResponse = await authApi.delete(`/api/v1/vehicle-models/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await authApi.get(`/api/v1/vehicle-models/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when required fields are missing', async () => {
    const response = await authApi.post('/api/v1/vehicle-models').send({ name: 'x' });
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND when vehicleMakeId does not exist', async () => {
    const response = await authApi
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId: 999999999, vehicleClassId, name: `Ghost Model ${ts}` });
    expect(response.status).toBe(404);
  });

  it('returns 404 NOT_FOUND for a nonexistent vehicle model', async () => {
    const response = await authApi.get('/api/v1/vehicle-models/999999999');
    expect(response.status).toBe(404);
  });

  it('filters the list by makeId and by classId', async () => {
    const modelA = await authApi
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId, vehicleClassId, name: `FilterModelA ${ts}` });
    vehicleModelIds.push(modelA.body.id);
    const modelB = await authApi
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId: otherMakeId, vehicleClassId, name: `FilterModelB ${ts}` });
    vehicleModelIds.push(modelB.body.id);

    const byMake = await authApi.get('/api/v1/vehicle-models').query({ makeId: vehicleMakeId, limit: 100 });
    expect(byMake.body.data.map((model: { id: number }) => model.id)).toContain(modelA.body.id);
    expect(byMake.body.data.map((model: { id: number }) => model.id)).not.toContain(modelB.body.id);

    const byClass = await authApi
      .get('/api/v1/vehicle-models')
      .query({ classId: vehicleClassId, limit: 100 });
    const classIds = byClass.body.data.map((model: { id: number }) => model.id);
    expect(classIds).toEqual(expect.arrayContaining([modelA.body.id, modelB.body.id]));
  });
});
