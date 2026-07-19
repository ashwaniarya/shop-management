import type { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '../services/errors';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

// Compares the route's `:shopId` path param against the authenticated user's shop;
// routes guarded by this must name the param `shopId`.
export function requireSameShop() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (Number(req.params.shopId) !== req.user?.shopId) {
      next(new ForbiddenError('You do not have permission to access this shop'));
      return;
    }
    next();
  };
}
