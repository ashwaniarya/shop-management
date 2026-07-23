import type { AuthUser } from '@shop/shared';
import { Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';
import { ConflictError, UnauthorizedError } from './errors';

const SALT_ROUNDS = 10;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '12h';

// Never matches a real pin — exists so login() always pays the bcrypt.compare
// cost, even when the username lookup misses, so a missing user can't be
// timing-distinguished from a wrong pin.
const THROWAWAY_HASH = bcrypt.hashSync('throwaway-pin-for-timing-safety', SALT_ROUNDS);

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or PIN';

export interface AuthTokenClaims {
  sub: number;
  shopId: number;
  role: UserRole;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function signToken(user: { id: number; shopId: number; role: UserRole }): string {
  return jwt.sign({ sub: user.id, shopId: user.shopId, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenClaims {
  return jwt.verify(token, JWT_SECRET) as unknown as AuthTokenClaims;
}

export async function login(username: string, pin: string): Promise<{ token: string; user: AuthUser }> {
  const user = await prisma.user.findUnique({ where: { username } });
  const pinMatches = await verifyPin(pin, user?.passwordHash ?? THROWAWAY_HASH);

  if (!user || !user.passwordHash || !user.isActive || !pinMatches) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  const authUser: AuthUser = { id: user.id, shopId: user.shopId, name: user.name, role: user.role };
  return { token: signToken(authUser), user: authUser };
}

// Creates a brand-new shop and its first OWNER in one transaction, then returns the
// same { token, user } shape as login() so the caller is signed straight in. Shared
// by self-service registration and the createOwner bootstrap script. Callers own PIN
// policy (register enforces 6 digits; bootstrap allows 4–6); a duplicate username
// surfaces as Prisma P2002 → 409 via the error handler.
export async function createShopWithOwner(input: {
  shopName: string;
  ownerName: string;
  username: string;
  pin: string;
}): Promise<{ token: string; user: AuthUser }> {
  const passwordHash = await hashPin(input.pin);

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
