import type { AuthUser } from '@shop/shared';
import { bcryptSaltRounds, failedLoginLimit, lockoutMinutes, sessionTtl, upgradeTtlMinutes } from '@shop/shared';
import { Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';
import { ConflictError, MustChangePasswordError, UnauthorizedError } from './errors';

const SALT_ROUNDS = bcryptSaltRounds;
const UPGRADE_TOKEN_AUDIENCE = 'password-upgrade';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');

// Never matches a real password — exists so login() always pays the bcrypt.compare
// cost, even when the username lookup misses, so a missing user can't be
// timing-distinguished from a wrong password.
const THROWAWAY_HASH = bcrypt.hashSync('throwaway-password-for-timing-safety', SALT_ROUNDS);

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password';

export interface AuthTokenClaims {
  sub: number;
  shopId: number;
  role: UserRole;
  tokenVersion: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: { id: number; shopId: number; role: UserRole; tokenVersion?: number }): string {
  return jwt.sign(
    { sub: user.id, shopId: user.shopId, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
    JWT_SECRET,
    { expiresIn: sessionTtl } as jwt.SignOptions,
  );
}

export function signUpgradeToken(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: `${upgradeTtlMinutes}m`,
    audience: UPGRADE_TOKEN_AUDIENCE,
  });
}

export function verifyUpgradeToken(token: string): { sub: number } {
  const claims = jwt.verify(token, JWT_SECRET, { audience: UPGRADE_TOKEN_AUDIENCE }) as unknown as { sub?: unknown };
  if (typeof claims.sub !== 'number') {
    throw new UnauthorizedError('Password upgrade is invalid or expired');
  }
  return { sub: claims.sub };
}

export function verifyToken(token: string): AuthTokenClaims {
  const claims = jwt.verify(token, JWT_SECRET) as unknown as AuthTokenClaims;
  // The OAuth handshake cookie is signed with this same secret. Without this shape check
  // it would verify here too, reaching the user lookup with an undefined id — so reject
  // anything that isn't a session token outright.
  if (typeof claims.sub !== 'number' || typeof claims.shopId !== 'number' || typeof claims.tokenVersion !== 'number') {
    throw new UnauthorizedError('Token is not a session token');
  }
  return claims;
}

async function recordFailedLogin(userId: number): Promise<void> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
  });
  if (updated.failedLoginCount >= failedLoginLimit) {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + lockoutMinutes * 60 * 1000) },
    });
  }
}

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const user = await prisma.user.findUnique({ where: { username } });
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? THROWAWAY_HASH);
  const locked = user?.lockedUntil != null && user.lockedUntil.getTime() > Date.now();

  if (locked || !user || !user.passwordHash || !user.isActive || !passwordMatches) {
    if (user?.passwordHash && user.isActive && !locked) {
      await recordFailedLogin(user.id);
    }
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  if (user.mustChangePassword) {
    throw new MustChangePasswordError(signUpgradeToken(user.id));
  }

  const authUser: AuthUser = { id: user.id, shopId: user.shopId, name: user.name, role: user.role };
  return { token: signToken({ ...authUser, tokenVersion: user.tokenVersion }), user: authUser };
}

// Replaces a PIN hash with a password and opens a session. The upgrade token is the proof.
export async function upgradePassword(userId: number, password: string): Promise<{ token: string; user: AuthUser }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || !user.mustChangePassword) {
    throw new UnauthorizedError('Password upgrade is invalid or expired');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  const authUser: AuthUser = { id: updated.id, shopId: updated.shopId, name: updated.name, role: updated.role };
  return { token: signToken({ ...authUser, tokenVersion: updated.tokenVersion }), user: authUser };
}

// Creates a brand-new shop and its first OWNER in one transaction, then returns the
// same { token, user } shape as login() so the caller is signed straight in. Shared
// by self-service registration and the createOwner bootstrap script. Callers own
// password policy. A duplicate username surfaces as Prisma P2002 → 409 via the error handler.
export async function createShopWithOwner(input: {
  shopName: string;
  ownerName: string;
  username: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const passwordHash = await hashPassword(input.password);

  try {
    const owner = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({ data: { name: input.shopName } });
      return tx.user.create({
        data: {
          shopId: shop.id,
          name: input.ownerName,
          username: input.username,
          passwordHash,
          role: UserRole.OWNER,
        },
      });
    });

    const authUser: AuthUser = { id: owner.id, shopId: owner.shopId, name: owner.name, role: owner.role };
    return { token: signToken(authUser), user: authUser };
  } catch (error) {
    // Usernames are globally unique; translate the raw unique-violation into a clear message.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('That username is already taken');
    }
    throw error;
  }
}
