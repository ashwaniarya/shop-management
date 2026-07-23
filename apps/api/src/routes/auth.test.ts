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

  // Registration creates its own shop + owner; track them for teardown.
  const registeredUserIds: number[] = [];
  const registeredShopIds: number[] = [];

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
    await prisma.user.deleteMany({ where: { id: { in: [...userIds, ...registeredUserIds] } } });
    await prisma.shop.delete({ where: { id: shopId } });
    if (registeredShopIds.length > 0) {
      await prisma.shop.deleteMany({ where: { id: { in: registeredShopIds } } });
    }
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

  describe('POST /auth/register', () => {
    const REGISTER_PIN = '135790';

    it('creates a new shop + OWNER and returns 201 with a token and the auth user', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        shopName: `Register Test Shop ${ts}`,
        ownerName: 'Register Owner',
        username: `auth-register-new-${ts}`,
        pin: REGISTER_PIN,
      });

      expect(response.status).toBe(201);
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
      expect(response.body.user).toMatchObject({ name: 'Register Owner', role: UserRole.OWNER });
      expect(typeof response.body.user.id).toBe('number');
      expect(typeof response.body.user.shopId).toBe('number');
      expect(response.body.user.shopId).not.toBe(shopId);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('pin');

      registeredUserIds.push(response.body.user.id);
      registeredShopIds.push(response.body.user.shopId);
    });

    it('returns a token that immediately authenticates GET /auth/me', async () => {
      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        shopName: `Register Me Shop ${ts}`,
        ownerName: 'Auto Login',
        username: `auth-register-me-${ts}`,
        pin: REGISTER_PIN,
      });
      registeredUserIds.push(registerResponse.body.user.id);
      registeredShopIds.push(registerResponse.body.user.shopId);

      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body).toEqual(registerResponse.body.user);
    });

    it('returns 409 when the username is already taken (whole transaction rolls back — no orphan shop)', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        shopName: 'Another Shop',
        ownerName: 'Someone Else',
        username: activeUsername, // created in beforeAll
        pin: REGISTER_PIN,
      });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toMatch(/already taken/i);
    });

    it('returns 400 for a pin that is not exactly 6 digits', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        shopName: 'Bad Pin Shop',
        ownerName: 'Bad Pin',
        username: `auth-register-badpin-${ts}`,
        pin: '1234',
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 for a username shorter than 3 characters', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        shopName: 'Short Name Shop',
        ownerName: 'Short',
        username: 'ab',
        pin: REGISTER_PIN,
      });

      expect(response.status).toBe(400);
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
