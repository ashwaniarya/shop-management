// hashPin/verifyPin and signToken/verifyToken are pure-logic unit tests; login() is
// a behavioural test that exercises the real DB against namespaced, cleaned-up fixtures.
import { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma';
import { hashPin, INVALID_CREDENTIALS_MESSAGE, login, signToken, verifyPin, verifyToken } from './auth';
import { UnauthorizedError } from './errors';

describe('hashPin / verifyPin', () => {
  it('round-trips a correct pin to true', async () => {
    const hash = await hashPin('1234');

    await expect(verifyPin('1234', hash)).resolves.toBe(true);
  });

  it('rejects a wrong pin', async () => {
    const hash = await hashPin('1234');

    await expect(verifyPin('9999', hash)).resolves.toBe(false);
  });
});

describe('signToken / verifyToken', () => {
  it('round-trips the signed claims', () => {
    const token = signToken({ id: 42, shopId: 7, role: UserRole.MANAGER });

    const claims = verifyToken(token);

    expect(claims.sub).toBe(42);
    expect(claims.shopId).toBe(7);
    expect(claims.role).toBe(UserRole.MANAGER);
  });

  it('throws on a garbage token', () => {
    expect(() => verifyToken('not-a-real-token')).toThrow();
  });
});

describe('login', () => {
  const ts = Date.now();
  const PIN = '1234';

  let shopId: number;
  const userIds: number[] = [];

  let activeUserId: number;
  const activeUsername = `auth-active-${ts}`;
  const noPasswordUsername = `auth-nopassword-${ts}`;
  const inactiveUsername = `auth-inactive-${ts}`;
  const unknownUsername = `auth-unknown-${ts}`;

  async function loginErrorMessage(username: string, pin: string): Promise<string> {
    try {
      await login(username, pin);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return error.message;
      }
      throw error;
    }
    throw new Error('expected login() to throw UnauthorizedError');
  }

  beforeAll(async () => {
    const shop = await prisma.shop.create({ data: { name: `Auth Test Shop ${ts}` } });
    shopId = shop.id;

    const activeUser = await prisma.user.create({
      data: {
        shopId,
        name: `Auth Test Active User ${ts}`,
        role: UserRole.OWNER,
        username: activeUsername,
        passwordHash: await hashPin(PIN),
        isActive: true,
      },
    });
    activeUserId = activeUser.id;
    userIds.push(activeUserId);

    const noPasswordUser = await prisma.user.create({
      data: {
        shopId,
        name: `Auth Test No-Password User ${ts}`,
        role: UserRole.STAFF,
        username: noPasswordUsername,
        passwordHash: null,
        isActive: true,
      },
    });
    userIds.push(noPasswordUser.id);

    const inactiveUser = await prisma.user.create({
      data: {
        shopId,
        name: `Auth Test Inactive User ${ts}`,
        role: UserRole.STAFF,
        username: inactiveUsername,
        passwordHash: await hashPin(PIN),
        isActive: false,
      },
    });
    userIds.push(inactiveUser.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.shop.delete({ where: { id: shopId } });
  });

  it('returns a token and the AuthUser shape (no passwordHash) on success', async () => {
    const result = await login(activeUsername, PIN);

    expect(typeof result.token).toBe('string');
    expect(result.user).toEqual({
      id: activeUserId,
      shopId,
      name: `Auth Test Active User ${ts}`,
      role: UserRole.OWNER,
    });
    expect(result.user).not.toHaveProperty('passwordHash');

    const claims = verifyToken(result.token);
    expect(claims).toMatchObject({ sub: activeUserId, shopId, role: UserRole.OWNER });
  });

  it('throws UnauthorizedError for an unknown username', async () => {
    await expect(login(unknownUsername, PIN)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when the user has no passwordHash set', async () => {
    await expect(login(noPasswordUsername, PIN)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for an inactive user', async () => {
    await expect(login(inactiveUsername, PIN)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for a wrong pin', async () => {
    await expect(login(activeUsername, '0000')).rejects.toThrow(UnauthorizedError);
  });

  it('throws the SAME uniform message across all four failure modes (no user enumeration)', async () => {
    const messages = await Promise.all([
      loginErrorMessage(unknownUsername, PIN),
      loginErrorMessage(noPasswordUsername, PIN),
      loginErrorMessage(inactiveUsername, PIN),
      loginErrorMessage(activeUsername, '0000'),
    ]);

    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toBe(INVALID_CREDENTIALS_MESSAGE);
  });
});
