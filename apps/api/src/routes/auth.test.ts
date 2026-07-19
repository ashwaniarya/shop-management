// Behavioural test: exercises the auth router (and, end-to-end through /auth/me,
// the authenticate middleware) via supertest against the real DB
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { createUserWithCredentials, tokenFor } from '../services/test-fixtures';

describe('auth router', () => {
  const ts = Date.now();
  const PIN = '1234';

  let shopId: number;
  const userIds: number[] = [];

  let activeUserId: number;
  const activeUsername = `auth-router-active-${ts}`;
  const unknownUsername = `auth-router-unknown-${ts}`;

  let inactiveUserId: number;
  const inactiveUsername = `auth-router-inactive-${ts}`;

  let deactivatableUserId: number;
  const deactivatableUsername = `auth-router-deactivatable-${ts}`;

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `Auth Router Test Shop ${ts}` } });
    shopId = shop.id;

    const activeUser = await createUserWithCredentials({
      shopId,
      role: UserRole.OWNER,
      username: activeUsername,
      pin: PIN,
    });
    activeUserId = activeUser.id;
    userIds.push(activeUserId);

    const inactiveUser = await createUserWithCredentials({
      shopId,
      role: UserRole.STAFF,
      username: inactiveUsername,
      pin: PIN,
    });
    inactiveUserId = inactiveUser.id;
    userIds.push(inactiveUserId);
    await prisma.user.update({ where: { id: inactiveUserId }, data: { isActive: false } });

    const deactivatableUser = await createUserWithCredentials({
      shopId,
      role: UserRole.MANAGER,
      username: deactivatableUsername,
      pin: PIN,
    });
    deactivatableUserId = deactivatableUser.id;
    userIds.push(deactivatableUserId);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.shop.delete({ where: { id: shopId } });
  });

  describe('POST /auth/login', () => {
    it('returns 200 with a token and the matching user shape (no passwordHash/pin) for valid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({ username: activeUsername, pin: PIN });

      expect(response.status).toBe(200);
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
      expect(response.body.user).toEqual({
        id: activeUserId,
        shopId,
        name: activeUsername,
        role: UserRole.OWNER,
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('pin');
    });

    it('returns 401 for a wrong pin', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({ username: activeUsername, pin: '0000' });

      expect(response.status).toBe(401);
    });

    it('returns 401 for an unknown username', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({ username: unknownUsername, pin: PIN });

      expect(response.status).toBe(401);
    });

    it('returns 401 for an inactive user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: inactiveUsername, pin: PIN });

      expect(response.status).toBe(401);
    });

    it('returns the same error message across all failure modes', async () => {
      const [wrongPin, unknownUser, inactiveUser] = await Promise.all([
        request(app).post('/api/v1/auth/login').send({ username: activeUsername, pin: '0000' }),
        request(app).post('/api/v1/auth/login').send({ username: unknownUsername, pin: PIN }),
        request(app).post('/api/v1/auth/login').send({ username: inactiveUsername, pin: PIN }),
      ]);

      const messages = new Set([wrongPin.body.error.message, unknownUser.body.error.message, inactiveUser.body.error.message]);
      expect(messages.size).toBe(1);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 with no Authorization header', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
    });

    it('returns 401 for a malformed/garbage token', async () => {
      const response = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token');

      expect(response.status).toBe(401);
    });

    it('returns 200 with the authUser for a token minted by tokenFor', async () => {
      const token = tokenFor({ id: activeUserId, shopId, role: UserRole.OWNER });

      const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: activeUserId,
        shopId,
        name: activeUsername,
        role: UserRole.OWNER,
      });
    });

    it('returns 200 with the authUser for a token obtained from /auth/login', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: activeUsername, pin: PIN });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(loginResponse.body.user);
    });

    it('returns 401 for a token belonging to a since-deactivated user', async () => {
      const token = tokenFor({ id: deactivatableUserId, shopId, role: UserRole.MANAGER });
      await prisma.user.update({ where: { id: deactivatableUserId }, data: { isActive: false } });

      const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 204 with a valid token', async () => {
      const token = tokenFor({ id: activeUserId, shopId, role: UserRole.OWNER });

      const response = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it('returns 401 with no Authorization header', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});
