import type { NextFunction, Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../services/auth';
import { UnauthorizedError } from '../services/errors';

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
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
    select: { id: true, shopId: true, role: true, name: true, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  req.user = { id: user.id, shopId: user.shopId, role: user.role, name: user.name };
  next();
});
