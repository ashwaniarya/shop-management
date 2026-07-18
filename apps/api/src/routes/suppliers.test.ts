// Behavioural test: exercises the suppliers router end-to-end via supertest against the real DB
import { describe, expect, it, afterAll } from 'vitest';
import request from 'supertest';
import { listResponseSchema, supplierSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('suppliers router', () => {
  const ts = Date.now();
  const supplierIds: number[] = [];

  afterAll(async () => {
    await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await request(app).post('/api/v1/suppliers').send({
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

    const getResponse = await request(app).get(`/api/v1/suppliers/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(supplierSchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await request(app).get('/api/v1/suppliers').query({ limit: 100 });
    expect(listResponse.status).toBe(200);
    const envelope = listResponseSchema(supplierSchema).parse(listResponse.body);
    expect(envelope.data.some((supplier) => supplier.id === created.id)).toBe(true);

    const updateResponse = await request(app)
      .patch(`/api/v1/suppliers/${created.id}`)
      .send({ email: 'sales@shreebalaji.in' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.email).toBe('sales@shreebalaji.in');

    const deleteResponse = await request(app).delete(`/api/v1/suppliers/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app).get(`/api/v1/suppliers/${created.id}`);
    expect(afterDeleteResponse.status).toBe(200);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await request(app).post('/api/v1/suppliers').send({ phone: '123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for a nonexistent supplier', async () => {
    const response = await request(app).get('/api/v1/suppliers/999999999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
