import type { NextFunction, Request, Response } from 'express';

import { sessionCookieName } from '../lib/authCookies';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../services/auth';
import { UnauthorizedError } from '../services/errors';

function readSessionToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const bearer = header.slice('Bearer '.length).trim();
    if (bearer) {
      return bearer;
    }
  }
  const cookie = req.cookies?.[sessionCookieName];
  return typeof cookie === 'string' && cookie !== '' ? cookie : undefined;
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = readSessionToken(req);
  if (!token) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  let claims;
  try {
    claims = verifyToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, shopId: true, role: true, name: true, isActive: true, tokenVersion: true },
  });
  if (!user || !user.isActive || user.tokenVersion !== claims.tokenVersion) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  req.user = { id: user.id, shopId: user.shopId, role: user.role, name: user.name };
  next();
});
