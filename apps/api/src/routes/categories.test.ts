// Behavioural test: exercises the categories router end-to-end via supertest against the real DB
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { categorySchema, listResponseSchema } from '@shop/shared';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createCatalogFixture, createPartFixture, createUserWithCredentials, tokenFor } from '../services/test-fixtures';

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

describe('categories router', () => {
  const ts = Date.now();
  const categoryIds: number[] = [];
  const partIds: number[] = [];
  let extraManufacturerId: number | undefined;
  let shopId: number;
  let ownerUserId: number;

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `Categories Test Shop ${ts}` } });
    shopId = shop.id;
    const owner = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: `categories-owner-${ts}`,
      pin: '1234',
    });
    ownerUserId = owner.id;
    token = tokenFor(owner);
  });

  afterAll(async () => {
    await prisma.part.deleteMany({ where: { id: { in: partIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    if (extraManufacturerId) {
      await prisma.manufacturer.deleteMany({ where: { id: extraManufacturerId } });
    }
    await prisma.user.delete({ where: { id: ownerUserId } });
    await prisma.shop.delete({ where: { id: shopId } });
  });

  it('runs a full create/read/update/delete cycle, asserting the Location header and envelope shapes', async () => {
    const createResponse = await authApi
      .post('/api/v1/categories')
      .send({ name: `Electrical ${ts}` });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toBe(`/api/v1/categories/${createResponse.body.id}`);
    const created = categorySchema.parse(createResponse.body);
    expect(created.parentCategoryId).toBeNull();
    expect(created.displayOrder).toBe(0);

    const getResponse = await authApi.get(`/api/v1/categories/${created.id}`);
    expect(getResponse.status).toBe(200);
    expect(categorySchema.parse(getResponse.body)).toEqual(created);

    const listResponse = await authApi.get('/api/v1/categories').query({ limit: 100 });
    expect(listResponse.status).toBe(200);
    const envelope = listResponseSchema(categorySchema).parse(listResponse.body);
    expect(envelope.data.some((category) => category.id === created.id)).toBe(true);

    const updateResponse = await authApi.patch(`/api/v1/categories/${created.id}`).send({ displayOrder: 5 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.displayOrder).toBe(5);

    const deleteResponse = await authApi.delete(`/api/v1/categories/${created.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await authApi.get(`/api/v1/categories/${created.id}`);
    expect(afterDeleteResponse.status).toBe(404);
  });

  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    const response = await authApi.post('/api/v1/categories').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for a nonexistent category', async () => {
    const response = await authApi.get('/api/v1/categories/999999999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('filters to direct children via parentId in flat mode', async () => {
    const parent = await authApi.post('/api/v1/categories').send({ name: `Parent ${ts}` });
    categoryIds.push(parent.body.id);
    const child = await authApi
      .post('/api/v1/categories')
      .send({ name: `Child ${ts}`, parentCategoryId: parent.body.id });
    categoryIds.push(child.body.id);

    const response = await authApi.get('/api/v1/categories').query({ parentId: parent.body.id });

    expect(response.status).toBe(200);
    expect(response.body.data.map((category: { id: number }) => category.id)).toEqual([child.body.id]);
  });

  it('returns a nested tree when tree=true, scoped to the given parentId as the virtual root', async () => {
    const root = await authApi.post('/api/v1/categories').send({ name: `Root ${ts}` });
    categoryIds.push(root.body.id);
    const child = await authApi
      .post('/api/v1/categories')
      .send({ name: `RootChild ${ts}`, parentCategoryId: root.body.id });
    categoryIds.push(child.body.id);
    const grandchild = await authApi
      .post('/api/v1/categories')
      .send({ name: `RootGrandchild ${ts}`, parentCategoryId: child.body.id });
    categoryIds.push(grandchild.body.id);

    const response = await authApi.get('/api/v1/categories').query({ tree: 'true', limit: 100 });

    expect(response.status).toBe(200);
    const rootNode = response.body.data.find((category: { id: number }) => category.id === root.body.id);
    expect(rootNode).toBeDefined();
    const childNode = rootNode.children.find((category: { id: number }) => category.id === child.body.id);
    expect(childNode).toBeDefined();
    expect(childNode.children.map((category: { id: number }) => category.id)).toEqual([grandchild.body.id]);
  });

  it('returns 409 CONFLICT when deleting a category that has a child category', async () => {
    const parent = await authApi.post('/api/v1/categories').send({ name: `HasChild ${ts}` });
    categoryIds.push(parent.body.id);
    const child = await authApi
      .post('/api/v1/categories')
      .send({ name: `HasChildChild ${ts}`, parentCategoryId: parent.body.id });
    categoryIds.push(child.body.id);

    const response = await authApi.delete(`/api/v1/categories/${parent.body.id}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('returns 409 CONFLICT when deleting a category that has parts assigned', async () => {
    const catalog = await createCatalogFixture(prisma, `CategoryDeleteGuard ${ts}`);
    extraManufacturerId = catalog.manufacturerId;
    categoryIds.push(catalog.categoryId);
    const part = await createPartFixture(prisma, {
      sku: `CAT-DEL-GUARD-${ts}`,
      manufacturerPartNumber: `CAT-DEL-GUARD-MPN-${ts}`,
      manufacturerId: catalog.manufacturerId,
      categoryId: catalog.categoryId,
    });
    partIds.push(part.id);

    const response = await authApi.delete(`/api/v1/categories/${catalog.categoryId}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });
});
