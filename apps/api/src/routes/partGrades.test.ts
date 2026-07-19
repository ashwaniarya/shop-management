// Behavioural test: exercises the part grades router end-to-end via supertest against the real DB
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { partGradeSchema, listResponseSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('part grades router', () => {
  const ts = Date.now();
  const partGradeIds: number[] = [];

  afterAll(async () => {
    await prisma.partGrade.deleteMany({ where: { id: { in: partGradeIds } } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await request(app)
      .post('/api/v1/part-grades')
      .send({ name: `Original ${ts}`, displayOrder: 1 });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/part-grades/${createResponse.body.id}`);
    const created = partGradeSchema.parse(createResponse.body);
    partGradeIds.push(created.id);

    const getResponse = await request(app).get(`/api/v1/part-grades/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(partGradeSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await request(app).get('/api/v1/part-grades').query({ limit: 100 });
    const envelope = listResponseSchema(partGradeSchema).parse(listResponse.body);
    expect(envelope.data.some((partGrade) => partGrade.id === created.id)).toBe(true);

    const updateResponse = await request(app)
      .patch(`/api/v1/part-grades/${created.id}`)
      .send({ displayOrder: 9 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.displayOrder).toBe(9);

    const deleteResponse = await request(app).delete(`/api/v1/part-grades/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app).get(`/api/v1/part-grades/${created.id}`);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await request(app).post('/api/v1/part-grades').send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 NOT_FOUND for a nonexistent part grade', async () => {
    const response = await request(app).get('/api/v1/part-grades/999999999');
    expect(response.status).toBe(404);
  });

  it('returns 409 CONFLICT on duplicate name', async () => {
    const firstResponse = await request(app)
      .post('/api/v1/part-grades')
      .send({ name: `Duplicate Grade ${ts}` });
    expect(firstResponse.status).toBe(201);
    partGradeIds.push(firstResponse.body.id);

    const duplicateResponse = await request(app)
      .post('/api/v1/part-grades')
      .send({ name: `Duplicate Grade ${ts}` });
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe('CONFLICT');
  });
});
