import type { AuthUser } from '@shop/shared';
import type { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';
import { UnauthorizedError } from './errors';

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
