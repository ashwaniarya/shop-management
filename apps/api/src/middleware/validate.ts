import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

export function validate(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

// @types/express types req.query as ParsedQs (string-shaped), which doesn't fit the
// coerced values validateQuery produces (numbers, booleans, dates), so the parsed
// query is stashed on res.locals instead of reassigned onto req.query.
export function validateQuery(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    res.locals.query = result.data;
    next();
  };
}

export function getQuery<T>(res: Response): T {
  return res.locals.query as T;
}
