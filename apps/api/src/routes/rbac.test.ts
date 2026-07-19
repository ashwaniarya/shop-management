// Behavioural test: focused checks on the global auth gate and the RBAC role/shop
// guards, complementing the per-router suites which run as OWNER on their own shop.
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createUserWithCredentials, tokenFor } from '../services/test-fixtures';

describe('RBAC enforcement', () => {
  const ts = Date.now();
  let shopId: number;
  let otherShopId: number;
  let ownerToken = '';
  let staffToken = '';
  const manufacturerIds: number[] = [];

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `RBAC Test Shop ${ts}` } });
    shopId = shop.id;
    const otherShop = await prisma.shop.create({ data: { name: `RBAC Test Other Shop ${ts}` } });
    otherShopId = otherShop.id;

    const owner = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: `rbac-owner-${ts}`,
      pin: '1234',
    });
    ownerToken = tokenFor(owner);

    const staff = await createUserWithCredentials({
      shopId,
      role: UserRole.STAFF,
      username: `rbac-staff-${ts}`,
      pin: '1234',
    });
    staffToken = tokenFor(staff);
  });

  afterAll(async () => {
    await prisma.manufacturer.deleteMany({ where: { id: { in: manufacturerIds } } });
    await prisma.user.deleteMany({ where: { shopId } });
    await prisma.shop.delete({ where: { id: shopId } });
    await prisma.shop.delete({ where: { id: otherShopId } });
  });

  it('rejects an unauthenticated request to a resource route with 401', async () => {
    const response = await request(app).get('/api/v1/parts');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('forbids a STAFF user from creating a manufacturer (403)', async () => {
    const response = await request(app)
      .post('/api/v1/manufacturers')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: `RBAC Staff Mfr ${ts}` });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows an OWNER user to create a manufacturer (201)', async () => {
    const response = await request(app)
      .post('/api/v1/manufacturers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `RBAC Owner Mfr ${ts}` });

    expect(response.status).toBe(201);
    manufacturerIds.push(response.body.id);
  });

  it("forbids a token scoped to one shop from reading another shop's inventory (403)", async () => {
    const response = await request(app)
      .get(`/api/v1/shops/${otherShopId}/inventory`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
