// Behavioural test: exercises the vehicle classes/makes/models routers end-to-end via supertest against the real DB
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { vehicleClassSchema, vehicleMakeSchema, vehicleModelSchema, listResponseSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('vehicle classes router', () => {
  const ts = Date.now();
  const vehicleClassIds: number[] = [];

  afterAll(async () => {
    await prisma.vehicleClass.deleteMany({ where: { id: { in: vehicleClassIds } } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await request(app)
      .post('/api/v1/vehicle-classes')
      .send({ name: `Tractor ${ts}`, displayOrder: 1 });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/vehicle-classes/${createResponse.body.id}`);
    const created = vehicleClassSchema.parse(createResponse.body);
    vehicleClassIds.push(created.id);

    const getResponse = await request(app).get(`/api/v1/vehicle-classes/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(vehicleClassSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await request(app).get('/api/v1/vehicle-classes').query({ limit: 100 });
    const envelope = listResponseSchema(vehicleClassSchema).parse(listResponse.body);
    expect(envelope.data.some((vehicleClass) => vehicleClass.id === created.id)).toBe(true);

    const updateResponse = await request(app)
      .patch(`/api/v1/vehicle-classes/${created.id}`)
      .send({ displayOrder: 9 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.displayOrder).toBe(9);

    const deleteResponse = await request(app).delete(`/api/v1/vehicle-classes/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app).get(`/api/v1/vehicle-classes/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await request(app).post('/api/v1/vehicle-classes').send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND for a nonexistent vehicle class', async () => {
    const response = await request(app).get('/api/v1/vehicle-classes/999999999');
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
    const createResponse = await request(app).post('/api/v1/vehicle-makes').send({ name: `Mahindra ${ts}` });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/vehicle-makes/${createResponse.body.id}`);
    const created = vehicleMakeSchema.parse(createResponse.body);
    vehicleMakeIds.push(created.id);

    const getResponse = await request(app).get(`/api/v1/vehicle-makes/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(vehicleMakeSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await request(app).get('/api/v1/vehicle-makes').query({ limit: 100 });
    const envelope = listResponseSchema(vehicleMakeSchema).parse(listResponse.body);
    expect(envelope.data.some((vehicleMake) => vehicleMake.id === created.id)).toBe(true);

    const updateResponse = await request(app)
      .patch(`/api/v1/vehicle-makes/${created.id}`)
      .send({ name: `Mahindra Renamed ${ts}` });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe(`Mahindra Renamed ${ts}`);

    const deleteResponse = await request(app).delete(`/api/v1/vehicle-makes/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app).get(`/api/v1/vehicle-makes/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await request(app).post('/api/v1/vehicle-makes').send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND for a nonexistent vehicle make', async () => {
    const response = await request(app).get('/api/v1/vehicle-makes/999999999');
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
    const createResponse = await request(app)
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId, vehicleClassId, name: `575 DI ${ts}` });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/vehicle-models/${createResponse.body.id}`);
    const created = vehicleModelSchema.parse(createResponse.body);
    vehicleModelIds.push(created.id);

    const getResponse = await request(app).get(`/api/v1/vehicle-models/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(vehicleModelSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await request(app).get('/api/v1/vehicle-models').query({ limit: 100 });
    const envelope = listResponseSchema(vehicleModelSchema).parse(listResponse.body);
    expect(envelope.data.some((vehicleModel) => vehicleModel.id === created.id)).toBe(true);

    const updateResponse = await request(app)
      .patch(`/api/v1/vehicle-models/${created.id}`)
      .send({ name: `575 DI Renamed ${ts}` });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe(`575 DI Renamed ${ts}`);

    const deleteResponse = await request(app).delete(`/api/v1/vehicle-models/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app).get(`/api/v1/vehicle-models/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when required fields are missing', async () => {
    const response = await request(app).post('/api/v1/vehicle-models').send({ name: 'x' });
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND when vehicleMakeId does not exist', async () => {
    const response = await request(app)
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId: 999999999, vehicleClassId, name: `Ghost Model ${ts}` });
    expect(response.status).toBe(404);
  });

  it('returns 404 NOT_FOUND for a nonexistent vehicle model', async () => {
    const response = await request(app).get('/api/v1/vehicle-models/999999999');
    expect(response.status).toBe(404);
  });

  it('filters the list by makeId and by classId', async () => {
    const modelA = await request(app)
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId, vehicleClassId, name: `FilterModelA ${ts}` });
    vehicleModelIds.push(modelA.body.id);
    const modelB = await request(app)
      .post('/api/v1/vehicle-models')
      .send({ vehicleMakeId: otherMakeId, vehicleClassId, name: `FilterModelB ${ts}` });
    vehicleModelIds.push(modelB.body.id);

    const byMake = await request(app).get('/api/v1/vehicle-models').query({ makeId: vehicleMakeId, limit: 100 });
    expect(byMake.body.data.map((model: { id: number }) => model.id)).toContain(modelA.body.id);
    expect(byMake.body.data.map((model: { id: number }) => model.id)).not.toContain(modelB.body.id);

    const byClass = await request(app)
      .get('/api/v1/vehicle-models')
      .query({ classId: vehicleClassId, limit: 100 });
    const classIds = byClass.body.data.map((model: { id: number }) => model.id);
    expect(classIds).toEqual(expect.arrayContaining([modelA.body.id, modelB.body.id]));
  });
});
