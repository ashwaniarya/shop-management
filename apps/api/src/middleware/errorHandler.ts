import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import {
  ConflictError,
  DomainValidationError,
  ForbiddenError,
  InsufficientStockError,
  NotFoundError,
  UnauthorizedError,
} from '../services/errors';

export function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.issues } });
    return;
  }

  // Checked ahead of DomainValidationError, which it extends, so oversells keep
  // their specific INSUFFICIENT_STOCK code instead of the generic one.
  if (error instanceof InsufficientStockError) {
    res.status(400).json({
      error: {
        code: 'INSUFFICIENT_STOCK',
        message: error.message,
        details: { availableQuantity: error.availableQuantity, requestedQuantity: error.requestedQuantity },
      },
    });
    return;
  }

  if (error instanceof DomainValidationError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message, details: error.details } });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
    return;
  }

  if (error instanceof ConflictError) {
    res.status(409).json({ error: { code: 'CONFLICT', message: error.message } });
    return;
  }

  if (error instanceof UnauthorizedError) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: error.message } });
    return;
  }

  if (error instanceof ForbiddenError) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: error.message } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'A record with these values already exists' },
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
      return;
    }
    // Not in the task's explicit error-mapping table; added as a safety net so a
    // dangling foreign key in a request body (e.g. a bad manufacturerId that slipped
    // past a route's own pre-check) surfaces as 400 rather than an opaque 500.
    if (error.code === 'P2003') {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Request references a record that does not exist' },
      });
      return;
    }
  }

  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}
